import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Router } from './router';
import { Request, Response, NextFunction, RequestHandler } from './types';
import { z } from 'zod';

// Re-export types para conveniência
export type { RequestHandler } from './types';

// Tipos para as rotas auto-geradas
interface AutoRouteConfig {
  entity: string;
  action: 'create' | 'read' | 'list' | 'update' | 'updateMany' | 'delete';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  identifier?: string;
  isMany?: boolean;
  forceDelete?: boolean;
}

interface ModuleHandler {
  default: RequestHandler;
  schema?: z.ZodSchema;
  [key: string]: any;
}

/**
 * Sistema de Auto-Geração de Rotas
 * Baseado em convenções de nomenclatura dos arquivos
 */
export class AutoRoutesGenerator {
  private static readonly ACTION_PATTERNS = {
    create: /^create[A-Z]/,
    fetch: /^fetch[A-Z]/,
    get: /^get[A-Z]/,
    list: /^list[A-Z]/,
    update: /^update[A-Z]/,
    remove: /^remove[A-Z]/,
    delete: /^delete[A-Z]/,
  } as const;

  /**
   * Carrega automaticamente todas as rotas dos módulos
   */
  static async loadAutoRoutes(router: Router, modulesPath: string = 'src/modules'): Promise<void> {
    try {
      const modulesPathFull = join(process.cwd(), modulesPath);
      const moduleFolders = readdirSync(modulesPathFull)
        .filter((item: string) => statSync(join(modulesPathFull, item)).isDirectory());

      for (const entity of moduleFolders) {
        await this.loadEntityRoutes(router, modulesPathFull, entity);
      }

      console.log(`[AutoRoutes] Loaded routes for ${moduleFolders.length} entities`);
    } catch (error) {
      console.warn('[AutoRoutes] Failed to load auto routes:', error);
    }
  }

  /**
   * Carrega rotas para uma entidade específica
   */
  private static async loadEntityRoutes(router: Router, modulesPath: string, entity: string): Promise<void> {
    const entityPath = join(modulesPath, entity);
    const files = readdirSync(entityPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of files) {
      const filePath = join(entityPath, file);
      const fileName = file.replace(/\.(ts|js)$/, '');

      try {
        const routeConfigs = this.parseFileName(fileName, entity);
        if (routeConfigs.length > 0) {
          const module = await import(filePath) as ModuleHandler;

          for (const config of routeConfigs) {
            this.registerRoute(router, config, module);
          }
        }
      } catch (error) {
        console.warn(`[AutoRoutes] Failed to load ${file}:`, error);
      }
    }
  }

  /**
   * Parse do nome do arquivo seguindo as convenções
   */
  private static parseFileName(fileName: string, entity: string): AutoRouteConfig[] {
    const configs: AutoRouteConfig[] = [];

    // Determina a ação baseada no prefixo
    let action: AutoRouteConfig['action'];
    let remainingName = fileName;

    if (this.ACTION_PATTERNS.create.test(fileName)) {
      action = 'create';
      remainingName = fileName.replace(/^create/, '');
    } else if (this.ACTION_PATTERNS.fetch.test(fileName) || this.ACTION_PATTERNS.get.test(fileName)) {
      action = 'read';
      remainingName = fileName.replace(/^(fetch|get)/, '');
    } else if (this.ACTION_PATTERNS.list.test(fileName)) {
      action = 'list';
      remainingName = fileName.replace(/^list/, '');
    } else if (this.ACTION_PATTERNS.update.test(fileName)) {
      const isMany = fileName.includes('Many');
      action = isMany ? 'updateMany' : 'update';
      remainingName = fileName.replace(/^update/, '').replace(/Many/, '');
    } else if (this.ACTION_PATTERNS.remove.test(fileName) || this.ACTION_PATTERNS.delete.test(fileName)) {
      action = 'delete';
      remainingName = fileName.replace(/^(remove|delete)/, '');
    } else {
      // Se não é uma ação conhecida, assume que é list
      action = 'list';
    }

    // Verifica se o nome restante corresponde à entidade
    if (remainingName.toLowerCase() !== entity.toLowerCase()) {
      console.warn(`[AutoRoutes] File ${fileName} doesn't match entity ${entity}, skipping`);
      return configs;
    }

    // Cria as configurações de rota baseadas na ação
    configs.push(...this.createRouteConfigs(action, entity, fileName));

    return configs;
  }

