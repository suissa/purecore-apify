/**
 * Sistema de Auto-Geração DDD (Domain-Driven Design)
 * Gera arquitetura completa DDD baseada em Schemas Zod
 *
 * Estrutura DDD gerada:
 * ├── domain/
 * │   ├── entities/
 * │   ├── value-objects/
 * │   ├── services/
 * │   ├── events/
 * │   ├── aggregates/
 * │   └── repositories/
 * ├── application/
 * │   ├── commands/
 * │   ├── queries/
 * │   ├── handlers/
 * │   ├── dtos/
 * │   └── services/
 * ├── infrastructure/
 * │   ├── repositories/
 * │   ├── database/
 * │   ├── external-services/
 * │   └── config/
 * └── presentation/
 *     ├── controllers/
 *     ├── routes/
 *     ├── middlewares/
 *     └── views/
 */

import { readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ZodSchemaAnalyzer, CodeGenerator, EntityMetadata } from './zod-analyzer';

export interface DDDGenerationOptions {
  modulesPath?: string;
  domainPath?: string;
  force?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  boundedContext?: string;
}

export class AutoGeneratorDDD {
  private options: Required<DDDGenerationOptions>;

  constructor(options: DDDGenerationOptions = {}) {
    this.options = {
      modulesPath: options.modulesPath || 'src/modules',
      domainPath: options.domainPath || 'src/domain',
      force: options.force || false,
      verbose: options.verbose || true,
      dryRun: options.dryRun || false,
      boundedContext: options.boundedContext || 'default'
    };
  }

  /**
   * Executa a geração automática DDD para todos os módulos detectados
   */
  async generate(): Promise<void> {
    console.log('\n🚀 ========== AUTOGENERATOR DDD INICIADO ==========');
    console.log('🏗️  Iniciando auto-geração DDD baseada em schemas Zod...');
    console.log(`📂 Bounded Context: ${this.options.boundedContext}`);
    console.log(`🏛️  Domain Path: ${this.options.domainPath}`);
    console.log(`📁 Modules Path: ${this.options.modulesPath}`);
    console.log(`🔧 Force: ${this.options.force}`);
    console.log(`📊 Verbose: ${this.options.verbose}`);
    console.log(`🧪 Dry Run: ${this.options.dryRun}`);

    const modulesPath = resolve(this.options.modulesPath);
    console.log(`📍 Caminho absoluto dos módulos: ${modulesPath}`);

    // Verifica se a pasta modules existe
    if (!existsSync(modulesPath)) {
      console.log(`❌ ERRO: Pasta ${modulesPath} não encontrada.`);
      console.log(`🔧 Verifique se o caminho está correto e se a pasta existe.`);
      return;
    }

    console.log(`✅ Pasta de módulos encontrada: ${modulesPath}`);

    // Lista arquivos/pastas em modules
    const items = readdirSync(modulesPath);
    console.log(`📋 Itens encontrados na pasta modules: ${items.length}`);

    if (items.length === 0) {
      console.log(`⚠️  AVISO: Nenhum item encontrado em ${modulesPath}`);
      console.log(`💡 Dica: Coloque seus arquivos .schema.ts na pasta especificada`);
      return;
    }

    for (const item of items) {
      const itemPath = join(modulesPath, item);
      const stat = statSync(itemPath);

      console.log(`\n🔍 Processando item: ${item}`);
      console.log(`   📍 Caminho: ${itemPath}`);

      if (stat.isDirectory()) {
        console.log(`   📁 Tipo: Diretório`);
        await this.processExistingModule(item, itemPath);
      } else if (item.endsWith('.schema.ts')) {
        console.log(`   📄 Tipo: Schema Zod (.schema.ts)`);
        await this.generateFromStandaloneFile(item, itemPath, modulesPath);
      } else if (item.endsWith('.ts')) {
        console.log(`   🚫 Tipo: Arquivo TypeScript (não é .schema.ts) - Ignorado`);
      } else {
        console.log(`   🚫 Tipo: ${stat.isFile() ? 'Arquivo' : 'Outro'} - Ignorado`);
      }
    }

    console.log('\n🎉 ========== AUTOGENERATOR DDD CONCLUÍDO ==========');
    console.log('✅ Auto-geração DDD concluída com sucesso!');
    console.log(`📂 Bounded Context processado: ${this.options.boundedContext}`);
    console.log(`📁 Caminho dos módulos: ${this.options.modulesPath}`);
    console.log(`🏛️  Caminho do domínio: ${this.options.domainPath}`);
    console.log(`🔧 Modo: ${this.options.dryRun ? 'DRY RUN (simulação)' : 'PRODUCTION (arquivos criados)'}`);
    console.log('================================================\n');
  }

  /**
   * Processa módulo que já existe como pasta
   */
  private async processExistingModule(moduleName: string, modulePath: string): Promise<void> {
    if (this.options.verbose) {
      console.log(`📂 Verificando módulo existente: ${moduleName}`);
    }

    const hasStructure = this.checkDDDStructure(modulePath);

    if (!hasStructure || this.options.force) {
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
      console.log(`✅ Módulo ${moduleName} já possui estrutura DDD completa`);
    }
  }

  /**
   * Gera estrutura completa DDD a partir de arquivo .ts solto
   */
  private async generateFromStandaloneFile(fileName: string, filePath: string, modulesPath: string): Promise<void> {
    const entityName = ZodSchemaAnalyzer.extractEntityName(fileName);
    const moduleName = entityName.toLowerCase();
    const modulePath = join(modulesPath, moduleName);

    console.log(`   🎯 Entidade detectada: ${entityName}`);
    console.log(`   📦 Módulo a ser criado: ${moduleName}`);
    console.log(`   🗂️  Pasta do módulo: ${modulePath}`);

    if (this.options.verbose) {
      console.log(`📄 Arquivo standalone detectado: ${fileName} -> Gerando módulo DDD ${moduleName}`);
    }

    try {
      const moduleUrl = `file://${resolve(filePath)}`;
      console.log(`   🔗 Importando arquivo: ${moduleUrl}`);
      const importedModule = await import(moduleUrl);

      console.log(`   ✅ Arquivo importado com sucesso`);

      if (importedModule.schema) {
        console.log(`   🎯 Schema Zod encontrado no arquivo!`);
        console.log(`   🔍 Analisando schema...`);

        try {
          const metadata = ZodSchemaAnalyzer.analyzeSchema(importedModule.schema, entityName);

          console.log(`   📊 Schema analisado com sucesso:`);
          console.log(`      • Nome da entidade: ${metadata.name}`);
          console.log(`      • Campos detectados: ${metadata.fields.length}`);
          console.log(`      • Tipos de campos: ${metadata.fields.map(f => f.type).join(', ')}`);

          if (this.options.verbose) {
            console.log(`📊 Schema analisado: ${metadata.fields.length} campos detectados`);
          }

          console.log(`   🏗️  Iniciando geração da estrutura DDD...`);
          await this.generateDDDStructure(metadata, modulePath, filePath);

          console.log(`   ✅ Estrutura DDD gerada para ${entityName}!`);

        } catch (schemaError) {
          console.warn(`   ⚠️  Erro ao analisar schema em ${fileName}:`, schemaError.message);
          console.warn(`   🚫 Pulando arquivo - não é um schema Zod válido`);
        }

      } else {
        console.log(`   ℹ️  Arquivo ${fileName} não contém schema Zod (ignorando)`);
      }
    } catch (error) {
      console.error(`   ❌ ERRO ao processar ${fileName}:`, error);
      console.error(`   📋 Detalhes do erro:`, error.message);
    }
  }

