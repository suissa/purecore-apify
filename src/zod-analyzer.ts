/**
 * Analisador de Schemas Zod - Sistema de Auto-Geração de Código
 * Extrai metadados dos schemas Zod para gerar código automaticamente
 */

import { z } from "zod";

// =========================================
// TIPOS E INTERFACES
// =========================================

export interface ZodFieldMetadata {
  name: string;
  type: string;
  zodType: string;
  isOptional: boolean;
  isNullable: boolean;
  hasDefault: boolean;
  defaultValue?: any;
  validations: ZodValidation[];
  nestedFields?: ZodFieldMetadata[];
  isArray: boolean;
  arrayElementType?: string;
}

export interface ZodValidation {
  type: string;
  value?: any;
  message?: string;
}

export interface EntityMetadata {
  name: string;
  fields: ZodFieldMetadata[];
  schema: z.ZodSchema;
  hasId: boolean;
  hasTimestamps: boolean;
  primaryKey?: string;
}

// =========================================
// ANALISADOR DE SCHEMAS ZOD
// =========================================

export class ZodSchemaAnalyzer {
  /**
   * Analisa um schema Zod e extrai metadados completos
   */
  static analyzeSchema(
    schema: z.ZodSchema,
    entityName: string
  ): EntityMetadata {
    const fields: ZodFieldMetadata[] = [];

    // Tenta extrair campos de um schema de objeto
    if (schema instanceof z.ZodObject) {
      const shape = schema._def.shape();

      for (const [fieldName, fieldSchema] of Object.entries(shape)) {
        const fieldMetadata = this.analyzeField(
          fieldName,
          fieldSchema as z.ZodTypeAny
        );
        fields.push(fieldMetadata);
      }
    }

    // Verifica se tem campos especiais
    const hasId = fields.some((f) => f.name === "id");
    const hasTimestamps = fields.some((f) =>
      ["createdAt", "updatedAt", "created_at", "updated_at"].includes(f.name)
    );

    // Define chave primária
    let primaryKey = "id";
    if (!hasId && fields.length > 0) {
      primaryKey = fields[0].name; // Primeiro campo como PK se não houver id
    }

    return {
      name: entityName,
      fields,
      schema,
      hasId,
      hasTimestamps,
      primaryKey,
    };
  }

  /**
   * Analisa um campo individual do schema Zod
   */
  private static analyzeField(
    fieldName: string,
    fieldSchema: z.ZodTypeAny
  ): ZodFieldMetadata {
    const metadata: ZodFieldMetadata = {
      name: fieldName,
      type: this.getTypeScriptType(fieldSchema),
      zodType: this.getZodTypeName(fieldSchema),
      isOptional: false,
      isNullable: false,
      hasDefault: false,
      validations: [],
      isArray: false,
    };

    // Verifica se é opcional
    if (fieldSchema instanceof z.ZodOptional) {
      metadata.isOptional = true;
      fieldSchema = fieldSchema._def.innerType;
    }

    // Verifica se é nullable
    if (fieldSchema instanceof z.ZodNullable) {
      metadata.isNullable = true;
      fieldSchema = fieldSchema._def.innerType;
    }

    // Verifica se é array
    if (fieldSchema instanceof z.ZodArray) {
      metadata.isArray = true;
      metadata.arrayElementType = this.getTypeScriptType(fieldSchema._def.type);
      fieldSchema = fieldSchema._def.type;
    }

    // Verifica se tem valor padrão
    if (fieldSchema instanceof z.ZodDefault) {
      metadata.hasDefault = true;
      metadata.defaultValue = fieldSchema._def.defaultValue();
      fieldSchema = fieldSchema._def.innerType;
    }

    // Extrai validações específicas
    metadata.validations = this.extractValidations(fieldSchema);

    // Campos aninhados (objetos)
    if (fieldSchema instanceof z.ZodObject) {
      const shape = fieldSchema._def.shape();
      metadata.nestedFields = [];

      for (const [nestedName, nestedSchema] of Object.entries(shape)) {
        const nestedField = this.analyzeField(
          nestedName,
          nestedSchema as z.ZodTypeAny
        );
        metadata.nestedFields.push(nestedField);
      }
    }

    return metadata;
  }

