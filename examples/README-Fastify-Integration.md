# 🚀 PureCore Fastify Integration

Sistema completo que combina a **API Fastify-like** com os **decorators e validators do PureCore Apify**, criando uma experiência de desenvolvimento poderosa e familiar.

## 📋 Visão Geral

A integração Fastify do PureCore Apify oferece:

- ✅ **API 100% compatível com Fastify** - Mesmo métodos e sintaxe
- ✅ **Decorators do PureCore Apify** - Segurança, performance, resiliência
- ✅ **Validação automática com Zod** - Schemas type-safe
- ✅ **Plugins Fastify** - Ecossistema completo disponível
- ✅ **Hooks e middlewares** - Sistema de lifecycle completo
- ✅ **CQRS Pattern** - Separação de commands e queries

## 🛠️ Instalação e Uso

### Factory Fastify-like

```typescript
import { createPureCoreFastify } from '@purecore/apify';

const app = createPureCoreFastify({
  logger: true,
  resilientConfig: {
    enableFallback: true,
    retryAttempts: 3
  }
});

app.listen(3000, () => {
  console.log('🚀 Servidor rodando!');
});
```

### API Compatível com Fastify

```typescript
// Métodos HTTP iguais ao Fastify
app.get('/health', async (req, res) => {
  res.json({ status: 'OK' });
});

app.post('/users', async (req, res) => {
  res.json({ user: req.body });
});

// Middlewares
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Plugins
app.register(corsPlugin, { origin: '*' });
app.register(jwtPlugin, { secret: 'key' });

// Hooks
app.addHook('onRequest', (req, res) => {
  req.requestTime = Date.now();
});

app.addHook('onResponse', (req, res) => {
  const duration = Date.now() - req.requestTime;
  console.log(`${req.method} ${req.url} - ${duration}ms`);
});

// Decorators
app.decorate('db', myDatabaseConnection);
```

## 🔒 Integração com Decorators

### Decorators de Segurança

```typescript
import { ApifyCompleteSentinel, SecuritySentinel } from '@purecore/apify';

app.post('/secure-route',
  withDecorators([ApifyCompleteSentinel], async (req, res) => {
    // Rota com:
    // - Circuit Breaker
    // - Timeout 30s
    // - JWT Auth
    // - XSS Protection
    // - Helmet Security
    // - Smart Cache
    res.json({ message: 'Rota segura!' });
  })
);
```

### Sistema de Presets

```typescript
// Configuração completa de produção
ApifyCompleteSentinel // ⭐ RECOMENDADO

// Segurança máxima
SecuritySentinel

// Performance otimizada
PerformanceSentinel

// API REST básica
ApiSentinel

// Operações de banco
DatabaseSentinel
```

## 🎯 Validação com Zod

### Handlers com Validação Automática

```typescript
import { createValidatedHandler } from '@purecore/apify';
import { ProductValidator } from './product.schema.js';

// Handler com validação automática
app.post('/products', createValidatedHandler(
  ProductValidator.validate, // Schema Zod
  async (req, res) => {
    // req.body já está validado!
    const product = await createProduct(req.body);
    res.json({ product });
  }
));
```

### Validação por Campo Individual

```typescript
import { validateProductName, validateProductPrice } from './product.schema.js';

// Validação granular
const nameValid = validateProductName('Nome do Produto');
const priceValid = validateProductPrice(99.99);

if (!nameValid.success) {
  res.status(400).json({ error: 'Nome inválido' });
}
```

### Schemas Gerados Automaticamente

```typescript
// product.schema.ts (gerado automaticamente)
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number(),
  // ... outros campos
});

export const validateId = z.string().uuid();
export const validateName = z.string();
export const validatePrice = z.number();

export class ProductValidator {
  static validate(data: any) {
    return ProductSchema.safeParse(data);
  }

  static validateField(fieldName: string, value: any) {
    // Validação específica por campo
  }
}
```

## 🏗️ Exemplo Completo de E-commerce

### 1. Setup da Aplicação

```typescript
import { createPureCoreFastify, corsPlugin, jwtPlugin } from '@purecore/apify';

const app = createPureCoreFastify();

// Plugins Fastify
app.register(corsPlugin, { origin: 'http://localhost:3000' });
app.register(jwtPlugin, { secret: process.env.JWT_SECRET });

// Serviços decorados
app.decorate('services', {
  product: new ProductService(),
  order: new OrderService(),
  payment: new PaymentService()
});
```

### 2. Rotas Públicas (Queries - CQRS)

```typescript
// Lista produtos
app.get('/products', async (req, res) => {
  const products = await req.server.decorators.services.product.findAll();
  res.json({ products });
});

// Busca produto específico
app.get('/products/:id', async (req, res) => {
  const product = await req.server.decorators.services.product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }
  res.json({ product });
});
```

### 3. Rotas Protegidas (Commands - CQRS)

```typescript
// Cria produto com validação
app.post('/products',
  authenticate, // Middleware JWT
  createValidatedHandler(ProductValidator.validate, async (req, res) => {
    const product = await req.server.decorators.services.product.create(req.body);
    res.status(201).json({ product });
  })
);

// Cria pedido
app.post('/orders',
  authenticate,
  createValidatedHandler(OrderValidator.validate, async (req, res) => {
    const order = await req.server.decorators.services.order.create({
      ...req.body,
      customerId: req.user.id
    });
    res.status(201).json({ order });
  })
);

// Processa pagamento
app.post('/orders/:orderId/payment',
  authenticate,
  createValidatedHandler(PaymentValidator.validate, async (req, res) => {
    const payment = await req.server.decorators.services.payment.process(
      req.params.orderId,
      req.body
    );
    res.json({ payment });
  })
);
```