  /**
   * Gera estrutura completa DDD a partir de arquivo de schema existente
   */
  private async generateFromSchemaFile(schemaPath: string, moduleName: string, modulePath: string): Promise<void> {
    try {
      const moduleUrl = `file://${resolve(schemaPath)}`;
      const importedModule = await import(moduleUrl);

      if (importedModule.schema) {
        const entityName = ZodSchemaAnalyzer.extractEntityName(moduleName);
        const metadata = ZodSchemaAnalyzer.analyzeSchema(importedModule.schema, entityName);

        await this.generateDDDStructure(metadata, modulePath);
      }
    } catch (error) {
      console.error(`❌ Erro ao processar schema ${schemaPath}:`, error);
    }
  }

  /**
   * Gera toda a estrutura DDD para um módulo
   */
  private async generateDDDStructure(
    metadata: EntityMetadata,
    modulePath: string,
    originalFilePath?: string
  ): Promise<void> {
    const { name } = metadata;
    const entityName = ZodSchemaAnalyzer.toCamelCase(name);
    const aggregateName = this.toAggregateName(name);

    console.log(`\n🏗️  🏛️  INICIANDO GERAÇÃO DDD PARA: ${name.toUpperCase()}`);
    console.log(`📍 Localização do módulo: ${modulePath}`);
    console.log(`🎯 Entidade: ${entityName} (Aggregate: ${aggregateName})`);
    console.log(`📊 Campos detectados: ${metadata.fields.length}`);

    if (this.options.verbose) {
      console.log(`🏗️  Gerando estrutura DDD para ${name}...`);
    }

    if (this.options.dryRun) {
      console.log(`🔍 [DRY RUN] Estrutura DDD seria gerada em: ${modulePath}`);
      console.log(`⚠️  Nenhum arquivo será criado (dry run ativado)`);
      return;
    }

    console.log(`✅ Modo produção: Arquivos serão criados fisicamente`);

    // Cria estrutura de diretórios DDD
    console.log(`\n📁 CRIANDO ESTRUTURA DE DIRETÓRIOS DDD:`);

    const dddDirs = [
      // Domain Layer
      { path: join(modulePath, 'domain', 'entities'), layer: 'Domain', type: 'Entities' },
      { path: join(modulePath, 'domain', 'value-objects'), layer: 'Domain', type: 'Value Objects' },
      { path: join(modulePath, 'domain', 'services'), layer: 'Domain', type: 'Services' },
      { path: join(modulePath, 'domain', 'events'), layer: 'Domain', type: 'Events' },
      { path: join(modulePath, 'domain', 'aggregates'), layer: 'Domain', type: 'Aggregates' },
      { path: join(modulePath, 'domain', 'repositories'), layer: 'Domain', type: 'Repositories' },

      // Application Layer
      { path: join(modulePath, 'application', 'commands'), layer: 'Application', type: 'Commands' },
      { path: join(modulePath, 'application', 'queries'), layer: 'Application', type: 'Queries' },
      { path: join(modulePath, 'application', 'handlers'), layer: 'Application', type: 'Handlers' },
      { path: join(modulePath, 'application', 'dtos'), layer: 'Application', type: 'DTOs' },
      { path: join(modulePath, 'application', 'services'), layer: 'Application', type: 'Services' },

      // Infrastructure Layer
      { path: join(modulePath, 'infrastructure', 'repositories'), layer: 'Infrastructure', type: 'Repositories' },
      { path: join(modulePath, 'infrastructure', 'database'), layer: 'Infrastructure', type: 'Database' },
      { path: join(modulePath, 'infrastructure', 'external-services'), layer: 'Infrastructure', type: 'External Services' },
      { path: join(modulePath, 'infrastructure', 'config'), layer: 'Infrastructure', type: 'Config' },

      // Presentation Layer
      { path: join(modulePath, 'presentation', 'controllers'), layer: 'Presentation', type: 'Controllers' },
      { path: join(modulePath, 'presentation', 'routes'), layer: 'Presentation', type: 'Routes' },
      { path: join(modulePath, 'presentation', 'middlewares'), layer: 'Presentation', type: 'Middlewares' },
      { path: join(modulePath, 'presentation', 'views'), layer: 'Presentation', type: 'Views' },

      // Cross-cutting
      { path: join(modulePath, 'tests'), layer: 'Cross-cutting', type: 'Tests' },
      { path: join(modulePath, 'shared'), layer: 'Cross-cutting', type: 'Shared' }
    ];

    let dirsCreated = 0;
    for (const dir of dddDirs) {
      if (!existsSync(dir.path)) {
        mkdirSync(dir.path, { recursive: true });
        console.log(`  📁 [${dir.layer}] ${dir.type}: ${dir.path}`);
        dirsCreated++;
      } else {
        console.log(`  ✅ [${dir.layer}] ${dir.type}: ${dir.path} (já existe)`);
      }
    }

    console.log(`\n📊 Total de diretórios criados: ${dirsCreated}/${dddDirs.length}`);

    // Gera arquivos DDD completos
    console.log(`\n📝 GERANDO ARQUIVOS DDD:`);
    const files = this.generateDDDFileStructure(metadata, modulePath, entityName, aggregateName);

    console.log(`📊 Total de arquivos a serem gerados: ${files.length}`);
    console.log(`🔧 Iniciando escrita de arquivos...\n`);

    // Escreve arquivos
    let filesWritten = 0;
    let filesSkipped = 0;
    for (const file of files) {
      try {
        // Verifica se o arquivo já existe
        const fileExists = existsSync(file.path);
        const willOverwrite = fileExists && this.options.force;

        if (fileExists && !this.options.force) {
          console.log(`  ⏭️  PULADO (já existe): ${file.path.replace(modulePath, '.').replace(/\\/g, '/')}`);
          filesSkipped++;
          continue;
        }

        writeFileSync(file.path, file.content, 'utf-8');
        const action = willOverwrite ? '🔄 SOBRESCRITO' : '✅ CRIADO';
        console.log(`  ${action} ${file.path.replace(modulePath, '.').replace(/\\/g, '/')}`);

        if (this.options.verbose) {
          console.log(`     📏 Tamanho: ${file.content.length} caracteres`);
          console.log(`     📂 Caminho absoluto: ${file.path}`);
        }

        filesWritten++;

      } catch (error) {
        console.error(`  ❌ ERRO ao criar: ${file.path.replace(modulePath, '.').replace(/\\/g, '/')}`);
        console.error(`     Detalhes: ${error}`);
      }
    }

    console.log(`\n📈 RESUMO FINAL DA GERAÇÃO DDD:`);
    console.log(`  • 🏷️  Entidade: ${name}`);
    console.log(`  • 📁 Diretórios criados: ${dirsCreated}/${dddDirs.length}`);
    console.log(`  • 📝 Arquivos criados: ${filesWritten}`);
    console.log(`  • ⏭️  Arquivos pulados: ${filesSkipped}`);
    console.log(`  • 🎯 Camada Domain: ✅ Entidades, Aggregates, Events, Repositories`);
    console.log(`  • 📱 Camada Application: ✅ Commands, Queries, Handlers, DTOs`);
    console.log(`  • 🔧 Camada Infrastructure: ✅ Repositories, Database, External Services`);
    console.log(`  • 🌐 Camada Presentation: ✅ Controllers, Routes, Middlewares`);
    console.log(`  • 🧪 Cross-cutting: ✅ Tests, Shared utilities`);
    console.log(`  • 📦 Total de arquivos gerados: ${filesWritten}/${files.length}`);

    console.log(`\n🎉 MÓDULO DDD "${name.toUpperCase()}" GERADO COM SUCESSO!`);
    console.log(`🏛️  Arquitetura Domain-Driven Design implementada completamente`);
    console.log(`📍 Localização: ${modulePath}`);
  }