  /**
   * Converte tipo Zod para tipo TypeScript
   */
  private static getTypeScriptType(schema: z.ZodTypeAny): string {
    if (schema instanceof z.ZodString) return "string";
    if (schema instanceof z.ZodNumber) return "number";
    if (schema instanceof z.ZodBoolean) return "boolean";
    if (schema instanceof z.ZodDate) return "Date";
    if (schema instanceof z.ZodArray)
      return `${this.getTypeScriptType(schema._def.type)}[]`;
    if (schema instanceof z.ZodObject) return "object";
    if (schema instanceof z.ZodOptional)
      return this.getTypeScriptType(schema._def.innerType);
    if (schema instanceof z.ZodNullable)
      return this.getTypeScriptType(schema._def.innerType);
    if (schema instanceof z.ZodDefault)
      return this.getTypeScriptType(schema._def.innerType);

    return "any";
  }

  /**
   * Obtém nome do tipo Zod
   */
  private static getZodTypeName(schema: z.ZodTypeAny): string {
    if (schema instanceof z.ZodString) return "z.string()";
    if (schema instanceof z.ZodNumber) return "z.number()";
    if (schema instanceof z.ZodBoolean) return "z.boolean()";
    if (schema instanceof z.ZodDate) return "z.date()";
    if (schema instanceof z.ZodArray)
      return `z.array(${this.getZodTypeName(schema._def.type)})`;
    if (schema instanceof z.ZodObject) return "z.object({...})";
    if (schema instanceof z.ZodOptional)
      return `${this.getZodTypeName(schema._def.innerType)}.optional()`;
    if (schema instanceof z.ZodNullable)
      return `${this.getZodTypeName(schema._def.innerType)}.nullable()`;
    if (schema instanceof z.ZodDefault)
      return `${this.getZodTypeName(schema._def.innerType)}.default(...)`;

    return "z.any()";
  }

  /**
   * Extrai validações específicas do campo
   */
  private static extractValidations(schema: z.ZodTypeAny): ZodValidation[] {
    const validations: ZodValidation[] = [];

    if (schema instanceof z.ZodString) {
      // Validações de string
      if (schema._def.checks) {
        for (const check of schema._def.checks) {
          switch (check.kind) {
            case "min":
              validations.push({ type: "min", value: check.value });
              break;
            case "max":
              validations.push({ type: "max", value: check.value });
              break;
            case "email":
              validations.push({ type: "email" });
              break;
            case "regex":
              validations.push({ type: "regex", value: check.regex.source });
              break;
          }
        }
      }
    }

    if (schema instanceof z.ZodNumber) {
      // Validações de número
      if (schema._def.checks) {
        for (const check of schema._def.checks) {
          switch (check.kind) {
            case "min":
              validations.push({ type: "min", value: check.value });
              break;
            case "max":
              validations.push({ type: "max", value: check.value });
              break;
          }
        }
      }
    }

    return validations;
  }

  /**
   * Converte primeira letra para maiúscula (PascalCase)
   */
  static toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Converte para camelCase
   */
  static toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Converte para kebab-case
   */
  static toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  /**
   * Gera nome da entidade baseado no nome do arquivo
   */
  static extractEntityName(fileName: string): string {
    // Remove extensões e converte
    const baseName = fileName.replace(/\.(ts|js)$/, "");
    return this.toPascalCase(baseName);
  }
}

// =========================================
// UTILITÁRIOS PARA GERAÇÃO DE CÓDIGO
// =========================================

export class CodeGenerator {
  /**
   * Gera interface TypeScript baseada nos metadados
   */
  static generateInterface(metadata: EntityMetadata): string {
    const { name, fields } = metadata;
    const interfaceName = `I${name}`;

    const fieldDeclarations = fields
      .map((field) => {
        let typeStr = field.type;
        if (field.isArray) {
          typeStr = `${field.arrayElementType || "any"}[]`;
        }
        if (field.nestedFields && field.nestedFields.length > 0) {
          // Gera interface aninhada
          const nestedInterface = this.generateNestedInterface(field);
          typeStr = field.name.charAt(0).toUpperCase() + field.name.slice(1);
        }

        const optional = field.isOptional || field.hasDefault ? "?" : "";
        return `  ${field.name}${optional}: ${typeStr};`;
      })
      .join("\n");

    return `export interface ${interfaceName} {
${fieldDeclarations}
}`;
  }

