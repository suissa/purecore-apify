# 🎨 Gerador de Schemas Zod - Interfaces TypeScript

Sistema completo para gerar schemas Zod automaticamente a partir de interfaces TypeScript, com funções de validação nomeadas por campo e mapeamento de relacionamentos entre entidades.

## 📋 Funcionalidades

- ✅ **Análise automática** de interfaces TypeScript
- ✅ **Geração automática** de schemas Zod
- ✅ **Funções de validação** com nomes dos campos (`validateFieldName`)
- ✅ **Mapeamento de relacionamentos** entre entidades
- ✅ **Validações de negócio** específicas
- ✅ **Exemplo completo**: Product → Order → Payment → Stock

## 🚀 Como Usar

### 1. Criar Interfaces TypeScript

```typescript
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
}

interface Order {
  id: string;
  customerId: string;
  orderNumber: string;
  products: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentId?: string;
  shippingAddress: Address;
  billingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Gerar Schemas Zod

```typescript
import { ZodInterfaceGenerator } from './src/zod-interface-generator.js';

const generator = new ZodInterfaceGenerator();

// Interfaces a serem processadas
const interfaces = {
  Product: `interface Product { /* ... */ }`,
  Order: `interface Order { /* ... */ }`,
  Payment: `interface Payment { /* ... */ }`,
  Stock: `interface Stock { /* ... */ }`
};

// Gera schemas automaticamente
generator.generateSchemas(interfaces, './generated-schemas');
```

### 3. Usar os Schemas Gerados

```typescript
import { ProductValidator, validateProductName, validateProductPrice } from './generated-schemas/product.schema.js';

// Validação completa
const productData = { /* dados do produto */ };
const validation = ProductValidator.validate(productData);

// Validação por campo individual
const nameValidation = validateProductName('Nome do Produto');
const priceValidation = validateProductPrice(99.99);

// Validação específica de campo
const fieldValidation = ProductValidator.validateField('price', 99.99);
```

## 📊 Estrutura Gerada

### Schema Zod Completo
```typescript
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  // ... outros campos
});

export type Product = z.infer<typeof ProductSchema>;
```

### Funções de Validação por Campo
```typescript
export const validateId = z.string().uuid();
export const validateName = z.string();
export const validatePrice = z.number();
// ... uma função para cada campo
```

### Validações Completas
```typescript
export const validateProduct = ProductSchema;
export const validateProductSafe = (data: any) => ProductSchema.safeParse(data);
export const validateProductStrict = (data: any) => ProductSchema.parse(data);
```

### Utilitários de Validação
```typescript
export class ProductValidator {
  static validate(data: any) {
    return validateProductSafe(data);
  }

  static validateField(fieldName: string, value: any) {
    // Validação específica por campo
  }

  static getRelationships() {
    return ProductRelationships;
  }
}
```

## 🔗 Relacionamentos Entre Entidades

### Mapeamento Automático
```typescript
export const ProductRelationships = {
  stock: {
    type: 'hasMany',
    targetEntity: 'Stock',
    foreignKey: 'productId',
    inverseField: 'product'
  },
  orders: {
    type: 'manyToMany',
    targetEntity: 'Order',
    foreignKey: 'productId',
    inverseField: 'products'
  }
};
```

### Exemplo Completo: Product → Order → Payment → Stock

```
📦 Product
   ├── 📊 Stock (hasMany)
   └── 🛒 Order (manyToMany via OrderItem)

🛒 Order
   ├── 💳 Payment (hasOne)
   └── 👤 Customer (belongsTo)

💳 Payment
   ├── 🛒 Order (belongsTo)
   └── 👤 Customer (belongsTo)

📊 Stock
   └── 📦 Product (belongsTo)
```

## 🎯 Demonstração Completa

Execute a demonstração completa:

```bash
# Via npm/tsx
npx tsx examples/complete-ecommerce-validation.ts

# Ou via Node.js
node run-generate-schemas.js
```

### Resultado da Demonstração

```
🎨 DEMONSTRAÇÃO COMPLETA - VALIDAÇÃO DE E-COMMERCE
================================================

🔍 VALIDAÇÃO INDIVIDUAL POR ENTIDADE

📦 Validando Product...
   ✅ Product válido
   📊 Campos validados: 13

📊 Validando Stock...
   ✅ Stock válido
   📊 Quantidade disponível correta: ✅
   📊 Precisa repor estoque: ✅ NÃO

🛒 Validando Order...
   ✅ Order válido
   📊 Total do pedido correto: ✅

💳 Validando Payment...
   ✅ Payment válido
   📊 Valor das parcelas correto: ✅
   📊 Pode ser reembolsado: ✅ SIM

🔗 VALIDAÇÃO DE RELACIONAMENTOS

Product → Stock: ✅ Válido
Product → Order (via OrderItem): ✅ Válido
Order → Payment: ✅ Válido
Order → Payment (valor): ✅ Válido

🎯 RESULTADO GERAL: ✅ Todos os relacionamentos válidos
```

## 🏗️ Arquitetura do Gerador

### ZodInterfaceGenerator
- **parseInterface()**: Analisa interfaces TypeScript
- **generateZodSchema()**: Cria schemas Zod por tipo
- **generateValidateFunction()**: Cria funções `validateFieldName`
- **generateCompleteSchema()**: Gera arquivo completo

### RelationshipManager
- **registerRelationships()**: Registra relacionamentos
- **validateRelationships()**: Valida integridade
- **generateSQLTables()**: Gera SQL com FKs

## 📁 Arquivos de Exemplo

- `examples/product.schema.ts` - Schema do Produto
- `examples/order.schema.ts` - Schema do Pedido
- `examples/payment.schema.ts` - Schema do Pagamento
- `examples/stock.schema.ts` - Schema do Estoque
- `examples/complete-ecommerce-validation.ts` - Demonstração completa

## 🔧 Scripts Disponíveis

```json
{
  "scripts": {
    "generate:schemas": "tsx generate-zod-schemas.ts",
    "demo:schemas": "tsx examples/zod-schema-generation.ts"
  }
}
```

## 💡 Benefícios

- **Automação Total**: Zero código manual para validações básicas
- **Type Safety**: Validações tipadas em TypeScript
- **Reutilização**: Funções de validação compartilháveis
- **Manutenibilidade**: Mudanças na interface refletem automaticamente nos schemas
- **Performance**: Validações otimizadas com Zod
- **Relacionamentos**: Mapeamento automático de FKs e relacionamentos

## 🎨 Exemplo de Uso Real

```typescript
// 1. Gera schemas automaticamente
const interfaces = {
  User: `interface User { id: string; email: string; name: string; }`,
  Post: `interface Post { id: string; userId: string; title: string; content: string; }`
};

// 2. Executa geração
generator.generateSchemas(interfaces, './schemas');

// 3. Usa os schemas gerados
import { UserValidator, validateUserEmail } from './schemas/user.schema.js';

const user = { id: '123', email: 'user@example.com', name: 'John' };
const emailValidation = validateUserEmail('user@example.com'); // ✅
const userValidation = UserValidator.validate(user); // ✅
```

---

**Gerado automaticamente pelo ZodInterfaceGenerator - PureCore Apify Framework** 🚀