  /**
   * Gera toda a estrutura de arquivos DDD
   */
  private generateDDDFileStructure(
    metadata: EntityMetadata,
    modulePath: string,
    entityName: string,
    aggregateName: string
  ): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    // 1. DOMAIN LAYER

    // Entity
    files.push({
      path: join(modulePath, 'domain', 'entities', `${entityName}.entity.ts`),
      content: this.generateDomainEntity(metadata, entityName)
    });

    // Value Objects
    const valueObjects = this.extractValueObjects(metadata);
    valueObjects.forEach(vo => {
      files.push({
        path: join(modulePath, 'domain', 'value-objects', `${vo.name.toLowerCase()}.vo.ts`),
        content: this.generateValueObject(vo)
      });
    });

    // Aggregate
    files.push({
      path: join(modulePath, 'domain', 'aggregates', `${aggregateName}.aggregate.ts`),
      content: this.generateAggregate(metadata, entityName, aggregateName)
    });

    // Domain Events
    files.push({
      path: join(modulePath, 'domain', 'events', `${entityName}.events.ts`),
      content: this.generateDomainEvents(metadata, entityName)
    });

    // Domain Repository Interface
    files.push({
      path: join(modulePath, 'domain', 'repositories', `i${entityName}.repository.ts`),
      content: this.generateDomainRepositoryInterface(metadata, entityName)
    });

    // Domain Service
    files.push({
      path: join(modulePath, 'domain', 'services', `${entityName}.domain-service.ts`),
      content: this.generateDomainService(metadata, entityName)
    });

    // 2. APPLICATION LAYER

    // Commands
    files.push({
      path: join(modulePath, 'application', 'commands', `${entityName}.commands.ts`),
      content: this.generateCommands(metadata, entityName)
    });

    // Queries
    files.push({
      path: join(modulePath, 'application', 'queries', `${entityName}.queries.ts`),
      content: this.generateQueries(metadata, entityName)
    });

    // Command Handlers
    files.push({
      path: join(modulePath, 'application', 'handlers', `${entityName}.command-handlers.ts`),
      content: this.generateCommandHandlers(metadata, entityName)
    });

    // Query Handlers
    files.push({
      path: join(modulePath, 'application', 'handlers', `${entityName}.query-handlers.ts`),
      content: this.generateQueryHandlers(metadata, entityName)
    });

    // DTOs
    files.push({
      path: join(modulePath, 'application', 'dtos', `${entityName}.dto.ts`),
      content: this.generateApplicationDTOs(metadata, entityName)
    });

    // Application Service
    files.push({
      path: join(modulePath, 'application', 'services', `${entityName}.app-service.ts`),
      content: this.generateApplicationService(metadata, entityName)
    });

    // 3. INFRASTRUCTURE LAYER

    // Repository Implementation
    files.push({
      path: join(modulePath, 'infrastructure', 'repositories', `${entityName}.repository.ts`),
      content: this.generateInfrastructureRepository(metadata, entityName)
    });

    // Database Schema
    files.push({
      path: join(modulePath, 'infrastructure', 'database', `${entityName}.schema.ts`),
      content: this.generateDatabaseSchema(metadata, entityName)
    });

    // Database Context
    files.push({
      path: join(modulePath, 'infrastructure', 'database', 'context.ts'),
      content: this.generateDatabaseContext(metadata)
    });

    // External Services
    files.push({
      path: join(modulePath, 'infrastructure', 'external-services', `${entityName}.external-service.ts`),
      content: this.generateExternalService(metadata, entityName)
    });

    // Infrastructure Config
    files.push({
      path: join(modulePath, 'infrastructure', 'config', 'database.config.ts'),
      content: this.generateInfrastructureConfig(metadata)
    });

    // 4. PRESENTATION LAYER

    // Controller
    files.push({
      path: join(modulePath, 'presentation', 'controllers', `${entityName}.controller.ts`),
      content: this.generatePresentationController(metadata, entityName)
    });

    // Routes
    files.push({
      path: join(modulePath, 'presentation', 'routes', `${entityName}.routes.ts`),
      content: this.generatePresentationRoutes(metadata, entityName)
    });

    // Middlewares
    files.push({
      path: join(modulePath, 'presentation', 'middlewares', `${entityName}.middleware.ts`),
      content: this.generatePresentationMiddleware(metadata, entityName)
    });

    // 5. CROSS-CUTTING CONCERNS

    // Tests
    files.push({
      path: join(modulePath, 'tests', `${entityName}.test.ts`),
      content: this.generateDDDTests(metadata, entityName)
    });

    // Shared utilities
    files.push({
      path: join(modulePath, 'shared', 'constants.ts'),
      content: this.generateSharedConstants(metadata, entityName)
    });

    // Module index
    files.push({
      path: join(modulePath, 'index.ts'),
      content: this.generateDDDIndex(metadata, entityName, aggregateName)
    });