  /**
   * Gera interface aninhada para objetos complexos
   */
  private static generateNestedInterface(field: ZodFieldMetadata): string {
    if (!field.nestedFields) return "";

    const interfaceName =
      field.name.charAt(0).toUpperCase() + field.name.slice(1);
    const fieldDeclarations = field.nestedFields
      .map((nestedField) => {
        let typeStr = nestedField.type;
        const optional =
          nestedField.isOptional || nestedField.hasDefault ? "?" : "";
        return `  ${nestedField.name}${optional}: ${typeStr};`;
      })
      .join("\n");

    return `export interface ${interfaceName} {
${fieldDeclarations}
}`;
  }

  /**
   * Gera DTO baseado nos metadados
   */
  static generateDTO(metadata: EntityMetadata): string {
    const { name, fields } = metadata;
    const dtoName = `${name}DTO`;

    const fieldDeclarations = fields
      .map((field) => {
        let typeStr = field.type;
        if (field.isArray) {
          typeStr = `${field.arrayElementType || "any"}[]`;
        }
        if (field.nestedFields && field.nestedFields.length > 0) {
          typeStr = field.name.charAt(0).toUpperCase() + field.name.slice(1);
        }

        const optional = field.isOptional || field.hasDefault ? "?" : "";
        return `  ${field.name}${optional}: ${typeStr};`;
      })
      .join("\n");

    return `export class ${dtoName} {
${fieldDeclarations}

  constructor(data: Partial<${dtoName}>) {
    Object.assign(this, data);
  }

  /**
   * Valida os dados do DTO
   */
  static validate(data: any): { success: boolean; data?: ${dtoName}; error?: string } {
    try {
      // Validação seria feita com o schema Zod aqui
      return { success: true, data: new ${dtoName}(data) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
    }
  }
}`;
  }

  /**
   * Gera repository baseado nos metadados
   */
  static generateRepository(metadata: EntityMetadata): string {
    const { name, fields, primaryKey } = metadata;
    const repositoryName = `${name}Repository`;
    const interfaceName = `I${name}`;

    // Campos para queries
    const searchableFields = fields.filter(
      (f) =>
        f.type === "string" &&
        !["id", "createdAt", "updatedAt", "created_at", "updated_at"].includes(
          f.name
        )
    );

    return `import { ${interfaceName} } from '../types/interface';
import { ${name}DTO } from '../types/dto';

export interface ${repositoryName}Query {
  ${searchableFields.map((f) => `${f.name}?: string;`).join("\n  ")}
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ${repositoryName}Result<T = ${interfaceName}> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export class ${repositoryName} {
  private storage: Map<string, ${interfaceName}> = new Map();

  /**
   * Cria uma nova entidade
   */
  async create(data: Omit<${interfaceName}, '${
      primaryKey || "id"
    }'>): Promise<${interfaceName}> {
    const id = Date.now().toString();
    const entity: ${interfaceName} = {
      ${primaryKey || "id"}: id,
      ...data,
      ${metadata.hasTimestamps ? "createdAt: new Date().toISOString()," : ""}
      ${metadata.hasTimestamps ? "updatedAt: new Date().toISOString()," : ""}
    } as ${interfaceName};

    this.storage.set(id, entity);
    return entity;
  }

  /**
   * Busca entidade por ID
   */
  async findById(id: string): Promise<${interfaceName} | null> {
    return this.storage.get(id) || null;
  }

  /**
   * Busca entidades com filtros
   */
  async find(query: ${repositoryName}Query = {}): Promise<${repositoryName}Result> {
    let results = Array.from(this.storage.values());

    // Aplicar filtros de busca
    ${searchableFields
      .map(
        (f) => `
    if (query.${f.name}) {
      results = results.filter(entity =>
        entity.${f.name}?.toLowerCase().includes(query.${f.name}!.toLowerCase())
      );
    }`
      )
      .join("")}

    // Ordenação
    if (query.sortBy) {
      results.sort((a, b) => {
        const aVal = (a as any)[query.sortBy!];
        const bVal = (b as any)[query.sortBy!];

        if (aVal < bVal) return query.sortOrder === 'desc' ? 1 : -1;
        if (aVal > bVal) return query.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Paginação
    const limit = query.limit || 10;
    const offset = query.offset || 0;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      data: paginatedResults,
      total: results.length,
      limit,
      offset
    };
  }

  /**
   * Atualiza entidade por ID
   */
  async update(id: string, data: Partial<${interfaceName}>): Promise<${interfaceName} | null> {
    const entity = this.storage.get(id);
    if (!entity) return null;

    const updatedEntity = {
      ...entity,
      ...data,
      ${metadata.hasTimestamps ? "updatedAt: new Date().toISOString()," : ""}
    };

    this.storage.set(id, updatedEntity);
    return updatedEntity;
  }

  /**
   * Remove entidade por ID
   */
  async delete(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }

  /**
   * Conta total de entidades
   */
  async count(query: ${repositoryName}Query = {}): Promise<number> {
    const result = await this.find(query);
    return result.total;
  }
}`;
  }

