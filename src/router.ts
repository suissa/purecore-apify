import {
  Layer,
  Request,
  Response,
  NextFunction,
  RequestHandler,
  IRouter,
} from "./types";
import { jsonBodyParser } from "./middlewares";

export class Router implements IRouter {
  // O stack substitui o antigo "private routes: Route[]"
  public stack: Layer[] = [];

  // --- Métodos de Registro (Igual ao seu antigo register) ---

  use(path: string, handler: RequestHandler | IRouter): void;
  use(handler: RequestHandler | IRouter): void;
  use(
    arg1: string | RequestHandler | IRouter,
    arg2?: RequestHandler | IRouter
  ): void {
    let path = "/";
    let handler = arg1;

    if (typeof arg1 === "string") {
      path = arg1;
      handler = arg2!;
    }

    this.addLayer("ALL", path, handler as RequestHandler | IRouter);
  }

  get(path: string, handler: RequestHandler) {
    this.addLayer("GET", path, handler);
  }
  post(path: string, handler: RequestHandler) {
    this.addLayer("POST", path, handler);
  }
  put(path: string, handler: RequestHandler) {
    this.addLayer("PUT", path, handler);
  }
  delete(path: string, handler: RequestHandler) {
    this.addLayer("DELETE", path, handler);
  }
  patch(path: string, handler: RequestHandler) {
    this.addLayer("PATCH", path, handler);
  }

  /**
   * Lógica principal de execução (O antigo handleRequest da Apify)
   * Agora ele processa apenas a lógica, sem saber de 'createServer'
   */
  async handle(req: Request, res: Response, done: NextFunction): Promise<void> {
    const currentPath = req.url || "/";
    let idx = 0;

    const next = async (err?: any) => {
      if (err) return done(err);
      if (idx >= this.stack.length) return done();

      const layer = this.stack[idx++];
      if (!layer) return done();

      // 1. Verifica Match da URL (Regex)
      const match = currentPath.match(layer.regex);
      if (!match) return next();

      // 2. Verifica Método (se não for middleware 'ALL')
      if (layer.method !== "ALL" && layer.method !== req.method) return next();

      // 3. Extrai Params
      if (layer.keys.length > 0) {
        layer.keys.forEach((key, i) => {
          (req.params as any)[key] = match[i + 1];
        });
      }

      // 4. Executa
      try {
        if (layer.isRouter) {
          // Lógica especial para Sub-Routers (app.use('/api', apiRouter))
          // Precisamos "cortar" o prefixo da URL para o sub-router entender
          const removedPrefix = match[0] === "/" ? "" : match[0];
          const oldUrl = req.url; // Salva estado
          const oldBaseUrl = req.baseUrl || "";

          req.baseUrl = oldBaseUrl + removedPrefix;
          req.url = currentPath.replace(layer.regex, "") || "/";
          if (!req.url.startsWith("/")) req.url = "/" + req.url;

          const subRouter = layer.handler as unknown as Router;
          await subRouter.handle(req, res, (subErr) => {
            // Restaura estado ao voltar
            req.url = oldUrl;
            req.baseUrl = oldBaseUrl;
            next(subErr);
          });
        } else {
          // Handler normal - aplica bodyParser automaticamente se não for GET
          const isNonGetMethod =
            req.method && req.method !== "GET" && layer.method !== "ALL";

          if (isNonGetMethod) {
            // Aplica bodyParser automaticamente antes do handler
            await new Promise<void>((resolve, reject) => {
              const originalNext = next;
              jsonBodyParser(req, res, (err?: any) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }

          // Executa o handler da rota
          await (layer.handler as RequestHandler)(req, res, next);
        }
      } catch (error) {
        next(error);
      }
    };

    next();
  }

  /**
   * O antigo método "register", agora mais inteligente para suportar middlewares
   */
  private addLayer(
    method: string,
    path: string,
    handler: RequestHandler | IRouter
  ) {
    const keys: string[] = [];

    // Converte :param em regex group
    let regexPath = path.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
      keys.push(key);
      return "([^/]+)";
    });

    // É um Router ou Middleware? (stack existe? é 'ALL'?)
    const isRouter =
      handler instanceof Router || (handler as any).stack !== undefined;
    const isMiddleware = method === "ALL" || isRouter;

    // Se for middleware, não usa $ no final (para dar match em prefixo)
    // Ex: /api deve dar match em /api/users
    const endAnchor = isMiddleware ? "" : "$";

    // Normaliza barras
    regexPath = regexPath.replace(/\/+/g, "/");
    if (regexPath !== "/" && regexPath.endsWith("/")) {
      regexPath = regexPath.slice(0, -1);
    }

    const regex =
      path === "/" && isMiddleware
        ? new RegExp("^.*")
        : new RegExp(`^${regexPath}(?:/)?${endAnchor}`);

    this.stack.push({
      method,
      path,
      regex,
      keys,
      handler,
      isRouter,
    });
  }
}