  /**
   * Cria configurações de rota baseadas na ação
   */
  private static createRouteConfigs(action: AutoRouteConfig['action'], entity: string, fileName: string): AutoRouteConfig[] {
    const configs: AutoRouteConfig[] = [];
    const basePath = `/${entity.toLowerCase()}`;

    switch (action) {
      case 'create':
        configs.push({
          entity,
          action,
          method: 'POST',
          path: basePath,
        });
        break;

      case 'read':
        // Verifica se tem "By" para identificador customizado
        const byMatch = fileName.match(/By([A-Z]\w*)$/);
        if (byMatch) {
          const identifier = byMatch[1].toLowerCase();
          configs.push({
            entity,
            action,
            method: 'GET',
            path: `${basePath}/${identifier}/:${identifier}`,
            identifier,
          });
        } else {
          // GET padrão com ID
          configs.push({
            entity,
            action,
            method: 'GET',
            path: `${basePath}/:id`,
          });
        }
        break;

      case 'list':
        configs.push({
          entity,
          action,
          method: 'GET',
          path: basePath, // GET /entities?param=value
        });
        break;

      case 'update':
        const updateByMatch = fileName.match(/By([A-Z]\w*)$/);
        const isMany = fileName.includes('Many');

        if (updateByMatch) {
          const identifier = updateByMatch[1].toLowerCase();
          configs.push({
            entity,
            action: isMany ? 'updateMany' : 'update',
            method: 'PUT',
            path: `${basePath}/${identifier}/:${identifier}`,
            identifier,
            isMany,
          });
        } else {
          configs.push({
            entity,
            action: isMany ? 'updateMany' : 'update',
            method: 'PUT',
            path: `${basePath}/:id`,
            isMany,
          });
        }
        break;

      case 'updateMany':
        // Já tratado no case 'update'
        break;

      case 'delete':
        // Soft delete
        configs.push({
          entity,
          action,
          method: 'DELETE',
          path: `${basePath}/:id`,
        });

        // Hard delete (force)
        configs.push({
          entity,
          action,
          method: 'DELETE',
          path: `${basePath}/:id/force`,
          forceDelete: true,
        });
        break;
    }

    return configs;
  }

  /**
   * Registra uma rota no router com validação automática
   */
  private static registerRoute(router: Router, config: AutoRouteConfig, module: ModuleHandler): void {
    const handler: RequestHandler = async (req, res, next) => {
      try {
        // Validação automática do schema Zod se existir
        if (module.schema) {
          const validationResult = module.schema.safeParse(req.body);

          if (!validationResult.success) {
            return res.status(400).json({
              error: 'Validation failed',
              details: validationResult.error.format(),
            });
          }

          // Substitui req.body pelo validado
          req.body = validationResult.data;
        }

        // Chama o handler do módulo
        await module.default(req, res, next);

      } catch (error) {
        next(error);
      }
    };

    // Registra a rota baseada no método
    const routePath = `/${config.entity.toLowerCase()}${config.path.replace(`/${config.entity.toLowerCase()}`, '')}`;

    switch (config.method) {
      case 'GET':
        router.get(routePath, handler);
        break;
      case 'POST':
        router.post(routePath, handler);
        break;
      case 'PUT':
        router.put(routePath, handler);
        break;
      case 'DELETE':
        router.delete(routePath, handler);
        break;
    }

    console.log(`[AutoRoutes] Registered ${config.method} ${routePath} (${config.action})`);
  }
}

/**
 * Função de conveniência para carregar rotas automaticamente
 */
export async function autoGenerateRoutes(router: Router, modulesPath?: string): Promise<void> {
  await AutoRoutesGenerator.loadAutoRoutes(router, modulesPath);
}