  /**
   * Gera controller baseado nos metadados
   */
  static generateController(metadata: EntityMetadata): string {
    const { name } = metadata;
    const controllerName = `${name}Controller`;
    const serviceName = `${name}Service`;
    const dtoName = `${name}DTO`;

    return `import { Request, Response } from '../../types';
import { ${serviceName} } from '../services/${ZodSchemaAnalyzer.toCamelCase(
      name
    )}.service';
import { ${dtoName} } from '../types/dto';
import { ApifyCompleteSentinel } from '../../decorators';

export class ${controllerName} {
  constructor(private ${ZodSchemaAnalyzer.toCamelCase(
    serviceName
  )}: ${serviceName}) {}

  /**
   * Lista entidades com paginação
   */
  @ApifyCompleteSentinel
  async list(req: Request, res: Response) {
    try {
      const {
        page = '1',
        limit = '10',
        search,
        sortBy,
        sortOrder = 'asc'
      } = req.query;

      const result = await this.${ZodSchemaAnalyzer.toCamelCase(
        serviceName
      )}.list({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Busca entidade por ID
   */
  @ApifyCompleteSentinel
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const entity = await this.${ZodSchemaAnalyzer.toCamelCase(
        serviceName
      )}.getById(id);

      res.json({
        success: true,
        data: entity
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Cria nova entidade
   */
  @ApifyCompleteSentinel
  async create(req: Request, res: Response) {
    try {
      const entity = await this.${ZodSchemaAnalyzer.toCamelCase(
        serviceName
      )}.create(req.body);

      res.status(201).json({
        success: true,
        data: entity,
        message: '${name} criado com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar ${name}'
      });
    }
  }

  /**
   * Atualiza entidade
   */
  @ApifyCompleteSentinel
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const entity = await this.${ZodSchemaAnalyzer.toCamelCase(
        serviceName
      )}.update(id, req.body);

      res.json({
        success: true,
        data: entity,
        message: '${name} atualizado com sucesso'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrado') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar ${name}'
      });
    }
  }

  /**
   * Remove entidade
   */
  @ApifyCompleteSentinel
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await this.${ZodSchemaAnalyzer.toCamelCase(serviceName)}.delete(id);

      res.status(204).send();
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao remover ${name}'
      });
    }
  }
}`;
  }

