/**
 * Gerador de Schemas Zod baseado em Interfaces TypeScript
 * Sistema completo para validação de dados com funções nomeadas por campo
 *
 * Funcionalidades:
 * - Análise de interfaces TypeScript
 * - Geração automática de schemas Zod
 * - Funções de validação individuais por campo
 * - Sistema de relações entre entidades
 * - Exemplos completos: Product, Stock, Order, Payment
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";

// =========================================
// TIPOS E INTERFACES
// =========================================

export interface FieldValidation {
  fieldName: string;
  fieldType: string;
  isOptional: boolean;
  isArray: boolean;
  zodSchema: z.ZodTypeAny;
  validateFunction: string;
}

export interface InterfaceMetadata {
  name: string;
  fields: FieldValidation[];
  relationships: Relationship[];
  zodSchema: string;
  validationFunctions: string;
  fullSchema: string;
}

export interface Relationship {
  type: "belongsTo" | "hasMany" | "hasOne" | "manyToMany";
  targetEntity: string;
  fieldName: string;
  foreignKey?: string;
  inverseField?: string;
}

// =========================================
// GERADOR DE SCHEMAS ZOD
// =========================================

export class ZodInterfaceGenerator {
  private relationships: Map<string, Relationship[]> = new Map();

  /**
   * Analisa uma interface TypeScript e gera schema Zod
   */
  parseInterface(interfaceCode: string): InterfaceMetadata {
    const lines = interfaceCode.split("\n");
    const interfaceMatch = interfaceCode.match(/interface\s+(\w+)/);

    if (!interfaceMatch || !interfaceMatch[1]) {
      throw new Error("Interface não encontrada no código");
    }

    const interfaceName: string = interfaceMatch[1];
    const fields: FieldValidation[] = [];
    const relationships: Relationship[] = [];

    // Regex para campos da interface
    const fieldRegex = /^\s*(\w+)\??:\s*([^;]+);/gm;

    let match;
    while ((match = fieldRegex.exec(interfaceCode)) !== null) {
      const [, fieldName, fieldType] = match;
      if (!fieldName || !fieldType) continue;

      const isOptional = fieldName.endsWith("?");
      const cleanFieldName = fieldName.replace("?", "");

      // Detecta se é array
      const isArray = fieldType.trim().endsWith("[]");
      const cleanType = fieldType.trim().replace("[]", "");

      // Gera schema Zod baseado no tipo
      const zodSchema = this.generateZodSchema(cleanType, isOptional, isArray);
      const validateFunction = this.generateValidateFunction(
        cleanFieldName,
        cleanType,
        isOptional,
        isArray
      );

      fields.push({
        fieldName: cleanFieldName,
        fieldType: cleanType,
        isOptional,
        isArray,
        zodSchema,
        validateFunction,
      });

      // Detecta relacionamentos
      if (this.isRelationshipType(cleanType)) {
        relationships.push({
          type: this.detectRelationshipType(cleanType, isArray),
          targetEntity: cleanType.replace(/\[?\]?/g, ""),
          fieldName: cleanFieldName,
          foreignKey: `${cleanFieldName}Id`,
        });
      }
    }

    // Gera código completo
    const zodSchema = this.generateFullZodSchema(interfaceName, fields);
    const validationFunctions = this.generateValidationFunctions(
      interfaceName,
      fields
    );
    const fullSchema = this.generateCompleteSchema(
      interfaceName,
      fields,
      relationships
    );

    return {
      name: interfaceName,
      fields,
      relationships,
      zodSchema,
      validationFunctions,
      fullSchema,
    };
  }

  /**
   * Gera schema Zod para um tipo específico
   */
  private generateZodSchema(
    type: string,
    isOptional: boolean,
    isArray: boolean
  ): z.ZodTypeAny {
    let schema: z.ZodTypeAny;

    switch (type.toLowerCase()) {
      case "string":
        schema = z.string();
        break;
      case "number":
        schema = z.number();
        break;
      case "boolean":
        schema = z.boolean();
        break;
      case "date":
        schema = z.date();
        break;
      case "uuid":
        schema = z.string().uuid();
        break;
      case "email":
        schema = z.string().email();
        break;
      case "url":
        schema = z.string().url();
        break;
      default:
        // Para tipos customizados (relacionamentos), usa string por enquanto
        if (this.isRelationshipType(type)) {
          schema = z.string().uuid();
        } else {
          schema = z.any();
        }
    }

    if (isArray) {
      schema = z.array(schema);
    }

    if (!isOptional) {
      schema = schema;
    }

    return schema;
  }

  /**
   * Gera função de validação para um campo específico
   */
  private generateValidateFunction(
    fieldName: string,
    type: string,
    isOptional: boolean,
    isArray: boolean
  ): string {
    const functionName = `validate${
      fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
    }`;

    let schemaCode = "";

    switch (type.toLowerCase()) {
      case "string":
        schemaCode = `z.string()${!isOptional ? "" : ".optional()"}`;
        break;
      case "number":
        schemaCode = `z.number()${!isOptional ? "" : ".optional()"}`;
        break;
      case "boolean":
        schemaCode = `z.boolean()${!isOptional ? "" : ".optional()"}`;
        break;
      case "date":
        schemaCode = `z.date()${!isOptional ? "" : ".optional()"}`;
        break;
      case "uuid":
        schemaCode = `z.string().uuid()${!isOptional ? "" : ".optional()"}`;
        break;
      case "email":
        schemaCode = `z.string().email()${!isOptional ? "" : ".optional()"}`;
        break;
      case "url":
        schemaCode = `z.string().url()${!isOptional ? "" : ".optional()"}`;
        break;
      default:
        if (this.isRelationshipType(type)) {
          schemaCode = `z.string().uuid()${!isOptional ? "" : ".optional()"}`;
        } else {
          schemaCode = `z.any()${!isOptional ? "" : ".optional()"}`;
        }
    }

    if (isArray) {
      schemaCode = `z.array(${schemaCode})`;
    }

    return `
export const ${functionName} = ${schemaCode};
export const ${functionName}Validator = (value: any) => ${functionName}.safeParse(value);`;
  }

  /**
   * Gera schema Zod completo para a interface
   */
  private generateFullZodSchema(
    interfaceName: string,
    fields: FieldValidation[]
  ): string {
    const schemaFields = fields
      .map((field) => {
        let fieldSchema = "";

        switch (field.fieldType.toLowerCase()) {
          case "string":
            fieldSchema = "z.string()";
            break;
          case "number":
            fieldSchema = "z.number()";
            break;
          case "boolean":
            fieldSchema = "z.boolean()";
            break;
          case "date":
            fieldSchema = "z.date()";
            break;
          case "uuid":
            fieldSchema = "z.string().uuid()";
            break;
          case "email":
            fieldSchema = "z.string().email()";
            break;
          case "url":
            fieldSchema = "z.string().url()";
            break;
          default:
            if (this.isRelationshipType(field.fieldType)) {
              fieldSchema = "z.string().uuid()";
            } else {
              fieldSchema = "z.any()";
            }
        }

        if (field.isArray) {
          fieldSchema = `z.array(${fieldSchema})`;
        }

        if (field.isOptional) {
          fieldSchema += ".optional()";
        }

        return `  ${field.fieldName}: ${fieldSchema},`;
      })
      .join("\n");

    return `
export const ${interfaceName}Schema = z.object({
${schemaFields}
});

export type ${interfaceName} = z.infer<typeof ${interfaceName}Schema>;`;
  }

  /**
   * Gera todas as funções de validação
   */
  private generateValidationFunctions(
    interfaceName: string,
    fields: FieldValidation[]
  ): string {
    const functions = fields.map((field) => field.validateFunction).join("\n");

    return `
// =========================================
// VALIDAÇÃO POR CAMPO - ${interfaceName}
// =========================================
${functions}

// =========================================
// VALIDAÇÃO COMPLETA
// =========================================

export const validate${interfaceName} = ${interfaceName}Schema;
export const validate${interfaceName}Safe = (data: any) => ${interfaceName}Schema.safeParse(data);
export const validate${interfaceName}Strict = (data: any) => ${interfaceName}Schema.parse(data);`;
  }

  /**
   * Gera schema completo com relacionamentos
   */
  private generateCompleteSchema(
    interfaceName: string,
    fields: FieldValidation[],
    relationships: Relationship[]
  ): string {
    const zodSchema = this.generateFullZodSchema(interfaceName, fields);
    const validationFunctions = this.generateValidationFunctions(
      interfaceName,
      fields
    );

    const relationshipsCode =
      relationships.length > 0
        ? `
// =========================================
// RELACIONAMENTOS - ${interfaceName}
// =========================================

export const ${interfaceName}Relationships = {
${relationships
  .map(
    (rel) => `  ${rel.fieldName}: {
    type: '${rel.type}' as const,
    targetEntity: '${rel.targetEntity}',
    foreignKey: '${rel.foreignKey}',
    inverseField: '${rel.inverseField || "N/A"}'
  },`
  )
  .join("\n")}
} as const;
`
        : "";

    return `${zodSchema}${validationFunctions}${relationshipsCode}`;
  }

  /**
   * Verifica se um tipo é um relacionamento
   */
  private isRelationshipType(type: string): boolean {
    // Tipos que consideramos como relacionamentos
    const relationshipTypes = [
      "Product",
      "Stock",
      "Order",
      "Payment",
      "User",
      "Customer",
      "Category",
    ];
    return relationshipTypes.includes(type) || type.endsWith("[]");
  }

  /**
   * Detecta o tipo de relacionamento
   */
  private detectRelationshipType(
    type: string,
    isArray: boolean
  ): Relationship["type"] {
    if (isArray) {
      return type.toLowerCase().includes("order") ? "hasMany" : "hasMany";
    } else {
      return type.toLowerCase().includes("order") ? "belongsTo" : "belongsTo";
    }
  }

  /**
   * Gera arquivo completo com schema Zod
   */
  generateFile(interfaceCode: string, outputPath: string): void {
    const metadata = this.parseInterface(interfaceCode);

    const fileContent = `/**
 * Schema Zod gerado automaticamente para ${metadata.name}
 * Gerado em: ${new Date().toISOString()}
 */

import { z } from 'zod';

${metadata.fullSchema}

// =========================================
// UTILITÁRIOS DE VALIDAÇÃO
// =========================================

export class ${metadata.name}Validator {
  static validate(data: any) {
    return validate${metadata.name}Safe(data);
  }

  static validateStrict(data: any) {
    return validate${metadata.name}Strict(data);
  }

  static validateField(fieldName: string, value: any) {
    const fieldValidators: Record<string, z.ZodTypeAny> = {
${metadata.fields
  .map(
    (field) =>
      `      ${field.fieldName}: validate${
        field.fieldName.charAt(0).toUpperCase() + field.fieldName.slice(1)
      },`
  )
  .join("\n")}
    };

    const validator = fieldValidators[fieldName];
    return validator ? validator.safeParse(value) : { success: false, error: new Error('Campo não encontrado') };
  }

  static getRelationships() {
    return ${metadata.name}Relationships;
  }

  static getSchema() {
    return ${metadata.name}Schema;
  }
}

export default ${metadata.name}Validator;
`;

    // Garante que o diretório existe
    const dir = resolve(outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Escreve o arquivo
    const filePath = join(dir, `${metadata.name.toLowerCase()}.schema.ts`);
    writeFileSync(filePath, fileContent, "utf-8");

    console.log(`✅ Schema Zod gerado: ${filePath}`);
  }
}

