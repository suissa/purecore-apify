/**
 * Fastify-like Factory para PureCore Apify
 * Implementa interface compatível com Fastify mas usa decorators e validators internos
 *
 * Funcionalidades:
 * - API compatível com Fastify (get, post, put, delete, patch)
 * - Suporte a plugins e middlewares do Fastify
 * - Integração com decorators do PureCore Apify
 * - Validação automática com schemas Zod
 * - Sistema de hooks do Fastify
 */

import { createServer, Server, IncomingMessage, ServerResponse } from 'node:http';
import { Apify, Request, Response, NextFunction, RequestHandler } from './index.js';
import { Router } from './router.js';
import { errorHandler, jsonBodyParser } from './middlewares.js';
import { NotFoundError } from './errors.js';

// =========================================
// TIPOS E INTERFACES
// =========================================

export interface FastifyInstance {
  // Métodos HTTP
  get(path: string, handler: RequestHandler): FastifyInstance;
  post(path: string, handler: RequestHandler): FastifyInstance;
  put(path: string, handler: RequestHandler): FastifyInstance;
  delete(path: string, handler: RequestHandler): FastifyInstance;
  patch(path: string, handler: RequestHandler): FastifyInstance;

  // Middlewares e Plugins
  use(path?: string, handler?: RequestHandler): FastifyInstance;
  register(plugin: FastifyPlugin, options?: any): FastifyInstance;

  // Hooks
  addHook(hook: string, handler: Function): FastifyInstance;

  // Decorators
  decorate(name: string, value: any): FastifyInstance;
  hasDecorator(name: string): boolean;

  // Utilitários
  listen(port: number, callback?: Function): Promise<void>;
  close(): Promise<void>;

  // Propriedades
  server: Server;
  decorators: Record<string, any>;
}

export interface FastifyPlugin {
  (fastify: FastifyInstance, options: any, done: Function): void;
}

export interface FastifyPluginOptions {
  prefix?: string;
}

// =========================================
// IMPLEMENTAÇÃO FASTIFY-LIKE
// =========================================

export class PureCoreFastify implements FastifyInstance {
  private app: Apify;
  private hooks: Map<string, Function[]> = new Map();
  public decorators: Record<string, any> = {};
  public server: Server;

  constructor(options: any = {}) {
    this.app = new Apify(options.resilientConfig);

    // Inicializa servidor HTTP
    this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      try {
        // Converte para tipos do Apify
        const apifyReq = req as Request;
        const apifyRes = res as Response;

        // Inicializa propriedades se não existirem
        if (!apifyReq.params) apifyReq.params = {};
        if (!apifyReq.query) apifyReq.query = {};
        if (!apifyReq.body) apifyReq.body = {};

        // Executa hooks 'onRequest'
        await this.executeHooks('onRequest', apifyReq, apifyRes);

        // Processa através do Apify
        await this.app.handle(apifyReq, apifyRes, async (err?: any) => {
          if (err) {
            // Executa hooks 'onError'
            await this.executeHooks('onError', apifyReq, apifyRes, err);

            if (!res.headersSent) {
              const errorResponse = errorHandler(err, apifyReq, apifyRes, () => {});
              if (errorResponse) {
                res.statusCode = errorResponse.status || 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(errorResponse));
              }
            }
            return;
          }

          // Executa hooks 'onResponse'
          await this.executeHooks('onResponse', apifyReq, apifyRes);

          // Se não houve resposta, retorna 404
          if (!res.headersSent) {
            const notFoundResponse = errorHandler(new NotFoundError('Route not found'), apifyReq, apifyRes, () => {});
            if (notFoundResponse) {
              res.statusCode = notFoundResponse.status || 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(notFoundResponse));
            }
          }
        });
      } catch (error) {
        console.error('❌ Erro no servidor:', error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      }
    });

    // Adiciona middleware básico
    this.app.use(jsonBodyParser);

    console.log('🚀 PureCore Fastify inicializado');
  }

  // =========================================
  // MÉTODOS HTTP (COMPATÍVEL COM FASTIFY)
  // =========================================

  get(path: string, handler: RequestHandler): FastifyInstance {
    this.app.get(path, this.wrapHandler(handler));
    return this;
  }

  post(path: string, handler: RequestHandler): FastifyInstance {
    this.app.post(path, this.wrapHandler(handler));
    return this;
  }

  put(path: string, handler: RequestHandler): FastifyInstance {
    this.app.put(path, this.wrapHandler(handler));
    return this;
  }

  delete(path: string, handler: RequestHandler): FastifyInstance {
    this.app.delete(path, this.wrapHandler(handler));
    return this;
  }

  patch(path: string, handler: RequestHandler): FastifyInstance {
    this.app.patch(path, this.wrapHandler(handler));
    return this;
  }

  // =========================================
  // MIDDLEWARES E PLUGINS
  // =========================================

  use(path?: string, handler?: RequestHandler): FastifyInstance {
    if (typeof path === 'function') {
      // use(handler) - middleware global
      this.app.use(path);
    } else if (path && handler) {
      // use(path, handler) - middleware com path
      this.app.use(path, handler);
    }
    return this;
  }

  register(plugin: FastifyPlugin, options: FastifyPluginOptions = {}): FastifyInstance {
    try {
      // Executa o plugin do Fastify
      plugin(this, options, (err?: any) => {
        if (err) {
          console.error('❌ Erro no plugin:', err);
        }
      });
      console.log('✅ Plugin registrado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao registrar plugin:', error);
    }
    return this;
  }

  // =========================================
  // HOOKS
  // =========================================

  addHook(hook: string, handler: Function): FastifyInstance {
    if (!this.hooks.has(hook)) {
      this.hooks.set(hook, []);
    }
    this.hooks.get(hook)!.push(handler);
    console.log(`🔗 Hook '${hook}' registrado`);
    return this;
  }

  private async executeHooks(hook: string, ...args: any[]): Promise<void> {
    const hookHandlers = this.hooks.get(hook) || [];
    for (const handler of hookHandlers) {
      try {
        await handler(...args);
      } catch (error) {
        console.error(`❌ Erro no hook '${hook}':`, error);
      }
    }
  }

  // =========================================
  // DECORATORS
  // =========================================

  decorate(name: string, value: any): FastifyInstance {
    this.decorators[name] = value;
    console.log(`🎨 Decorator '${name}' registrado`);
    return this;
  }

  hasDecorator(name: string): boolean {
    return name in this.decorators;
  }

  // =========================================
  // UTILITÁRIOS
  // =========================================

  async listen(port: number, callback?: Function): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(port, () => {
          console.log(`🔥 PureCore Fastify rodando na porta ${port}`);

          // Executa hooks 'onReady'
          this.executeHooks('onReady').then(() => {
            if (callback) callback();
            resolve();
          });
        });

        this.server.on('error', (err) => {
          console.error('❌ Erro no servidor:', err);
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          console.error('❌ Erro ao fechar servidor:', err);
          reject(err);
        } else {
          console.log('🛑 Servidor fechado');
          resolve();
        }
      });
    });
  }

  // =========================================
  // MÉTODOS PRIVADOS
  // =========================================

  private wrapHandler(originalHandler: RequestHandler): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Adiciona decorators do Fastify ao request
        (req as any).server = this;

        // Executa handler original
        await originalHandler(req, res, next);
      } catch (error) {
        console.error('❌ Erro no handler:', error);
        next(error as Error);
      }
    };
  }
}