  /**
   * Gera routes baseado nos metadados
   */
  static generateRoutes(metadata: EntityMetadata): string {
    const { name } = metadata;
    const controllerName = `${name}Controller`;
    const serviceName = `${name}Service`;
    const repositoryName = `${name}Repository`;

    return `import { Router } from '../../router';
import { ${controllerName} } from '../controllers/${ZodSchemaAnalyzer.toCamelCase(
      name
    )}.controller';
import { ${serviceName} } from '../services/${ZodSchemaAnalyzer.toCamelCase(
      name
    )}.service';
import { ${repositoryName} } from '../database/repository';

// Instâncias dos serviços
const ${ZodSchemaAnalyzer.toCamelCase(
      repositoryName
    )} = new ${repositoryName}();
const ${ZodSchemaAnalyzer.toCamelCase(
      serviceName
    )} = new ${serviceName}(${ZodSchemaAnalyzer.toCamelCase(repositoryName)});
const ${ZodSchemaAnalyzer.toCamelCase(
      controllerName
    )} = new ${controllerName}(${ZodSchemaAnalyzer.toCamelCase(serviceName)});

// Criação do router
const router = new Router();

// Rotas CRUD
router.get('/', ${ZodSchemaAnalyzer.toCamelCase(
      controllerName
    )}.list.bind(${ZodSchemaAnalyzer.toCamelCase(controllerName)}));
router.post('/', ${ZodSchemaAnalyzer.toCamelCase(
      controllerName
    )}.create.bind(${ZodSchemaAnalyzer.toCamelCase(controllerName)}));
router.get('/:id', ${ZodSchemaAnalyzer.toCamelCase(
      controllerName
    )}.getById.bind(${ZodSchemaAnalyzer.toCamelCase(controllerName)}));
router.put('/:id', ${ZodSchemaAnalyzer.toCamelCase(
      controllerName
    )}.update.bind(${ZodSchemaAnalyzer.toCamelCase(controllerName)}));
router.delete('/:id', ${ZodSchemaAnalyzer.toCamelCase(
      controllerName
    )}.delete.bind(${ZodSchemaAnalyzer.toCamelCase(controllerName)}));

export { router as ${ZodSchemaAnalyzer.toCamelCase(name)}Router };
export default router;`;
  }

  /**
   * Gera arquivo de configuração
   */
  static generateConfig(metadata: EntityMetadata): string {
    const { name } = metadata;

    return `/**
 * Configuração do módulo ${name}
 */

export const ${name}Config = {
  // Configurações de cache
  cache: {
    enabled: true,
    ttl: 300, // 5 minutos
    prefix: '${ZodSchemaAnalyzer.toCamelCase(name)}:'
  },

  // Configurações de validação
  validation: {
    strict: true,
    stripUnknown: true
  },

  // Configurações de paginação
  pagination: {
    defaultLimit: 10,
    maxLimit: 100
  },

  // Configurações de rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // requests por windowMs
  }
};

export default ${name}Config;`;
  }

  /**
   * Gera arquivo index do módulo
   */
  static generateIndex(metadata: EntityMetadata): string {
    const { name } = metadata;

    return `/**
 * Módulo ${name} - Auto-gerado
 */

// Exportações principais
export { ${ZodSchemaAnalyzer.toCamelCase(name)}Router } from './routes';
export { ${name}Controller } from './controllers/${ZodSchemaAnalyzer.toCamelCase(
      name
    )}.controller';
export { ${name}Service } from './services/${ZodSchemaAnalyzer.toCamelCase(
      name
    )}.service';
export { ${name}Repository } from './database/repository';
export { ${name}DTO } from './types/dto';
export { I${name} } from './types/interface';
export { default as ${ZodSchemaAnalyzer.toCamelCase(
      name
    )}Config } from './config';

// Re-export do schema Zod original
export { schema } from './database/schema';`;
  }

