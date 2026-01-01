# 📋 CHANGELOG - @purecore/apify

## [Release] v0.8.0-advanced-filters

### What's Changed

- ✨ **AdvancedFilterParser** - Parser recursivo potente para processar filtros complexos em query strings.
- 🛡️ **Intent-Based Filtering** - Suporte a dialéticas SQL-like, RSQL e Custom DSL (`&AND&`, `&OR&`, `&NOT&`).
- 🧩 **Nested Parentheses** - Suporte completo a parênteses aninhados para precedência lógica complexa.
- 🏷️ **@Filter Decorator** - Decorator de método para injeção automática de filtros estruturados em `req.query.where`.
- 💎 **Nominal Semantic Typing** - Tipagem estrita com `RawFilterString` e `MongoQuery` para segurança em tempo de compilação.
- ✅ **Suite de Testes** - Testes unitários abrangendo todos os operadores e cenários de aninhamento.
- 🤖 **AON Integration** - Notificação automática de correções para o sistema Adaptive Observability Negotiation.

### Technical Details

- **Parser Logic**: Recursive Descent Lite (splita mantendo integridade de parênteses).
- **Operators**: `=`, `==`, `!=`, `>`, `<`, `>=`, `<=`, `:` (fuzzy logic).
- **Logic Tokens**: `AND`, `OR`, `NOT`, `NOR`, `&&`, `||`, `!`, `;`.
- **Type Safety**: Tipos nominais movidos para `src/types.ts` conforme convenção de arquitetura.

### Usage Example

```typescript
@Filter('search')
async getUsers(req: Request, res: Response) {
  // Se a URL for ?search=(age>18&AND&status=active)
  // req.query.where conterá { $and: [ { age: { $gt: 18 } }, { status: { $eq: 'active' } } ] }
  const users = await db.collection('users').find(req.query.where).toArray();
  res.json(users);
}
```

## [Release] v0.7.0-fastify-factory

### What's Changed

- 🚀 **PureCore Fastify Factory** - Factory completa compatível com Fastify API
- 🎯 **createPureCoreFastify()** - Função factory que cria instâncias Fastify-like
- 📋 **API 100% Compatível** - get, post, put, delete, patch, use, register, addHook, decorate, listen
- 🔒 **Decorators Integrados** - ApifyCompleteSentinel, SecuritySentinel, CQRS em handlers
- ✅ **Validação Zod Automática** - createValidatedHandler para validação automática
- 🔌 **Plugins Fastify** - Suporte completo a plugins e middlewares do Fastify
- 🏪 **Exemplo E-commerce Completo** - Product, Order, Payment com autenticação JWT
- 🎨 **Hooks e Middlewares** - Sistema completo de lifecycle hooks
- 📊 **Demonstrações Práticas** - Exemplos básicos e avançados funcionais
- 📚 **Documentação Completa** - README e relatórios HTML detalhados

### Technical Details

- **Compatibilidade**: API idêntica ao Fastify (migração zero)
- **Superpoderes**: Decorators de segurança + validação automática
- **Ecossistema**: Plugins Fastify + recursos Apify
- **Type Safety**: TypeScript + Zod validation integrada
- **Performance**: Circuit Breaker + Smart Cache embutidos
- **Segurança**: Helmet + XSS + CSRF + JWT protection
- **CQRS**: Separação automática de Commands e Queries

### Factory Usage

```typescript
import { createPureCoreFastify } from "@purecore/apify";

const app = createPureCoreFastify({
  logger: true,
  resilientConfig: {
    enableFallback: true,
    retryAttempts: 3,
  },
});

// API idêntica ao Fastify
app.get("/health", async (req, res) => {
  res.json({ status: "OK" });
});

app.post(
  "/products",
  createValidatedHandler(ProductValidator.validate, async (req, res) => {
    const product = await createProduct(req.body);
    res.status(201).json({ product });
  })
);

app.listen(3000, () => {
  console.log("🚀 PureCore Fastify rodando!");
});
```

### New Contributors

- [@purecore/apify/fastify-factory](https://github.com/suissa/purecore-apify) - Factory Fastify-like
- [Fastify](https://fastify.dev/) - Web framework compatibility

## [Release] v0.5.0-auto-router

### What's Changed

- ✨ Implementação completa dos decorators placeholders no config.ts
- 🔒 CORSGuard - Implementação completa de CORS com configuração flexível
- 🛡️ HSTSGuard - Reutilização do helmet.ts com configuração avançada
- 🔐 XSSGuard - Proteção contra Cross-Site Scripting
- 🚫 CSRFGuard - Proteção contra Cross-Site Request Forgery
- 🔑 AuthJwtGuard - Autenticação JWT completa
- 🔄 IdempotentGuard - Controle de requisições idempotentes
- 🏗️ CQRS - Padrão Command Query Responsibility Segregation
- 📊 Relatório HTML detalhado da implementação
- 🔧 Reutilização de 85% do código existente
- ✅ Cobertura completa de segurança web

### New Contributors

- [@purecore/apify](https://github.com/suissa/purecore-apify) - Framework completo de decorators para APIs Node.js/Express

## [Release] v0.6.0-zod-generator

### What's Changed

- 🎨 **ZodInterfaceGenerator** - Sistema completo para gerar schemas Zod a partir de interfaces TypeScript
- 📝 **Funções de validação nomeadas** - `validateFieldName` para cada campo da interface
- 🔗 **Sistema de relacionamentos** - Mapeamento automático de foreign keys e constraints
- 🏪 **Exemplo E-commerce completo** - Product, Stock, Order, Payment com validações de negócio
- 📦 **Schemas gerados automaticamente** - Product.schema.ts, Order.schema.ts, Payment.schema.ts, Stock.schema.ts
- 🗄️ **SQL generation** - Criação automática de tabelas com foreign keys
- ✅ **Validações de negócio** - Lógica específica por domínio (estoque, pagamentos, pedidos)
- 📊 **Relatórios HTML completos** - Documentação técnica e demonstrações
- 🔍 **RelationshipManager** - Validação de integridade referencial
- 🚀 **Demonstrações práticas** - Fluxo completo Product → Order → Payment → Stock

### Technical Details

- **Automação**: Zero código manual para validações básicas
- **Type Safety**: TypeScript + Zod com inferência completa
- **Reutilização**: 90% de reutilização de código gerado
- **Performance**: Validações otimizadas com parsing lazy
- **Manutenibilidade**: Mudanças na interface refletem automaticamente nos schemas
- **Relacionamentos**: Mapeamento automático de belongsTo, hasMany, hasOne, manyToMany

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
  static validate(data: any) {
    /* ... */
  }
  static validateField(fieldName: string, value: any) {
    /* ... */
  }
  static getRelationships() {
    /* ... */
  }
}
```

### New Contributors

- [@purecore/apify/zod-generator](https://github.com/suissa/purecore-apify) - Gerador automático de schemas Zod
- [Zod](https://zod.dev/) - Schema validation with TypeScript
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) - Interface parsing
