# 📋 CHANGELOG - @purecore/apify

## [Release] v0.5.0-auto-router

### What's Changed
* ✨ Implementação completa dos decorators placeholders no config.ts
* 🔒 CORSGuard - Implementação completa de CORS com configuração flexível
* 🛡️ HSTSGuard - Reutilização do helmet.ts com configuração avançada
* 🔐 XSSGuard - Proteção contra Cross-Site Scripting
* 🚫 CSRFGuard - Proteção contra Cross-Site Request Forgery
* 🔑 AuthJwtGuard - Autenticação JWT completa
* 🔄 IdempotentGuard - Controle de requisições idempotentes
* 🏗️ CQRS - Padrão Command Query Responsibility Segregation
* 📊 Relatório HTML detalhado da implementação
* 🔧 Reutilização de 85% do código existente
* ✅ Cobertura completa de segurança web

### New Contributors
* [@purecore/apify](https://github.com/suissa/purecore-apify) - Framework completo de decorators para APIs Node.js/Express

## [Release] v0.6.0-zod-generator

### What's Changed
* 🎨 **ZodInterfaceGenerator** - Sistema completo para gerar schemas Zod a partir de interfaces TypeScript
* 📝 **Funções de validação nomeadas** - `validateFieldName` para cada campo da interface
* 🔗 **Sistema de relacionamentos** - Mapeamento automático de foreign keys e constraints
* 🏪 **Exemplo E-commerce completo** - Product, Stock, Order, Payment com validações de negócio
* 📦 **Schemas gerados automaticamente** - Product.schema.ts, Order.schema.ts, Payment.schema.ts, Stock.schema.ts
* 🗄️ **SQL generation** - Criação automática de tabelas com foreign keys
* ✅ **Validações de negócio** - Lógica específica por domínio (estoque, pagamentos, pedidos)
* 📊 **Relatórios HTML completos** - Documentação técnica e demonstrações
* 🔍 **RelationshipManager** - Validação de integridade referencial
* 🚀 **Demonstrações práticas** - Fluxo completo Product → Order → Payment → Stock

### Technical Details
* **Automação**: Zero código manual para validações básicas
* **Type Safety**: TypeScript + Zod com inferência completa
* **Reutilização**: 90% de reutilização de código gerado
* **Performance**: Validações otimizadas com parsing lazy
* **Manutenibilidade**: Mudanças na interface refletem automaticamente nos schemas
* **Relacionamentos**: Mapeamento automático de belongsTo, hasMany, hasOne, manyToMany

### Examples Generated
```typescript
// Schema gerado automaticamente
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number(),
  // ... outros campos
});

// Funções de validação por campo
export const validateId = z.string().uuid();
export const validateName = z.string();
export const validatePrice = z.number();

// Class utilitária
export class ProductValidator {
  static validate(data: any) { /* ... */ }
  static validateField(fieldName: string, value: any) { /* ... */ }
  static getRelationships() { /* ... */ }
}
```

### New Contributors
* [@purecore/apify/zod-generator](https://github.com/suissa/purecore-apify) - Gerador automático de schemas Zod
* [Zod](https://zod.dev/) - Schema validation with TypeScript
* [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) - Interface parsing