## 🔐 Sistema de Autenticação

### Plugin JWT

```typescript
app.register(jwtPlugin, { secret: process.env.JWT_SECRET });

// Middleware de autenticação
const authenticate = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Token obrigatório' });
  }

  const [, token] = auth.split(' ');
  if (token !== 'valid-token') {
    return res.status(403).json({ error: 'Token inválido' });
  }

  req.user = { id: 'user-1', role: 'user' };
  next();
};

// Uso
app.get('/profile', authenticate, async (req, res) => {
  res.json({ user: req.user });
});
```

### Middleware de Autorização

```typescript
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
};

app.get('/admin/dashboard', authenticate, requireAdmin, async (req, res) => {
  res.json({ adminData: true });
});
```

## 📊 CQRS Pattern Integrado

### Separação Commands/Queries

```typescript
// Queries (GET) - Leitura
app.get('/products', async (req, res) => {
  // Apenas leitura, sem side effects
  const products = await productRepository.findAll();
  res.json({ products });
});

// Commands (POST/PUT/DELETE) - Escrita
app.post('/products',
  authenticate,
  createValidatedHandler(ProductValidator.validate, async (req, res) => {
    // Side effects permitidos
    const product = await productService.create(req.body);
    await eventBus.publish('product.created', product);
    res.status(201).json({ product });
  })
);
```

## 🎨 Plugins e Middlewares

### Plugins Customizados

```typescript
// Plugin de CORS
const corsPlugin: FastifyPlugin = (fastify, options, done) => {
  fastify.addHook('onRequest', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', options.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  });
  done();
};

// Plugin de Rate Limiting
const rateLimitPlugin: FastifyPlugin = (fastify, options, done) => {
  const requests = new Map();

  fastify.addHook('onRequest', (req, res) => {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = options.windowMs || 60000; // 1 minuto

    if (!requests.has(ip)) {
      requests.set(ip, []);
    }

    const userRequests = requests.get(ip);
    userRequests.push(now);

    // Remove requests fora da janela
    const validRequests = userRequests.filter(time => now - time < windowMs);

    if (validRequests.length > (options.max || 100)) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    requests.set(ip, validRequests);
  });

  done();
};

// Registro
app.register(corsPlugin, { origin: 'http://localhost:3000' });
app.register(rateLimitPlugin, { max: 100, windowMs: 60000 });
```

### Middlewares Globais

```typescript
// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Middleware de headers de segurança
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

## 🚀 Scripts Disponíveis

```json
{
  "scripts": {
    "dev:fastify": "tsx examples/advanced-fastify-decorators.ts",
    "demo:fastify": "tsx examples/fastify-integration.ts",
    "generate:schemas": "tsx generate-zod-schemas.ts"
  }
}
```

### Executar Exemplos

```bash
# Demonstração completa
npm run dev:fastify

# Demonstração básica
npm run demo:fastify

# Gerar schemas Zod
npm run generate:schemas
```

## 📋 Comparação com Fastify Puro

| Recurso | Fastify Puro | PureCore Fastify |
|---------|-------------|------------------|
| API Methods | ✅ `get, post, put, delete` | ✅ **Igual** |
| Plugins | ✅ Sistema próprio | ✅ **Compatível** |
| Hooks | ✅ `onRequest, onResponse` | ✅ **Igual** |
| Decorators | ✅ `decorate()` | ✅ **Igual** |
| Middlewares | ✅ `use()` | ✅ **Igual** |
| **Decorators Segurança** | ❌ Não tem | ✅ **ApifyCompleteSentinel** |
| **Validação Zod** | ❌ Manual | ✅ **Automática** |
| **CQRS Pattern** | ❌ Não tem | ✅ **Integrado** |
| **Circuit Breaker** | ❌ Não tem | ✅ **Built-in** |
| **Smart Cache** | ❌ Não tem | ✅ **Inteligente** |

## 🎯 Benefícios da Integração

### Para Desenvolvedores Fastify
- **Migração Zero**: Código existente funciona sem mudanças
- **Superpoderes**: Adiciona decorators e validações avançadas
- **Ecossistema**: Mantém acesso a todos os plugins Fastify

### Para Equipes Existentes
- **Aprendizado Zero**: Mesma API familiar
- **Incremento Gradual**: Adicione recursos Apify conforme necessário
- **Retrocompatibilidade**: Código legado continua funcionando

### Para Novos Projetos
- **Melhor DX**: API Fastify + recursos Apify
- **Type Safety**: Zod + TypeScript
- **Performance**: Circuit Breaker + Smart Cache
- **Segurança**: Helmet + XSS + CSRF protection

## 🧪 Testes e Exemplos

### Executar Testes

```bash
# Health check
curl http://localhost:3000/health

# Listar produtos (público)
curl http://localhost:3000/products

# Criar produto (autenticado)
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer valid-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto Teste","price":99.99}'

# Dashboard admin
curl http://localhost:3000/admin/dashboard \
  -H "Authorization: Bearer admin-token"
```

### Arquivos de Exemplo

- `examples/fastify-integration.ts` - Demonstração básica
- `examples/advanced-fastify-decorators.ts` - Exemplo completo de e-commerce
- `examples/product.schema.ts` - Schema Zod gerado
- `src/fastify-factory.ts` - Factory principal

---

**🎉 A integração PureCore Fastify oferece o melhor dos dois mundos: a familiaridade do Fastify com os superpoderes do PureCore Apify!**