    return files;
  }

  /**
   * Verifica se um módulo já possui estrutura DDD completa
   */
  private checkDDDStructure(modulePath: string): boolean {
    const requiredDirs = [
      'domain/entities',
      'domain/repositories',
      'application/commands',
      'application/handlers',
      'infrastructure/repositories',
      'presentation/controllers',
      'presentation/routes'
    ];

    return requiredDirs.every(dir => existsSync(join(modulePath, dir)));
  }

  /**
   * Procura arquivo de schema em um módulo
   */
  private async findSchemaFile(modulePath: string): Promise<string | null> {
    const possiblePaths = [
      join(modulePath, 'domain', 'entities', 'schema.ts'),
      join(modulePath, 'infrastructure', 'database', 'schema.ts'),
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
   * Converte nome para formato de aggregate
   */
  private toAggregateName(name: string): string {
    return `${name}Aggregate`;
  }

  /**
   * Extrai value objects do metadata
   */
  private extractValueObjects(metadata: EntityMetadata): Array<{ name: string; fields: any[] }> {
    // Lógica simplificada - em produção seria mais sofisticada
    return [];
  }

  // =========================================
  // GERADORES DE CÓDIGO DDD
  // =========================================

  private generateDomainEntity(metadata: EntityMetadata, entityName: string): string {
    const { name, fields } = metadata;
    const className = this.toPascalCase(name);

    const fieldDeclarations = fields.map(field =>
      `  private ${field.name}: ${field.type};`
    ).join('\n');

    const constructorParams = fields.map(field =>
      `    ${field.name}: ${field.type}`
    ).join(',\n');

    const constructorAssignments = fields.map(field =>
      `    this.${field.name} = ${field.name};`
    ).join('\n');

    const getters = fields.map(field =>
      `  get ${field.name}(): ${field.type} {
    return this.${field.name};
  }`
    ).join('\n\n');

    return `/**
 * Domain Entity: ${className}
 * Representa a entidade de domínio ${name}
 */
export class ${className} {
${fieldDeclarations}

  constructor(
${constructorParams}
  ) {
${constructorAssignments}
  }

${getters}

  /**
   * Valida os dados da entidade
   */
  public validate(): boolean {
    // Implementar validação de domínio
    return true;
  }

  /**
   * Verifica se a entidade está em estado válido
   */
  public isValid(): boolean {
    return this.validate();
  }
}`;
  }

  private generateAggregate(metadata: EntityMetadata, entityName: string, aggregateName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Aggregate Root: ${aggregateName}
 * Agregado raiz para ${className}
 */
export class ${aggregateName} {
  private root: ${className};
  private domainEvents: DomainEvent[] = [];

  constructor(root: ${className}) {
    this.root = root;
  }

  /**
   * Executa operação de negócio no agregado
   */
  public performBusinessOperation(): void {
    // Implementar lógica de negócio do agregado
    this.addDomainEvent(new ${className}BusinessOperationPerformedEvent(this.root.id));
  }

  /**
   * Adiciona evento de domínio
   */
  private addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Obtém eventos de domínio não publicados
   */
  public getUncommittedEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }

  /**
   * Marca eventos como publicados
   */
  public markEventsAsCommitted(): void {
    this.domainEvents = [];
  }

  /**
   * Obtém a entidade raiz
   */
  public getRoot(): ${className} {
    return this.root;
  }
}

// Import necessário
import { DomainEvent } from './events/${entityName}.events';
import { ${className}BusinessOperationPerformedEvent } from './events/${entityName}.events';`;
  }

  private generateDomainEvents(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Domain Events para ${className}
 */

export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;

  constructor() {
    this.occurredOn = new Date();
  }

  abstract eventType(): string;
}

export class ${className}CreatedEvent extends DomainEvent {
  constructor(public readonly ${entityName}Id: string) {
    super();
  }

  eventType(): string {
    return '${className}Created';
  }
}

export class ${className}UpdatedEvent extends DomainEvent {
  constructor(public readonly ${entityName}Id: string) {
    super();
  }

  eventType(): string {
    return '${className}Updated';
  }
}

export class ${className}DeletedEvent extends DomainEvent {
  constructor(public readonly ${entityName}Id: string) {
    super();
  }

  eventType(): string {
    return '${className}Deleted';
  }
}

export class ${className}BusinessOperationPerformedEvent extends DomainEvent {
  constructor(public readonly ${entityName}Id: string) {
    super();
  }

  eventType(): string {
    return '${className}BusinessOperationPerformed';
  }
}`;
  }

  private generateDomainRepositoryInterface(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Domain Repository Interface: I${className}Repository
 * Define contrato para operações de persistência da entidade ${className}
 */
export interface I${className}Repository {
  /**
   * Busca entidade por ID
   */
  findById(id: string): Promise<${className} | null>;

  /**
   * Busca todas as entidades
   */
  findAll(): Promise<${className}[]>;

  /**
   * Salva entidade
   */
  save(entity: ${className}): Promise<void>;

  /**
   * Atualiza entidade
   */
  update(entity: ${className}): Promise<void>;

  /**
   * Remove entidade
   */
  delete(id: string): Promise<void>;

  /**
   * Verifica se entidade existe
   */
  exists(id: string): Promise<boolean>;
}

// Import necessário
import { ${className} } from '../entities/${entityName}.entity';`;
  }

  private generateDomainService(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Domain Service: ${className}DomainService
 * Contém lógica de negócio que não pertence a uma entidade específica
 */
export class ${className}DomainService {
  constructor(
    private readonly ${entityName}Repository: I${className}Repository
  ) {}

  /**
   * Executa operação de negócio complexa
   */
  public async performComplexBusinessOperation(${entityName}Id: string): Promise<void> {
    const ${entityName} = await this.${entityName}Repository.findById(${entityName}Id);

    if (!${entityName}) {
      throw new Error('${className} não encontrado');
    }

    // Implementar lógica de negócio complexa
    // que envolve múltiplas entidades ou regras de negócio

    // Persistir mudanças
    await this.${entityName}Repository.update(${entityName});
  }

  /**
   * Valida regra de negócio específica
   */
  public validateBusinessRule(${entityName}: ${className}): boolean {
    // Implementar validação de regra de negócio
    return true;
  }
}

// Imports necessários
import { ${className} } from '../entities/${entityName}.entity';
import { I${className}Repository } from '../repositories/i${entityName}.repository';`;
  }

  private generateCommands(metadata: EntityMetadata, entityName: string): string {
    const { name, fields } = metadata;
    const className = this.toPascalCase(name);

    const createCommandFields = fields.map(field =>
      `  public readonly ${field.name}: ${field.type};`
    ).join('\n');

    const updateCommandFields = fields.filter(field => field.name !== 'id').map(field =>
      `  public readonly ${field.name}?: ${field.type};`
    ).join('\n');

    return `/**
 * Commands para ${className}
 */

export abstract class Command {
  public readonly id: string;
  public readonly timestamp: Date;

  constructor(id: string) {
    this.id = id;
    this.timestamp = new Date();
  }
}

export class Create${className}Command extends Command {
${createCommandFields}

  constructor(
    id: string,
${fields.map(field => `    ${field.name}: ${field.type}`).join(',\n')}
  ) {
    super(id);
${fields.map(field => `    this.${field.name} = ${field.name};`).join('\n')}
  }
}

export class Update${className}Command extends Command {
  public readonly ${entityName}Id: string;
${updateCommandFields}

  constructor(
    id: string,
    ${entityName}Id: string,
${fields.filter(field => field.name !== 'id').map(field => `    ${field.name}?: ${field.type}`).join(',\n')}
  ) {
    super(id);
    this.${entityName}Id = ${entityName}Id;
${fields.filter(field => field.name !== 'id').map(field => `    this.${field.name} = ${field.name};`).join('\n')}
  }
}

export class Delete${className}Command extends Command {
  public readonly ${entityName}Id: string;

  constructor(id: string, ${entityName}Id: string) {
    super(id);
    this.${entityName}Id = ${entityName}Id;
  }
}`;
  }

  private generateQueries(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Queries para ${className}
 */

export abstract class Query {
  public readonly id: string;
  public readonly timestamp: Date;

  constructor(id: string) {
    this.id = id;
    this.timestamp = new Date();
  }
}

export class Get${className}ByIdQuery extends Query {
  public readonly ${entityName}Id: string;

  constructor(id: string, ${entityName}Id: string) {
    super(id);
    this.${entityName}Id = ${entityName}Id;
  }
}

export class GetAll${className}sQuery extends Query {
  public readonly page?: number;
  public readonly limit?: number;

  constructor(id: string, page?: number, limit?: number) {
    super(id);
    this.page = page;
    this.limit = limit;
  }
}

export class Search${className}sQuery extends Query {
  public readonly searchTerm: string;
  public readonly page?: number;
  public readonly limit?: number;

  constructor(id: string, searchTerm: string, page?: number, limit?: number) {
    super(id);
    this.searchTerm = searchTerm;
    this.page = page;
    this.limit = limit;
  }
}`;
  }

  private generateCommandHandlers(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Command Handlers para ${className}
 */
export class ${className}CommandHandlers {
  constructor(
    private readonly ${entityName}Repository: I${className}Repository,
    private readonly ${entityName}DomainService: ${className}DomainService
  ) {}

  /**
   * Trata comando de criação
   */
  public async handleCreate${className}(
    command: Create${className}Command
  ): Promise<string> {
    // Criar entidade através do domínio
    const ${entityName} = new ${className}(
${metadata.fields.map(field => `      command.${field.name}`).join(',\n')}
    );

    // Validar regras de negócio
    if (!this.${entityName}DomainService.validateBusinessRule(${entityName})) {
      throw new Error('Regra de negócio violada');
    }

    // Persistir
    await this.${entityName}Repository.save(${entityName});

    return ${entityName}.id;
  }

  /**
   * Trata comando de atualização
   */
  public async handleUpdate${className}(
    command: Update${className}Command
  ): Promise<void> {
    const ${entityName} = await this.${entityName}Repository.findById(command.${entityName}Id);

    if (!${entityName}) {
      throw new Error('${className} não encontrado');
    }

    // Aplicar mudanças (implementar lógica de atualização)
    await this.${entityName}Repository.update(${entityName});
  }

  /**
   * Trata comando de exclusão
   */
  public async handleDelete${className}(
    command: Delete${className}Command
  ): Promise<void> {
    const exists = await this.${entityName}Repository.exists(command.${entityName}Id);

    if (!exists) {
      throw new Error('${className} não encontrado');
    }

    await this.${entityName}Repository.delete(command.${entityName}Id);
  }
}

// Imports necessários
import { I${className}Repository } from '../../domain/repositories/i${entityName}.repository';
import { ${className} } from '../../domain/entities/${entityName}.entity';
import { ${className}DomainService } from '../../domain/services/${entityName}.domain-service';
import { Create${className}Command, Update${className}Command, Delete${className}Command } from '../commands/${entityName}.commands';`;
  }

  private generateQueryHandlers(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Query Handlers para ${className}
 */
export class ${className}QueryHandlers {
  constructor(
    private readonly ${entityName}Repository: I${className}Repository
  ) {}

  /**
   * Trata query para buscar por ID
   */
  public async handleGet${className}ById(
    query: Get${className}ByIdQuery
  ): Promise<${className} | null> {
    return await this.${entityName}Repository.findById(query.${entityName}Id);
  }

  /**
   * Trata query para buscar todos
   */
  public async handleGetAll${className}s(
    query: GetAll${className}sQuery
  ): Promise<${className}[]> {
    const all = await this.${entityName}Repository.findAll();

    // Implementar paginação se necessário
    if (query.page && query.limit) {
      const start = (query.page - 1) * query.limit;
      return all.slice(start, start + query.limit);
    }

    return all;
  }

  /**
   * Trata query de busca
   */
  public async handleSearch${className}s(
    query: Search${className}sQuery
  ): Promise<${className}[]> {
    // Implementar lógica de busca
    const all = await this.${entityName}Repository.findAll();

    // Filtrar por termo de busca (simplificado)
    const filtered = all.filter(item =>
      // Implementar lógica de busca específica
      true
    );

    // Implementar paginação se necessário
    if (query.page && query.limit) {
      const start = (query.page - 1) * query.limit;
      return filtered.slice(start, start + query.limit);
    }

    return filtered;
  }
}

// Imports necessários
import { I${className}Repository } from '../../domain/repositories/i${entityName}.repository';
import { ${className} } from '../../domain/entities/${entityName}.entity';
import { Get${className}ByIdQuery, GetAll${className}sQuery, Search${className}sQuery } from '../queries/${entityName}.queries';`;
  }

  private generateApplicationDTOs(metadata: EntityMetadata, entityName: string): string {
    const { name, fields } = metadata;
    const className = this.toPascalCase(name);

    const inputFields = fields.filter(field => field.name !== 'id').map(field =>
      `  ${field.name}: ${field.type};`
    ).join('\n');

    const outputFields = fields.map(field =>
      `  ${field.name}: ${field.type};`
    ).join('\n');

    return `/**
 * Data Transfer Objects para ${className}
 */

// Input DTOs
export class Create${className}Input {
${inputFields}
}

export class Update${className}Input {
${inputFields}
}

// Output DTOs
export class ${className}Output {
${outputFields}
}

export class ${className}ListOutput {
  items: ${className}Output[];
  total: number;
  page?: number;
  limit?: number;

  constructor(items: ${className}Output[], total: number, page?: number, limit?: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
  }
}`;
  }

  private generateApplicationService(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Application Service: ${className}AppService
 * Coordena operações da aplicação usando o domínio
 */
export class ${className}AppService {
  constructor(
    private readonly commandHandlers: ${className}CommandHandlers,
    private readonly queryHandlers: ${className}QueryHandlers
  ) {}

  /**
   * Cria nova entidade
   */
  public async create${className}(input: Create${className}Input): Promise<string> {
    const command = new Create${className}Command(
      this.generateId(),
${Object.keys(input).map(key => `      input.${key}`).join(',\n')}
    );

    return await this.commandHandlers.handleCreate${className}(command);
  }

  /**
   * Atualiza entidade existente
   */
  public async update${className}(id: string, input: Update${className}Input): Promise<void> {
    const command = new Update${className}Command(
      this.generateId(),
      id,
${Object.keys(input).map(key => `      input.${key}`).join(',\n')}
    );

    await this.commandHandlers.handleUpdate${className}(command);
  }

  /**
   * Remove entidade
   */
  public async delete${className}(id: string): Promise<void> {
    const command = new Delete${className}Command(
      this.generateId(),
      id
    );

    await this.commandHandlers.handleDelete${className}(command);
  }

  /**
   * Busca entidade por ID
   */
  public async get${className}ById(id: string): Promise<${className}Output | null> {
    const query = new Get${className}ByIdQuery(this.generateId(), id);
    const entity = await this.queryHandlers.handleGet${className}ById(query);

    return entity ? this.mapToOutput(entity) : null;
  }

  /**
   * Busca todas as entidades
   */
  public async getAll${className}s(page?: number, limit?: number): Promise<${className}ListOutput> {
    const query = new GetAll${className}sQuery(this.generateId(), page, limit);
    const entities = await this.queryHandlers.handleGetAll${className}s(query);

    return new ${className}ListOutput(
      entities.map(entity => this.mapToOutput(entity)),
      entities.length,
      page,
      limit
    );
  }

  /**
   * Busca entidades por termo
   */
  public async search${className}s(searchTerm: string, page?: number, limit?: number): Promise<${className}ListOutput> {
    const query = new Search${className}sQuery(this.generateId(), searchTerm, page, limit);
    const entities = await this.queryHandlers.handleSearch${className}s(query);

    return new ${className}ListOutput(
      entities.map(entity => this.mapToOutput(entity)),
      entities.length,
      page,
      limit
    );
  }

  /**
   * Mapeia entidade para DTO de saída
   */
  private mapToOutput(entity: ${className}): ${className}Output {
    return {
${metadata.fields.map(field => `      ${field.name}: entity.${field.name}`).join(',\n')}
    };
  }

  /**
   * Gera ID único para comandos/queries
   */
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}

// Imports necessários
import { ${className} } from '../../domain/entities/${entityName}.entity';
import { ${className}CommandHandlers } from './handlers/${entityName}.command-handlers';
import { ${className}QueryHandlers } from './handlers/${entityName}.query-handlers';
import { Create${className}Command, Update${className}Command, Delete${className}Command } from './commands/${entityName}.commands';
import { Get${className}ByIdQuery, GetAll${className}sQuery, Search${className}sQuery } from './queries/${entityName}.queries';
import { Create${className}Input, Update${className}Input, ${className}Output, ${className}ListOutput } from './dtos/${entityName}.dto';`;
  }

  private generateInfrastructureRepository(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Infrastructure Repository: ${className}Repository
 * Implementação concreta do repositório usando banco de dados
 */
export class ${className}Repository implements I${className}Repository {
  constructor(
    private readonly database: DatabaseContext
  ) {}

  public async findById(id: string): Promise<${className} | null> {
    const result = await this.database.${entityName}s.findUnique({
      where: { id }
    });

    return result ? this.mapToEntity(result) : null;
  }

  public async findAll(): Promise<${className}[]> {
    const results = await this.database.${entityName}s.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return results.map(result => this.mapToEntity(result));
  }

  public async save(entity: ${className}): Promise<void> {
    const data = this.mapToDatabase(entity);

    await this.database.${entityName}s.create({
      data
    });
  }

  public async update(entity: ${className}): Promise<void> {
    const data = this.mapToDatabase(entity);

    await this.database.${entityName}s.update({
      where: { id: entity.id },
      data
    });
  }

  public async delete(id: string): Promise<void> {
    await this.database.${entityName}s.delete({
      where: { id }
    });
  }

  public async exists(id: string): Promise<boolean> {
    const count = await this.database.${entityName}s.count({
      where: { id }
    });

    return count > 0;
  }

  /**
   * Mapeia resultado do banco para entidade de domínio
   */
  private mapToEntity(data: any): ${className} {
    return new ${className}(
${metadata.fields.map(field => `      data.${field.name}`).join(',\n')}
    );
  }

  /**
   * Mapeia entidade para formato do banco
   */
  private mapToDatabase(entity: ${className}): any {
    return {
${metadata.fields.map(field => `      ${field.name}: entity.${field.name}`).join(',\n')}
    };
  }
}

// Imports necessários
import { I${className}Repository } from '../../domain/repositories/i${entityName}.repository';
import { ${className} } from '../../domain/entities/${entityName}.entity';
import { DatabaseContext } from './context';`;
  }

  private generateDatabaseSchema(metadata: EntityMetadata, entityName: string): string {
    const { name, fields } = metadata;

    const schemaFields = fields.map(field => {
      let fieldType = 'String';
      if (field.type === 'number') fieldType = 'Int';
      if (field.type === 'boolean') fieldType = 'Boolean';
      if (field.type === 'Date') fieldType = 'DateTime';

      const modifiers = [];
      if (field.name === 'id') modifiers.push('@id', '@default(cuid())');
      if (field.name === 'createdAt' || field.name === 'updatedAt') {
        modifiers.push('@default(now())');
        fieldType = 'DateTime';
      }

      return `  ${field.name} ${fieldType}${modifiers.length > 0 ? ' ' + modifiers.join(' ') : ''}`;
    }).join('\n');

    return `/**
 * Database Schema para ${name}
 * Usando Prisma como exemplo
 */

export const ${name}Schema = \`
model ${name} {
${schemaFields}
}
\`;`;
  }

  private generateDatabaseContext(metadata: EntityMetadata): string {
    return `/**
 * Database Context
 * Contexto de banco de dados para toda a aplicação
 */
export class DatabaseContext {
  // Implementação específica do banco de dados
  // Exemplo usando Prisma, TypeORM, etc.

  public ${metadata.name.toLowerCase()}s: any;

  constructor() {
    // Inicializar conexão com banco
    this.initializeConnection();
  }

  private async initializeConnection(): Promise<void> {
    // Implementar inicialização da conexão
    console.log('📊 Database context initialized');
  }

  public async connect(): Promise<void> {
    // Implementar conexão
  }

  public async disconnect(): Promise<void> {
    // Implementar desconexão
  }
}`;
  }

  private generateExternalService(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * External Service: ${className}ExternalService
 * Comunicação com serviços externos
 */
export class ${className}ExternalService {
  constructor(
    private readonly httpClient: HttpClient
  ) {}

  /**
   * Sincroniza dados com serviço externo
   */
  public async syncWithExternalService(${entityName}Id: string): Promise<void> {
    try {
      const response = await this.httpClient.get(\`/external/${entityName}s/\${${entityName}Id}\`);

      // Processar resposta e atualizar dados locais
      console.log('🔄 Sincronizado com serviço externo:', response.data);

    } catch (error) {
      console.error('❌ Erro ao sincronizar com serviço externo:', error);
      throw error;
    }
  }

  /**
   * Envia notificações para serviço externo
   */
  public async sendNotification(${entityName}Id: string, event: string): Promise<void> {
    try {
      await this.httpClient.post('/external/notifications', {
        ${entityName}Id,
        event,
        timestamp: new Date()
      });

      console.log('📤 Notificação enviada para serviço externo');

    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error);
      // Não lançar erro para não quebrar fluxo principal
    }
  }
}

// Interface para cliente HTTP
export interface HttpClient {
  get(url: string): Promise<{ data: any }>;
  post(url: string, data: any): Promise<{ data: any }>;
}`;
  }

  private generateInfrastructureConfig(metadata: EntityMetadata): string {
    return `/**
 * Infrastructure Configuration
 * Configurações de infraestrutura
 */

export const databaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'app_db',
  username: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development'
};

export const externalServiceConfig = {
  baseUrl: process.env.EXTERNAL_SERVICE_URL || 'https://api.external.com',
  apiKey: process.env.EXTERNAL_API_KEY,
  timeout: parseInt(process.env.EXTERNAL_TIMEOUT || '5000')
};

export const cacheConfig = {
  ttl: parseInt(process.env.CACHE_TTL || '300'),
  maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '1000')
};`;
  }

  private generatePresentationController(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Presentation Controller: ${className}Controller
 * Controlador da API REST
 */
export class ${className}Controller {
  constructor(
    private readonly ${entityName}AppService: ${className}AppService
  ) {}

  /**
   * GET /${entityName}s
   */
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const result = await this.${entityName}AppService.getAll${className}s(page, limit);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * GET /${entityName}s/:id
   */
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.${entityName}AppService.get${className}ById(id);

      if (!result) {
        res.status(404).json({ error: '${className} não encontrado' });
        return;
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * POST /${entityName}s
   */
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const input: Create${className}Input = req.body;
      const id = await this.${entityName}AppService.create${className}(input);

      res.status(201).json({ id });
    } catch (error) {
      res.status(400).json({ error: 'Dados inválidos' });
    }
  }

  /**
   * PUT /${entityName}s/:id
   */
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const input: Update${className}Input = req.body;

      await this.${entityName}AppService.update${className}(id, input);

      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Dados inválidos' });
    }
  }

  /**
   * DELETE /${entityName}s/:id
   */
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.${entityName}AppService.delete${className}(id);

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * GET /${entityName}s/search
   */
  public async search(req: Request, res: Response): Promise<void> {
    try {
      const { q: searchTerm } = req.query;
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      if (!searchTerm || typeof searchTerm !== 'string') {
        res.status(400).json({ error: 'Termo de busca é obrigatório' });
        return;
      }

      const result = await this.${entityName}AppService.search${className}s(searchTerm, page, limit);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

// Imports necessários
import { Request, Response } from 'express';
import { ${className}AppService } from '../../application/services/${entityName}.app-service';
import { Create${className}Input, Update${className}Input } from '../../application/dtos/${entityName}.dto';`;
  }

  private generatePresentationRoutes(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Presentation Routes: ${className}Routes
 * Definição das rotas da API
 */

import express, { Router } from 'express';
import { ${className}Controller } from './${entityName}.controller';
import { ${className}Middleware } from './${entityName}.middleware';

export function create${className}Routes(
  ${entityName}Controller: ${className}Controller
): Router {
  const router = express.Router();

  // Middlewares específicos
  router.use(${className}Middleware.validateRequest);

  // Rotas CRUD
  router.get('/', ${entityName}Controller.getAll.bind(${entityName}Controller));
  router.get('/search', ${entityName}Controller.search.bind(${entityName}Controller));
  router.get('/:id', ${entityName}Controller.getById.bind(${entityName}Controller));
  router.post('/', ${entityName}Controller.create.bind(${entityName}Controller));
  router.put('/:id', ${entityName}Controller.update.bind(${entityName}Controller));
  router.delete('/:id', ${entityName}Controller.delete.bind(${entityName}Controller));

  return router;
}

// Função helper para registrar rotas na aplicação principal
export function register${className}Routes(
  app: express.Application,
  ${entityName}Controller: ${className}Controller,
  basePath: string = '/api/${entityName}s'
): void {
  const routes = create${className}Routes(${entityName}Controller);
  app.use(basePath, routes);

  console.log(\`🚀 ${className} routes registered at \${basePath}\`);
}`;
  }

  private generatePresentationMiddleware(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Presentation Middleware: ${className}Middleware
 * Middlewares específicos para ${className}
 */

import { Request, Response, NextFunction } from 'express';

export class ${className}Middleware {
  /**
   * Middleware de validação de requisição
   */
  public static validateRequest(req: Request, res: Response, next: NextFunction): void {
    // Implementar validações específicas
    // Ex: rate limiting, autenticação adicional, sanitização, etc.

    // Validar parâmetros de paginação
    if (req.query.page && isNaN(Number(req.query.page))) {
      res.status(400).json({ error: 'Parâmetro page deve ser numérico' });
      return;
    }

    if (req.query.limit && isNaN(Number(req.query.limit))) {
      res.status(400).json({ error: 'Parâmetro limit deve ser numérico' });
      return;
    }

    next();
  }

  /**
   * Middleware de logging específico
   */
  public static logRequest(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(\`📊 \${req.method} \${req.originalUrl} - \${res.statusCode} (\${duration}ms)\`);
    });

    next();
  }

  /**
   * Middleware de cache para GET requests
   */
  public static cacheResponse(req: Request, res: Response, next: NextFunction): void {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutos
    }

    next();
  }
}`;
  }

  private generateDDDTests(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Tests DDD para ${className}
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ${className} } from '../domain/entities/${entityName}.entity';
import { ${className}Repository } from '../infrastructure/repositories/${entityName}.repository';
import { ${className}AppService } from '../application/services/${entityName}.app-service';
import { ${className}Controller } from '../presentation/controllers/${entityName}.controller';

describe('${className} Domain', () => {
  let entity: ${className};

  beforeEach(() => {
    // Criar entidade de teste
    entity = new ${className}(
${metadata.fields.map(field => `      'test-${field.name}'`).join(',\n')}
    );
  });

  it('should create valid entity', () => {
    expect(entity).toBeDefined();
    expect(entity.isValid()).toBe(true);
  });

  it('should validate business rules', () => {
    expect(entity.validate()).toBe(true);
  });
});

describe('${className} Application Service', () => {
  let appService: ${className}AppService;
  let mockRepository: jest.Mocked<${className}Repository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn()
    } as any;

    appService = new ${className}AppService(
      {} as any, // commandHandlers
      {} as any  // queryHandlers
    );
  });

  it('should create entity', async () => {
    const input = {
${metadata.fields.filter(field => field.name !== 'id').map(field => `      ${field.name}: 'test-${field.name}'`).join(',\n')}
    };

    mockRepository.save.mockResolvedValue(undefined);

    // Testar criação
    // await expect(appService.create${className}(input)).resolves.toBeDefined();
  });
});

describe('${className} Controller', () => {
  let controller: ${className}Controller;
  let mockAppService: jest.Mocked<${className}AppService>;

  beforeEach(() => {
    mockAppService = {
      get${className}ById: jest.fn(),
      getAll${className}s: jest.fn(),
      create${className}: jest.fn(),
      update${className}: jest.fn(),
      delete${className}: jest.fn(),
      search${className}s: jest.fn()
    } as any;

    controller = new ${className}Controller(mockAppService);
  });

  it('should get entity by id', async () => {
    const mockEntity = { id: '1', name: 'Test' };
    mockAppService.get${className}ById.mockResolvedValue(mockEntity);

    const mockReq = { params: { id: '1' } } as any;
    const mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    } as any;

    await controller.getById(mockReq, mockRes);

    expect(mockAppService.get${className}ById).toHaveBeenCalledWith('1');
    expect(mockRes.json).toHaveBeenCalledWith(mockEntity);
  });
});`;
  }

  private generateSharedConstants(metadata: EntityMetadata, entityName: string): string {
    const { name } = metadata;

    return `/**
 * Shared Constants para ${name}
 */

// Constantes de domínio
export const ${name.toUpperCase()}_CONSTANTS = {
  MAX_NAME_LENGTH: 100,
  MIN_NAME_LENGTH: 2,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
} as const;

// Tipos de evento
export const ${name.toUpperCase()}_EVENT_TYPES = {
  CREATED: '${name}Created',
  UPDATED: '${name}Updated',
  DELETED: '${name}Deleted',
  BUSINESS_OPERATION: '${name}BusinessOperation'
} as const;

// Status possíveis
export const ${name.toUpperCase()}_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  ARCHIVED: 'archived'
} as const;

// Códigos de erro
export const ${name.toUpperCase()}_ERROR_CODES = {
  NOT_FOUND: '${name.toUpperCase()}_NOT_FOUND',
  INVALID_DATA: '${name.toUpperCase()}_INVALID_DATA',
  BUSINESS_RULE_VIOLATION: '${name.toUpperCase()}_BUSINESS_RULE_VIOLATION'
} as const;`;
  }

  private generateDDDIndex(metadata: EntityMetadata, entityName: string, aggregateName: string): string {
    const { name } = metadata;
    const className = this.toPascalCase(name);

    return `/**
 * Módulo DDD completo para ${className}
 * Exporta todas as camadas da arquitetura DDD
 */

// Domain Layer
export { ${className} } from './domain/entities/${entityName}.entity';
export { ${aggregateName} } from './domain/aggregates/${aggregateName}.aggregate';
export { I${className}Repository } from './domain/repositories/i${entityName}.repository';
export { ${className}DomainService } from './domain/services/${entityName}.domain-service';
export * from './domain/events/${entityName}.events';

// Application Layer
export { ${className}AppService } from './application/services/${entityName}.app-service';
export * from './application/commands/${entityName}.commands';
export * from './application/queries/${entityName}.queries';
export * from './application/dtos/${entityName}.dto';

// Infrastructure Layer
export { ${className}Repository } from './infrastructure/repositories/${entityName}.repository';
export { DatabaseContext } from './infrastructure/database/context';
export { ${className}ExternalService } from './infrastructure/external-services/${entityName}.external-service';
export * from './infrastructure/config/database.config';

// Presentation Layer
export { ${className}Controller } from './presentation/controllers/${entityName}.controller';
export { create${className}Routes, register${className}Routes } from './presentation/routes/${entityName}.routes';
export { ${className}Middleware } from './presentation/middlewares/${entityName}.middleware';

// Shared
export * from './shared/constants';

// Application Services (para facilitar injeção de dependência)
export { ${className}CommandHandlers } from './application/handlers/${entityName}.command-handlers';
export { ${className}QueryHandlers } from './application/handlers/${entityName}.query-handlers';

/**
 * Função helper para configurar o módulo DDD completo
 */
export function configure${className}Module() {
  // Retornar configuração para injeção de dependência
  return {
    // Domain
    entity: ${className},
    aggregate: ${aggregateName},
    repositoryInterface: I${className}Repository,
    domainService: ${className}DomainService,

    // Application
    appService: ${className}AppService,
    commandHandlers: ${className}CommandHandlers,
    queryHandlers: ${className}QueryHandlers,

    // Infrastructure
    repository: ${className}Repository,
    databaseContext: DatabaseContext,
    externalService: ${className}ExternalService,

    // Presentation
    controller: ${className}Controller,
    routes: create${className}Routes,
    middleware: ${className}Middleware
  };
}`;
  }

  // Utility methods
  private toPascalCase(str: string): string {
    return str.replace(/(^\w|_\w)/g, match => match.replace('_', '').toUpperCase());
  }

  private generateValueObject(vo: { name: string; fields: any[] }): string {
    return `/**
 * Value Object: ${vo.name}
 */
export class ${vo.name} {
  constructor(
${vo.fields.map(field => `    public readonly ${field.name}: ${field.type}`).join(',\n')}
  ) {}

  public equals(other: ${vo.name}): boolean {
    // Implementar comparação de valor
    return true;
  }
}`;
  }

  /**
   * Lista todos os módulos DDD gerados automaticamente
   */
  static listGeneratedDDDModules(modulesPath: string = 'src/modules'): string[] {
    const fullPath = resolve(modulesPath);

    if (!existsSync(fullPath)) {
      return [];
    }

    return readdirSync(fullPath)
      .filter(item => {
        const itemPath = join(fullPath, item);
        return statSync(itemPath).isDirectory() &&
               existsSync(join(itemPath, 'domain', 'entities'));
      });
  }

  /**
   * Limpa módulos DDD gerados automaticamente
   */
  static cleanGeneratedDDDModules(modulesPath: string = 'src/modules', dryRun: boolean = true): void {
    const modules = this.listGeneratedDDDModules(modulesPath);

    console.log(`🧹 Limpando ${modules.length} módulos DDD gerados...`);

    if (dryRun) {
      console.log('🔍 [DRY RUN] Os seguintes módulos DDD seriam removidos:');
      modules.forEach(module => console.log(`  - ${module}`));
      return;
    }

    // Implementar remoção se necessário
    console.log('⚠️  Funcionalidade de limpeza não implementada ainda');
  }
}

/**
 * Função utilitária para executar geração DDD automática
 */
export async function autoGenerateDDDFromZodSchemas(options?: DDDGenerationOptions): Promise<void> {
  const generator = new AutoGeneratorDDD(options);
  await generator.generate();
}

/**
 * Função para desenvolvimento - limpar módulos DDD gerados
 */
export function cleanGeneratedDDDModules(modulesPath?: string, dryRun?: boolean): void {
  AutoGeneratorDDD.cleanGeneratedDDDModules(modulesPath, dryRun);
}

/**
 * Função para listar módulos DDD gerados
 */
export function listGeneratedDDDModules(modulesPath?: string): string[] {
  return AutoGeneratorDDD.listGeneratedDDDModules(modulesPath);
}