  /**
   * Gera schema de banco de dados
   */
  static generateDatabaseSchema(metadata: EntityMetadata): string {
    const { name, fields } = metadata;

    // Mapeamento de tipos Zod para tipos de banco
    const getDatabaseType = (type: string): string => {
      switch (type) {
        case "string":
          return "VARCHAR(255)";
        case "number":
          return "DECIMAL(10,2)";
        case "boolean":
          return "BOOLEAN";
        case "Date":
          return "TIMESTAMP";
        default:
          return "TEXT";
      }
    };

    const tableName = ZodSchemaAnalyzer.toCamelCase(name) + "s";
    const columns = fields
      .map((field) => {
        let columnDef = `  \`${field.name}\` ${getDatabaseType(field.type)}`;

        if (field.name === "id") {
          columnDef += " PRIMARY KEY AUTO_INCREMENT";
        } else if (!field.isOptional && !field.hasDefault) {
          columnDef += " NOT NULL";
        }

        if (field.hasDefault && field.defaultValue !== undefined) {
          if (typeof field.defaultValue === "string") {
            columnDef += ` DEFAULT '${field.defaultValue}'`;
          } else {
            columnDef += ` DEFAULT ${field.defaultValue}`;
          }
        }

        return columnDef;
      })
      .join(",\n");

    return `/**
 * Schema de banco de dados para ${name}
 */

// SQL para criação da tabela
export const create${name}TableSQL = \`
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
${columns},
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
\`;

// Índices recomendados
export const ${ZodSchemaAnalyzer.toCamelCase(name)}IndexesSQL = [
${fields
  .filter(
    (f) =>
      f.type === "string" && !["id", "createdAt", "updatedAt"].includes(f.name)
  )
  .map(
    (f) =>
      `  \`CREATE INDEX idx_${tableName}_${f.name} ON \`${tableName}\` (\`${f.name}\`);\``
  )
  .join(",\n")}
].filter(Boolean);

// Re-export do schema Zod
export { schema } from '../${ZodSchemaAnalyzer.toCamelCase(name)}';`;
  }

  /**
   * Gera arquivo de testes
   */
  static generateTests(metadata: EntityMetadata): string {
    const { name } = metadata;
    const controllerName = `${name}Controller`;
    const serviceName = `${name}Service`;
    const repositoryName = `${name}Repository`;

    return `/**
 * Testes para ${name}
 */

import { ${controllerName} } from '../controllers/${ZodSchemaAnalyzer.toCamelCase(
      name
    )}.controller';
import { ${serviceName} } from '../services/${ZodSchemaAnalyzer.toCamelCase(
      name
    )}.service';
import { ${repositoryName} } from '../../database/repository';

describe('${name} Module', () => {
  let repository: ${repositoryName};
  let service: ${serviceName};
  let controller: ${controllerName};

  beforeEach(() => {
    repository = new ${repositoryName}();
    service = new ${serviceName}(repository);
    controller = new ${controllerName}(service);
  });

  describe('${serviceName}', () => {
    it('should create a new ${ZodSchemaAnalyzer.toCamelCase(
      name
    )}', async () => {
      const testData = {
        // Adicionar dados de teste baseados nos campos do schema
      };

      const result = await service.create(testData);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should get ${ZodSchemaAnalyzer.toCamelCase(name)} by id', async () => {
      const testData = {
        // Adicionar dados de teste
      };

      const created = await service.create(testData);
      const found = await service.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should list ${ZodSchemaAnalyzer.toCamelCase(
      name
    )}s with pagination', async () => {
      // Criar alguns registros de teste
      for (let i = 0; i < 5; i++) {
        await service.create({
          // Adicionar dados de teste
        });
      }

      const result = await service.list({ page: 1, limit: 3 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(2);
    });

    it('should update ${ZodSchemaAnalyzer.toCamelCase(name)}', async () => {
      const testData = {
        // Adicionar dados de teste
      };

      const created = await service.create(testData);
      const updateData = {
        // Adicionar dados de atualização
      };

      const updated = await service.update(created.id, updateData);

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
    });

    it('should delete ${ZodSchemaAnalyzer.toCamelCase(name)}', async () => {
      const testData = {
        // Adicionar dados de teste
      };

      const created = await service.create(testData);
      await service.delete(created.id);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('${controllerName}', () => {
    it('should handle GET / - list ${ZodSchemaAnalyzer.toCamelCase(
      name
    )}s', async () => {
      const mockReq = {
        query: {}
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.list(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.any(Object)
        })
      );
    });

    it('should handle POST / - create ${ZodSchemaAnalyzer.toCamelCase(
      name
    )}', async () => {
      const mockReq = {
        body: {
          // Adicionar dados de teste
        }
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('criado')
        })
      );
    });
  });
});`;
  }

  /**
   * Gera service baseado nos metadados
   */
  static generateService(metadata: EntityMetadata): string {
    const { name, fields, primaryKey } = metadata;
    const serviceName = `${name}Service`;
    const repositoryName = `${name}Repository`;
    const interfaceName = `I${name}`;
    const dtoName = `${name}DTO`;

    return `import { ${repositoryName} } from '../database/repository';
