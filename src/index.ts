import {
  createServer,
  Server,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { Router } from "./router";
import { Request, Response, NextFunction, RequestHandler } from "./types";
import { errorHandler, autoAONMiddleware } from "./middlewares";
import { NotFoundError } from "./errors";
import { initI18n } from "./i18n";
import { getResilientFallback, ResilientConfig } from "./healer";
import { autoGenerateFromZodSchemas } from "./auto-generator";
import { AONConfig } from "./aon/index.js";
// Import will be conditional to avoid build issues if file doesn't exist

export class Apify extends Router {
  private apiPrefix: string = "/api/v1";
  private modulesLoaded: boolean = false;
  private i18nInitialized: boolean = false;
  private resilientConfig: ResilientConfig = {};
  private registeredRoutes: string[] = [];
  private aonConfig: AONConfig = {};
  private aonEnabled: boolean = true;

  constructor(resilientConfig?: ResilientConfig, aonConfig?: AONConfig) {
    super();
    this.resilientConfig = resilientConfig || {};
    this.aonConfig = aonConfig || {};
    this.initializeI18n();
  }

  /**
   * Inicializa o sistema de internacionalização
   */
  private async initializeI18n(): Promise<void> {
    if (this.i18nInitialized) return;

    try {
      await initI18n();
      this.i18nInitialized = true;
      console.log("✅ Sistema de internacionalização inicializado (pt-BR)");
    } catch (error) {
      console.warn("⚠️  Erro ao inicializar i18n:", (error as Error).message);
    }
  }

  /**
   * Define um novo prefixo para a API
   */
  setApiPrefix(prefix: string): void {
    this.apiPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
  }

  /**
   * Configura o sistema resiliente de fallback
   */
  setResilientConfig(config: ResilientConfig): void {
    this.resilientConfig = { ...this.resilientConfig, ...config };
  }

  /**
   * Configura o sistema AON (Adaptive Observability Negotiation)
   */
  setAONConfig(config: AONConfig): void {
    this.aonConfig = { ...this.aonConfig, ...config };
  }

  /**
   * Habilita/desabilita o sistema AON
   */
  setAONEnabled(enabled: boolean): void {
    this.aonEnabled = enabled;
  }

  /**
   * Obtém estatísticas do sistema resiliente
   */
  getResilientStats() {
    return getResilientFallback(this.resilientConfig).getStats();
  }

  /**
   * Registra uma rota no sistema de auto-correção
   */
  private registerRoute(method: string, path: string): void {
    const fullPath = this.apiPrefix + path;
    if (!this.registeredRoutes.includes(fullPath)) {
      this.registeredRoutes.push(fullPath);
    }
  }

  /**
   * Carrega automaticamente todas as rotas dos módulos em src/modules
   */
  async loadModules(): Promise<void> {
    if (this.modulesLoaded) return;

    const modulesRouter = new Router();
    const modulesPath = join(process.cwd(), "src", "modules");

    try {
      // Executa auto-geração baseada em schemas Zod antes de carregar módulos
      console.log("🔧 Verificando necessidade de auto-geração de código...");
      await autoGenerateFromZodSchemas({
        modulesPath: "src/modules",
        verbose: true,
        force: false,
        dryRun: false,
      });

      const moduleFolders = readdirSync(modulesPath).filter((item: string) =>
        statSync(join(modulesPath, item)).isDirectory()
      );

      for (const moduleName of moduleFolders) {
        try {
          // Tenta importar routes.ts primeiro, depois routes/index.ts
          let routesPath: string;
          try {
            routesPath = join(modulesPath, moduleName, "routes.ts");
            statSync(routesPath); // Verifica se existe
          } catch {
            routesPath = join(modulesPath, moduleName, "routes", "index.ts");
            statSync(routesPath); // Verifica se existe
          }

          // Import dinâmico do módulo
          const moduleUrl = `file://${resolve(routesPath)}`;
          const module = await import(moduleUrl);

          // Procura por um router exportado (pode ser default ou named export)
          let router: Router;
          if (module.default && module.default instanceof Router) {
            router = module.default;
          } else if (module.router && module.router instanceof Router) {
            router = module.router;
          } else if (
            module[`${moduleName}Router`] &&
            module[`${moduleName}Router`] instanceof Router
          ) {
            router = module[`${moduleName}Router`];
          } else {
            // Se não encontrou um router específico, assume que o primeiro export é um Router
            const firstExport = Object.values(module).find(
              (exp) => exp instanceof Router
            );
            if (firstExport) {
              router = firstExport as Router;
            } else {
              console.warn(`Módulo ${moduleName} não exporta um Router válido`);
              continue;
            }
          }

          // Registra o router do módulo
          modulesRouter.use(`/${moduleName}`, router);
          console.log(
            `✅ Módulo ${moduleName} carregado em ${this.apiPrefix}/${moduleName}`
          );
        } catch (error) {
          console.warn(
            `❌ Erro ao carregar módulo ${moduleName}:`,
            (error as Error).message
          );
        }
      }

      // Registra o router de módulos com o prefixo da API
      this.use(this.apiPrefix, modulesRouter);
      this.modulesLoaded = true;
    } catch (error) {
      console.warn(
        "⚠️  Pasta src/modules não encontrada ou erro ao ler módulos:",
        (error as Error).message
      );
    }
  }

  /**
   * Override dos métodos HTTP para registrar rotas
   */
  get(path: string, handler: RequestHandler): Router {
    this.registerRoute("GET", path);
    super.get(path, handler);
    return this;
  }

  post(path: string, handler: RequestHandler): Router {
    this.registerRoute("POST", path);
    super.post(path, handler);
    return this;
  }

  put(path: string, handler: RequestHandler): Router {
    this.registerRoute("PUT", path);
    super.put(path, handler);
    return this;
  }

  delete(path: string, handler: RequestHandler): Router {
    this.registerRoute("DELETE", path);
    super.delete(path, handler);
    return this;
  }

  patch(path: string, handler: RequestHandler): Router {
    this.registerRoute("PATCH", path);
    super.patch(path, handler);
    return this;
  }

  /**
   * Inicia o servidor HTTP
   */
  async listen(port: number, callback?: () => void): Promise<Server> {
    // Carrega os módulos automaticamente
    await this.loadModules();

    // Inicializa sistema resiliente
    const resilientFallback = getResilientFallback(this.resilientConfig);
    resilientFallback.setAvailableRoutes(this.registeredRoutes);

    console.log(
      `🛡️ Sistema resiliente ativado: ${this.registeredRoutes.length} rotas registradas`
    );

    const server = createServer(
      async (req: IncomingMessage, res: ServerResponse) => {
        // 1. "Upgrade" dos objetos nativos
        const appReq = req as Request;
        const appRes = res as Response;

        // Inicializa propriedades do Request/Response
        this.augmentRequest(appReq);
        this.augmentResponse(appRes);

        // 2. Aplica middleware AON se habilitado
        if (this.aonEnabled) {
          try {
            await new Promise<void>((resolve, reject) => {
              autoAONMiddleware(appReq, appRes, (err?: any) => {
                if (err) reject(err);
                else resolve();
              });
            });
          } catch (aonError) {
            console.warn("⚠️ Erro no middleware AON:", aonError);
            // Continua sem AON em caso de erro
          }
        }

        // 3. Handler Final (Caso nenhuma rota do Router responda)
        const finalHandler: NextFunction = (err) => {
          if (err) {
            // Usa o errorHandler middleware para tratamento robusto
            return errorHandler(err, appReq, appRes, () => {});
          }

          // Se não houve erro mas nenhuma rota respondeu, é 404
          if (!res.writableEnded) {
            const notFoundError = new NotFoundError(
              `Cannot ${req.method} ${appReq.originalUrl}`
            );
            return errorHandler(notFoundError, appReq, appRes, () => {});
          }
        };

        // 4. Passa a bola para a lógica do Router (herdada!)
        await this.handle(appReq, appRes, finalHandler);
      }
    );

    return server.listen(port, callback);
  }

  // --- Helpers Privados ---

  private augmentRequest(req: Request) {
    req.originalUrl = (req as any).url || "/";
    req.baseUrl = "";
    req.params = {};
    req.query = {};
    // req.body será preenchido automaticamente pelo bodyParserMiddleware quando necessário

    // Parse Query String
    const urlObj = new URL(
      (req as any).url || "/",
      `http://${(req as any).headers.host}`
    );
    req.query = Object.fromEntries(urlObj.searchParams);
    (req as any).url = urlObj.pathname; // URL interna trabalha só com o pathname
  }

  private augmentResponse(res: Response) {
    res.status = (code) => {
      (res as any).statusCode = code;
      return res;
    };
    res.json = (data) => {
      (res as any).setHeader("Content-Type", "application/json");
      (res as any).end(JSON.stringify(data));
    };
    res.send = (data) => {
      if (typeof data === "object") return res.json(data);
      (res as any).end(data);
    };
  }
}

/**
 * Função utilitária para carregar rotas de módulos automaticamente
 * Baseado em convenções de nomenclatura dos arquivos
 */
export async function autoRoutesFromModules(): Promise<Router> {
  const modulesRouter = new Router();

  try {
    // Import dinâmico para evitar problemas de build se o arquivo não existir
    const { autoGenerateRoutes } = await import("./auto-routes");
    await autoGenerateRoutes(modulesRouter);
  } catch (error) {
    console.warn("[Apify] Auto-routes not available:", error);
  }

  return modulesRouter;
}

/**
 * Função utilitária para carregar rotas de módulos manualmente
 */
export async function routesFromModules(): Promise<Router> {
  const modulesRouter = new Router();
  const modulesPath = join(process.cwd(), "src", "modules");

  try {
    const moduleFolders = readdirSync(modulesPath).filter((item: string) =>
      statSync(join(modulesPath, item)).isDirectory()
    );

    for (const moduleName of moduleFolders) {
      try {
        // Tenta importar routes.ts primeiro, depois routes/index.ts
        let routesPath: string;
        try {
          routesPath = join(modulesPath, moduleName, "routes.ts");
          statSync(routesPath); // Verifica se existe
        } catch {
          routesPath = join(modulesPath, moduleName, "routes", "index.ts");
          statSync(routesPath); // Verifica se existe
        }

        // Import dinâmico do módulo
        const moduleUrl = `file://${resolve(routesPath)}`;
        const module = await import(moduleUrl);

        // Procura por um router exportado
        let router: Router;
        if (module.default && module.default instanceof Router) {
          router = module.default;
        } else if (module.router && module.router instanceof Router) {
          router = module.router;
        } else if (
          module[`${moduleName}Router`] &&
          module[`${moduleName}Router`] instanceof Router
        ) {
          router = module[`${moduleName}Router`];
        } else {
          const firstExport = Object.values(module).find(
            (exp) => exp instanceof Router
          );
          if (firstExport) {
            router = firstExport as Router;
          } else {
            console.warn(`Módulo ${moduleName} não exporta um Router válido`);
            continue;
          }
        }

        // Registra o router do módulo
        modulesRouter.use(`/${moduleName}`, router);
        console.log(`✅ Módulo ${moduleName} carregado`);
      } catch (error) {
        console.warn(
          `❌ Erro ao carregar módulo ${moduleName}:`,
          (error as Error).message
        );
      }
    }
  } catch (error) {
    console.warn(
      "⚠️  Pasta src/modules não encontrada:",
      (error as Error).message
    );
  }

  return modulesRouter;
}

export { Router } from "./router";
export type { Request, Response, NextFunction, RequestHandler } from "./types";
export type { ResilientConfig, HealerConfig } from "./healer";
export { adapt } from "./utils";
export * from "./middlewares";
export * from "./decorators";
export * from "./errors";
export * from "./i18n";
export * from "./healer";
export * from "./aon";

// Inicializa o sistema de decorators
import { initializeDecorators } from "./decorators/config.js";
initializeDecorators();