// =========================================
// FACTORY PRINCIPAL
// =========================================

export interface PureCoreFastifyOptions {
  resilientConfig?: any;
  logger?: boolean;
  ignoreTrailingSlash?: boolean;
  bodyLimit?: number;
}

/**
 * Factory para criar instâncias Fastify-like do PureCore Apify
 */
export function createPureCoreFastify(options: PureCoreFastifyOptions = {}): FastifyInstance {
  console.log('🏭 Criando instância PureCore Fastify...');

  const instance = new PureCoreFastify(options);

  // Adiciona configurações padrão
  if (options.logger !== false) {
    instance.addHook('onRequest', (req: Request, res: Response) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    });
  }

  return instance;
}

/**
 * Export padrão - função factory
 */
export default createPureCoreFastify;

// =========================================
// PLUGINS DE EXEMPLO
// =========================================

/**
 * Plugin para CORS (exemplo)
 */
export const corsPlugin: FastifyPlugin = (fastify, options, done) => {
  console.log('🌐 Plugin CORS carregado');

  fastify.addHook('onRequest', (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', options.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  });

  done();
};

/**
 * Plugin para autenticação JWT (exemplo)
 */
export const jwtPlugin: FastifyPlugin = (fastify, options, done) => {
  console.log('🔐 Plugin JWT carregado');

  // Adiciona decorator para verificar JWT
  fastify.decorate('authenticate', (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Token não informado' });
      return;
    }

    // Simulação de validação JWT
    const [, token] = authHeader.split(' ');
    if (token !== 'valid-token') {
      res.status(403).json({ error: 'Token inválido' });
      return;
    }

    (req as any).user = { id: 1, name: 'User' };
    next();
  });

  done();
};

// =========================================
// UTILITÁRIOS DE INTEGRAÇÃO
// =========================================

/**
 * Helper para criar handlers com validação Zod
 */
export function createValidatedHandler(schema: any, handler: Function) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Valida body se houver schema
      if (schema && req.body) {
        const validation = schema.safeParse(req.body);
        if (!validation.success) {
          res.status(400).json({
            error: 'Dados inválidos',
            details: validation.error.issues
          });
          return;
        }
        req.body = validation.data;
      }

      // Executa handler
      await handler(req, res, next);
    } catch (error) {
      next(error as Error);
    }
  };
}

/**
 * Helper para integrar decorators do PureCore Apify
 */
export function withDecorators(decorators: any[], handler: RequestHandler): RequestHandler {
  // Aqui seria integrada a lógica dos decorators
  // Por enquanto, apenas retorna o handler original
  console.log(`🎨 Aplicando ${decorators.length} decorators`);
  return handler;
}

console.log('✅ PureCore Fastify Factory carregado com sucesso!');