// =========================================
// EXEMPLOS COMPLETOS - PRODUCT, STOCK, ORDER, PAYMENT
// =========================================

export const EXAMPLE_INTERFACES = {
  Product: `
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sku: string;
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}`,

  Stock: `
interface Stock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minThreshold: number;
  maxThreshold: number;
  location: string;
  lastUpdated: Date;
  supplier?: string;
}`,

  Order: `
interface Order {
  id: string;
  customerId: string;
  products: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentId?: string;
  shippingAddress: Address;
  billingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
}

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
}

interface Address {
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';`,

  Payment: `
interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  gatewayResponse?: any;
  installments?: number;
  installmentValue?: number;
  createdAt: Date;
  processedAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
}

type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'bank_transfer';
type PaymentStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'refunded' | 'cancelled';`,
};

// =========================================
// SISTEMA DE RELACIONAMENTOS
// =========================================

export class RelationshipManager {
  private relationships: Map<string, Relationship[]> = new Map();

  /**
   * Registra relacionamentos entre entidades
   */
  registerRelationships(
    entityName: string,
    relationships: Relationship[]
  ): void {
    this.relationships.set(entityName, relationships);
  }

  /**
   * Obtém relacionamentos de uma entidade
   */
  getRelationships(entityName: string): Relationship[] {
    return this.relationships.get(entityName) || [];
  }

