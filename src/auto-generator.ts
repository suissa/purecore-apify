/**
 * Sistema de Auto-Geração de Código - Baseado em Schemas Zod
 * Detecta arquivos .ts em modules/ e gera estrutura completa automaticamente
 */

import { readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ZodSchemaAnalyzer, CodeGenerator, EntityMetadata } from './zod-analyzer';

export interface AutoGenerationOptions {
  modulesPath?: string;
  force?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

export class AutoGenerator {
  private options: Required<AutoGenerationOptions>;

  constructor(options: AutoGenerationOptions = {}) {
    this.options = {
      modulesPath: options.modulesPath || 'src/modules',
      force: options.force || false,
      verbose: options.verbose || true,
      dryRun: options.dryRun || false
    };
  }

  /**
   * Executa a geração automática para todos os módulos detectados
   */
  async generate(): Promise<void> {
    console.log('🚀 Iniciando auto-geração de código baseado em schemas Zod...');

    const modulesPath = resolve(this.options.modulesPath);

    // Verifica se a pasta modules existe
    if (!existsSync(modulesPath)) {
      console.log(`📁 Pasta ${modulesPath} não encontrada. Pulando auto-geração.`);
      return;
    }

    // Lista arquivos/pastas em modules
    const items = readdirSync(modulesPath);

    for (const item of items) {
      const itemPath = join(modulesPath, item);
      const stat = statSync(itemPath);

      if (stat.isDirectory()) {
        // Se é uma pasta, verificar se já tem estrutura completa
        await this.processExistingModule(item, itemPath);
      } else if (item.endsWith('.ts')) {
        // Se é um arquivo .ts solto, gerar estrutura completa
        await this.generateFromStandaloneFile(item, itemPath, modulesPath);
      }
    }

    console.log('✅ Auto-geração concluída!');
  }

  /**
   * Processa módulo que já existe como pasta
   */
  private async processExistingModule(moduleName: string, modulePath: string): Promise<void> {
    if (this.options.verbose) {
      console.log(`📂 Verificando módulo existente: ${moduleName}`);
    }

    // Verifica se já tem estrutura completa
    const hasStructure = this.checkModuleStructure(modulePath);

    if (!hasStructure || this.options.force) {
      // Tenta encontrar arquivo de schema para gerar estrutura
      const schemaFile = await this.findSchemaFile(modulePath);
      if (schemaFile) {
        if (this.options.verbose) {
          console.log(`🔍 Schema encontrado: ${schemaFile}`);
        }
        await this.generateFromSchemaFile(schemaFile, moduleName, modulePath);
      } else if (this.options.verbose) {
        console.log(`⚠️  Nenhum schema encontrado para ${moduleName}`);
      }
    } else if (this.options.verbose) {
      console.log(`✅ Módulo ${moduleName} já possui estrutura completa`);
    }
  }

  /**
   * Gera estrutura completa a partir de arquivo .ts solto
   */
  private async generateFromStandaloneFile(fileName: string, filePath: string, modulesPath: string): Promise<void> {
    const entityName = ZodSchemaAnalyzer.extractEntityName(fileName);
    const moduleName = entityName.toLowerCase();
    const modulePath = join(modulesPath, moduleName);

    if (this.options.verbose) {
      console.log(`📄 Arquivo standalone detectado: ${fileName} -> Gerando módulo ${moduleName}`);
    }

    try {
      // Importa dinamicamente o arquivo para obter o schema
      const moduleUrl = `file://${resolve(filePath)}`;
      const importedModule = await import(moduleUrl);

      if (importedModule.schema) {
        const metadata = ZodSchemaAnalyzer.analyzeSchema(importedModule.schema, entityName);

        if (this.options.verbose) {
          console.log(`📊 Schema analisado: ${metadata.fields.length} campos detectados`);
        }

        await this.generateModuleStructure(metadata, modulePath, filePath);

        // Remove o arquivo original (opcional, pode ser mantido como backup)
        if (!this.options.dryRun) {
          // Mantém o arquivo original como referência
          console.log(`💾 Arquivo original mantido: ${filePath}`);
        }
      } else {
        console.warn(`⚠️  Arquivo ${fileName} não exporta schema Zod válido`);
      }
    } catch (error) {
      console.error(`❌ Erro ao processar ${fileName}:`, error);
    }
  }

  /**
   * Gera estrutura completa a partir de arquivo de schema existente
   */
  private async generateFromSchemaFile(schemaPath: string, moduleName: string, modulePath: string): Promise<void> {
    try {
      const moduleUrl = `file://${resolve(schemaPath)}`;
      const importedModule = await import(moduleUrl);

      if (importedModule.schema) {
        const entityName = ZodSchemaAnalyzer.extractEntityName(moduleName);
        const metadata = ZodSchemaAnalyzer.analyzeSchema(importedModule.schema, entityName);

        await this.generateModuleStructure(metadata, modulePath);
      }
    } catch (error) {
      console.error(`❌ Erro ao processar schema ${schemaPath}:`, error);
    }
  }