import { ${interfaceName} } from '../types/interface';
import { ${dtoName} } from '../types/dto';

export interface ${serviceName}CreateInput {
${fields
  .filter((f) => f.name !== (primaryKey || "id"))
  .map((f) => {
    const optional = f.isOptional || f.hasDefault ? "?" : "";
    return `  ${f.name}${optional}: ${f.type}${f.isArray ? "[]" : ""};`;
  })
  .join("\n")}
}

export interface ${serviceName}UpdateInput {
${fields
  .filter((f) => f.name !== (primaryKey || "id"))
  .map((f) => {
    return `  ${f.name}?: ${f.type}${f.isArray ? "[]" : ""};`;
  })
  .join("\n")}
}

export class ${serviceName} {
  constructor(private repository: ${repositoryName}) {}

  /**
   * Cria uma nova entidade
   */
  async create(input: ${serviceName}CreateInput): Promise<${interfaceName}> {
    // Validação de entrada
    this.validateCreateInput(input);

    // Regras de negócio
    const processedInput = await this.processCreateInput(input);

    // Persistir
    return this.repository.create(processedInput);
  }

  /**
   * Busca entidade por ID
   */
  async getById(id: string): Promise<${interfaceName} | null> {
    if (!id) {
      throw new Error('ID é obrigatório');
    }

    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new Error('${name} não encontrado');
    }

    return entity;
  }

  /**
   * Lista entidades com paginação e filtros
   */
  async list(options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    data: ${interfaceName}[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const offset = (page - 1) * limit;

    const result = await this.repository.find({
      limit,
      offset,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      // Adicionar campos de busca conforme necessário
    });

    return {
      data: result.data,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  }

  /**
   * Atualiza entidade
   */
  async update(id: string, input: ${serviceName}UpdateInput): Promise<${interfaceName}> {
    if (!id) {
      throw new Error('ID é obrigatório');
    }

    // Verificar se entidade existe
    await this.getById(id);

    // Validação de entrada
    this.validateUpdateInput(input);

    // Regras de negócio
    const processedInput = await this.processUpdateInput(input);

    // Atualizar
    const updatedEntity = await this.repository.update(id, processedInput);
    if (!updatedEntity) {
      throw new Error('Falha ao atualizar ${name}');
    }

    return updatedEntity;
  }

  /**
   * Remove entidade
   */
  async delete(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID é obrigatório');
    }

    // Verificar se entidade existe
    await this.getById(id);

    // Regras de negócio antes da exclusão
    await this.beforeDelete(id);

    // Remover
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error('Falha ao remover ${name}');
    }
  }

  // ========== MÉTODOS PRIVADOS ==========

  private validateCreateInput(input: ${serviceName}CreateInput): void {
    if (!input) {
      throw new Error('Dados de entrada são obrigatórios');
    }

    // Validações específicas podem ser adicionadas aqui
    ${fields
      .filter(
        (f) => !f.isOptional && !f.hasDefault && f.name !== (primaryKey || "id")
      )
      .map((f) => {
        if (
          f.validations.some(
            (v) => v.type === "min" && typeof v.value === "number"
          )
        ) {
          const min = f.validations.find((v) => v.type === "min")?.value;
          return `if (input.${f.name} && input.${f.name}.length < ${min}) {
      throw new Error('${f.name} deve ter pelo menos ${min} caracteres');
    }`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n    ")}
  }

  private validateUpdateInput(input: ${serviceName}UpdateInput): void {
    // Validações para update podem ser menos rigorosas
  }

  private async processCreateInput(input: ${serviceName}CreateInput): Promise<Omit<${interfaceName}, '${
      primaryKey || "id"
    }'>> {
    // Processamentos específicos antes da criação
    return input;
  }

  private async processUpdateInput(input: ${serviceName}UpdateInput): Promise<Partial<${interfaceName}>> {
    // Processamentos específicos antes da atualização
    return input;
  }

  private async beforeDelete(id: string): Promise<void> {
    // Regras de negócio antes da exclusão
    // Ex: verificar dependências, etc.
  }
}`;
  }
}