  /**
   * Valida relacionamentos entre entidades
   */
  validateRelationships(data: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const [entityName, entityData] of Object.entries(data)) {
      const relationships = this.getRelationships(entityName);

      for (const rel of relationships) {
        if (rel.type === "belongsTo") {
          const foreignKeyValue = entityData[rel.foreignKey!];
          if (!foreignKeyValue) {
            errors.push(
              `${entityName}.${rel.foreignKey} é obrigatório para relacionamento belongsTo`
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gera SQL de criação das tabelas com chaves estrangeiras
   */
  generateSQLTables(): string {
    const tables: string[] = [];

    for (const [entityName, relationships] of this.relationships.entries()) {
      const foreignKeys = relationships
        .filter((rel) => rel.foreignKey)
        .map(
          (rel) =>
            `  FOREIGN KEY (${rel.foreignKey}) REFERENCES ${rel.targetEntity}(id)`
        )
        .join(",\n");

      const tableSQL = `
CREATE TABLE ${entityName.toLowerCase()} (
  id VARCHAR(36) PRIMARY KEY,
  -- outros campos aqui
${foreignKeys ? foreignKeys + "," : ""}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);`;

      tables.push(tableSQL);
    }

    return tables.join("\n");
  }

  /**
   * Gera diagramas de relacionamento em texto
   */
  generateRelationshipDiagram(): string {
    let diagram = "📊 DIAGRAMA DE RELACIONAMENTOS\n\n";

    for (const [entityName, relationships] of this.relationships.entries()) {
      diagram += `${entityName}\n`;

      for (const rel of relationships) {
        const arrow =
          rel.type === "belongsTo"
            ? "←"
            : rel.type === "hasMany"
            ? "→"
            : rel.type === "hasOne"
            ? "―"
            : "↔";

        diagram += `  ${arrow} ${rel.targetEntity} (${rel.fieldName})\n`;
      }

      diagram += "\n";
    }

    return diagram;
  }
}

// =========================================
// GERADOR PRINCIPAL
// =========================================

export class ZodSchemaGenerator {
  private generator = new ZodInterfaceGenerator();
  private relationshipManager = new RelationshipManager();

  /**
   * Gera schemas completos para múltiplas interfaces
   */
  generateSchemas(
    interfaces: Record<string, string>,
    outputPath: string
  ): void {
    console.log(
      "🚀 Gerando schemas Zod a partir de interfaces TypeScript...\n"
    );

    for (const [entityName, interfaceCode] of Object.entries(interfaces)) {
      console.log(`📝 Processando interface: ${entityName}`);

      try {
        this.generator.generateFile(interfaceCode, outputPath);

        // Registra relacionamentos
        const metadata = this.generator.parseInterface(interfaceCode);
        this.relationshipManager.registerRelationships(
          entityName,
          metadata.relationships
        );

        console.log(`✅ Schema gerado para ${entityName}`);
      } catch (error) {
        console.error(`❌ Erro ao gerar schema para ${entityName}:`, error);
      }
    }

    // Gera arquivo de relacionamentos
    this.generateRelationshipsFile(outputPath);

    console.log("\n🎉 Todos os schemas foram gerados com sucesso!");
    console.log(`📂 Arquivos salvos em: ${outputPath}`);
  }

  /**
   * Gera arquivo com mapeamento de relacionamentos
   */
  private generateRelationshipsFile(outputPath: string): void {
    const relationshipCode = `
/**
 * Mapeamento de Relacionamentos entre Entidades
 * Gerado automaticamente em: ${new Date().toISOString()}
 */

import { RelationshipManager } from './zod-interface-generator';

export const relationshipManager = new RelationshipManager();

// Registrar relacionamentos automaticamente
${Array.from(this.relationshipManager["relationships"].entries())
  .map(
    ([entityName, relationships]) =>
      `relationshipManager.registerRelationships('${entityName}', ${JSON.stringify(
        relationships,
        null,
        2
      )});`
  )
  .join("\n")}

// Diagrama de relacionamentos
export const relationshipDiagram = \`
${this.relationshipManager.generateRelationshipDiagram()}
\`;

// Validação de relacionamentos
export const validateEntityRelationships = relationshipManager.validateRelationships.bind(relationshipManager);

// SQL das tabelas
export const generateTablesSQL = relationshipManager.generateSQLTables.bind(relationshipManager);

export default relationshipManager;
`;

    const filePath = join(outputPath, "relationships.ts");
    writeFileSync(filePath, relationshipCode, "utf-8");
    console.log(`✅ Arquivo de relacionamentos gerado: ${filePath}`);
  }

  /**
   * Demonstra uso completo com exemplos
   */
  demonstrateUsage(): void {
    console.log("\n🎯 DEMONSTRAÇÃO DE USO\n");

    // Simula dados de exemplo
    const sampleData = {
      Product: {
        id: "prod-123",
        name: "Notebook Dell",
        description: "Notebook de alta performance",
        price: 3500.0,
        category: "eletronicos",
        sku: "NOTE-DELL-001",
        tags: ["notebook", "dell", "gamer"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      Stock: {
        id: "stock-456",
        productId: "prod-123",
        warehouseId: "wh-001",
        quantity: 50,
        reservedQuantity: 5,
        availableQuantity: 45,
        minThreshold: 10,
        maxThreshold: 100,
        location: "Prateleira A-12",
        lastUpdated: new Date(),
      },

      Order: {
        id: "order-789",
        customerId: "cust-001",
        products: [
          {
            productId: "prod-123",
            quantity: 2,
            unitPrice: 3500.0,
            totalPrice: 7000.0,
          },
        ],
        totalAmount: 7000.0,
        status: "confirmed" as const,
        shippingAddress: {
          street: "Rua das Flores",
          number: "123",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-567",
          country: "Brasil",
        },
        billingAddress: {
          street: "Rua das Flores",
          number: "123",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-567",
          country: "Brasil",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      Payment: {
        id: "pay-999",
        orderId: "order-789",
        customerId: "cust-001",
        amount: 7000.0,
        currency: "BRL",
        method: "credit_card" as const,
        status: "approved" as const,
        transactionId: "txn-123456",
        installments: 3,
        installmentValue: 2333.33,
        createdAt: new Date(),
        processedAt: new Date(),
      },
    };

    console.log("📦 Dados de exemplo criados");
    console.log("🔗 Relacionamentos: Product → Stock → Order → Payment");

    // Valida relacionamentos
    const validation =
      this.relationshipManager.validateRelationships(sampleData);
    if (validation.valid) {
      console.log("✅ Relacionamentos válidos");
    } else {
      console.log("❌ Problemas nos relacionamentos:", validation.errors);
    }

    console.log("\n📊 Diagrama de Relacionamentos:");
    console.log(this.relationshipManager.generateRelationshipDiagram());

    console.log("\n🗄️ SQL das Tabelas:");
    console.log(this.relationshipManager.generateSQLTables());
  }
}

// =========================================
// FUNÇÃO PRINCIPAL DE DEMONSTRAÇÃO
// =========================================

export function demonstrateZodSchemaGeneration(): void {
  console.log("🎨 DEMONSTRAÇÃO DO GERADOR DE SCHEMAS ZOD\n");

  const generator = new ZodSchemaGenerator();

  // Demonstra uso
  generator.demonstrateUsage();

  // Gera schemas (opcional - desabilitado por padrão)
  console.log("\n💡 Para gerar os arquivos, execute:");
  console.log(
    'generator.generateSchemas(EXAMPLE_INTERFACES, "./generated-schemas")'
  );
}

// Executa demonstração se for arquivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateZodSchemaGeneration();
}

export default ZodSchemaGenerator;