  /**
   * Gera toda a estrutura de arquivos para um módulo
   */
  private async generateModuleStructure(
    metadata: EntityMetadata,
    modulePath: string,
    originalFilePath?: string
  ): Promise<void> {
    const { name } = metadata;
    const entityName = ZodSchemaAnalyzer.toCamelCase(name);

    if (this.options.verbose) {
      console.log(`🏗️  Gerando estrutura para ${name}...`);
    }

    if (this.options.dryRun) {
      console.log(`🔍 [DRY RUN] Estrutura seria gerada em: ${modulePath}`);
      return;
    }

    // Cria diretórios necessários
    const dirs = [
      modulePath,
      join(modulePath, 'database'),
      join(modulePath, 'services'),
      join(modulePath, 'controllers'),
      join(modulePath, 'types'),
      join(modulePath, 'tests')
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        if (this.options.verbose) {
          console.log(`📁 Criado diretório: ${dir}`);
        }
      }
    }

    // Gera arquivos
    const files = [
      // Database
      {
        path: join(modulePath, 'database', 'repository.ts'),
        content: CodeGenerator.generateRepository(metadata)
      },
      {
        path: join(modulePath, 'database', 'schema.ts'),
        content: CodeGenerator.generateDatabaseSchema(metadata)
      },

      // Types
      {
        path: join(modulePath, 'types', 'dto.ts'),
        content: CodeGenerator.generateDTO(metadata)
      },
      {
        path: join(modulePath, 'types', 'interface.ts'),
        content: CodeGenerator.generateInterface(metadata)
      },

      // Services
      {
        path: join(modulePath, 'services', `${entityName}.service.ts`),
        content: CodeGenerator.generateService(metadata)
      },

      // Controllers
      {
        path: join(modulePath, 'controllers', `${entityName}.controller.ts`),
        content: CodeGenerator.generateController(metadata)
      },

      // Routes
      {
        path: join(modulePath, 'routes.ts'),
        content: CodeGenerator.generateRoutes(metadata)
      },

      // Config
      {
        path: join(modulePath, 'config.ts'),
        content: CodeGenerator.generateConfig(metadata)
      },

      // Tests
      {
        path: join(modulePath, 'tests', `${entityName}.test.ts`),
        content: CodeGenerator.generateTests(metadata)
      },

      // Index
      {
        path: join(modulePath, 'index.ts'),
        content: CodeGenerator.generateIndex(metadata)
      }
    ];

    // Escreve arquivos
    for (const file of files) {
      writeFileSync(file.path, file.content, 'utf-8');
      if (this.options.verbose) {
        console.log(`📝 Gerado: ${file.path}`);
      }
    }

    if (this.options.verbose) {
      console.log(`🎉 Módulo ${name} gerado com sucesso!`);
    }
  }

  /**
   * Verifica se um módulo já possui estrutura completa
   */
  private checkModuleStructure(modulePath: string): boolean {
    const requiredFiles = [
      'routes.ts',
      'config.ts',
      'index.ts',
      join('database', 'repository.ts'),
      join('database', 'schema.ts'),
      join('types', 'dto.ts'),
      join('types', 'interface.ts'),
      join('services', `${ZodSchemaAnalyzer.toCamelCase(this.getModuleName(modulePath))}.service.ts`),
      join('controllers', `${ZodSchemaAnalyzer.toCamelCase(this.getModuleName(modulePath))}.controller.ts`)
    ];

    return requiredFiles.every(file => existsSync(join(modulePath, file)));
  }

  /**
   * Procura arquivo de schema em um módulo
   */
  private async findSchemaFile(modulePath: string): Promise<string | null> {
    const possiblePaths = [
      join(modulePath, 'database', 'schema.ts'),
      join(modulePath, 'schema.ts'),
      join(modulePath, `${this.getModuleName(modulePath)}.ts`)
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        try {
          const module = await import(`file://${resolve(path)}`);
          if (module.schema) {
            return path;
          }
        } catch {
          // Ignora erros de import
        }
      }
    }

    return null;
  }

  /**
   * Extrai nome do módulo do caminho
   */
  private getModuleName(modulePath: string): string {
    return modulePath.split('/').pop() || 'Unknown';
  }

  /**
   * Lista todos os módulos gerados automaticamente
   */
  static listGeneratedModules(modulesPath: string = 'src/modules'): string[] {
    const fullPath = resolve(modulesPath);

    if (!existsSync(fullPath)) {
      return [];
    }

    return readdirSync(fullPath)
      .filter(item => {
        const itemPath = join(fullPath, item);
        return statSync(itemPath).isDirectory() && existsSync(join(itemPath, 'index.ts'));
      });
  }

  /**
   * Limpa módulos gerados automaticamente (para desenvolvimento)
   */
  static cleanGeneratedModules(modulesPath: string = 'src/modules', dryRun: boolean = true): void {
    const modules = this.listGeneratedModules(modulesPath);

    console.log(`🧹 Limpando ${modules.length} módulos gerados...`);

    if (dryRun) {
      console.log('🔍 [DRY RUN] Os seguintes módulos seriam removidos:');
      modules.forEach(module => console.log(`  - ${module}`));
      return;
    }

    // Implementar remoção se necessário
    console.log('⚠️  Funcionalidade de limpeza não implementada ainda');
  }
}

/**
 * Função utilitária para executar geração automática
 */
export async function autoGenerateFromZodSchemas(options?: AutoGenerationOptions): Promise<void> {
  const generator = new AutoGenerator(options);
  await generator.generate();
}

/**
 * Função para desenvolvimento - limpar módulos gerados
 */
export function cleanGeneratedModules(modulesPath?: string, dryRun?: boolean): void {
  AutoGenerator.cleanGeneratedModules(modulesPath, dryRun);
}

/**
 * Função para listar módulos gerados
 */
export function listGeneratedModules(modulesPath?: string): string[] {
  return AutoGenerator.listGeneratedModules(modulesPath);
}
