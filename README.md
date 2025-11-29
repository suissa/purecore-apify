<div align="center" style="background-color: #9556ff">

<img src="https://i.imgur.com/o1Uet34.png" style="display:block; margin: 0 auto; margint-top: 20px">

<div align="left">
<h2 style="color: #ffff00; font-size: 48px; text-align: center; font-weight: bold;">Visão geral</h2>

<p><code>@purecore/apify</code> expõe a classe <code>Apify</code>, que herda de um roteador compatível com Express.</p>

<p>Você monta sua aplicação exatamente como faria com <code>{ express: () =&gt; app }</code>: registra middlewares com <code>app.use(...)</code>, define <code>app.get/post/put/delete/patch(...)</code> e finaliza com <code>app.listen(...)</code>.</p>

<p>Os objetos <code>Request</code> e <code>Response</code> carregam <code>params</code>, <code>query</code>, <code>body</code>, <code>baseUrl</code>, <code>originalUrl</code> e helpers <code>status</code>, <code>json</code>, <code>send</code>, permitindo migrar handlers Express com mínimo esforço.</p>

<blockquote>
<p><strong>Acho que essa lib não precisa de muita explicação.</strong></p>
</blockquote>

<h3>Uso básico (igualzinho ao Express)</h3>

<p>Instalação:</p>

<pre><code>npm i @purecore/apify

yarn add @purecore/apify

bun add @purecore/apify

pnpm add @purecore/apify
</code></pre>

<pre><code>import { Apify, jsonBodyParser } from '@purecore/apify';

const app = new Apify();

// Middleware global (body parser, logger, etc.)
app.use(jsonBodyParser);

// Rota com params e query
app.get('/users/:id', (req, res) =&gt; {
  const { id } = req.params;
  const { role } = req.query;
  res.status(200).json({ id, role, message: 'Usuário encontrado' });
});

// Sub-router (igual express.Router)
const apiRouter = new Apify();
apiRouter.get('/status', (req, res) =&gt; res.json({ status: 'ok' }));
app.use('/api', apiRouter);

app.listen(3344, () =&gt; console.log('@purecore/apify rodando na porta 3344'));
</code></pre>

<h2 style="color: #ffff00; font-size: 48px; text-align: center; font-weight: bold;">Template</h2>

<code>modules/&lt;resource&gt;/routes.ts</code>
<p>O gerador cria um sub-roteador completo com todas as operações CRUD:</p>

<ul>
<li><strong>POST <code>/</code></strong> – cria usuário em memória e retorna o registro persistido.</li>
<li><strong>GET <code>/:id</code></strong> – busca um usuário específico (com 404 se não existir).</li>
<li><strong>GET <code>/</code></strong> – lista todos os usuários, retornando <code>{ total, data }</code>.</li>
<li><strong>PUT/PATCH <code>/:id</code></strong> – atualização pontual (<code>updateOne</code>) aceitando tanto PUT quanto PATCH.</li>
<li><strong>PUT/PATCH <code>/bulk</code></strong> – atualização em massa (<code>updateMany</code>) recebendo <code>{ ids: string[], data: Partial&lt;User&gt; }</code>.</li>
<li><strong>DELETE <code>/:id</code></strong> – remove usuário e responde 204 se tudo certo.</li>
</ul>

<p>Basta importar e registrar:</p>

<pre><code>import { usersRouter } from './modules/users/routes';

app.use('/users', usersRouter);
</code></pre>

<h2 style="color: #ffff00; font-size: 48px; text-align: center; font-weight: bold;">Gerador de CRUD via CLI</h2>

<p>Você pode criar módulos automaticamente com:</p>

<pre><code>npx @purecore/apify create crud users
</code></pre>

<p>O comando fará duas coisas:</p>

<ol>
<li>Gera <code>modules/users/routes.ts</code> com todas as rotas CRUD usando o template acima.</li>
<li>Injeta automaticamente <code>import { usersRouter } from '../modules/users/routes';</code> e <code>app.use('/users', usersRouter);</code> no arquivo <code>src/index.ts</code> (ou outro informado com <code>--entry</code>).</li>
</ol>

<p>Caso seu arquivo principal esteja em outro caminho, passe <code>--entry</code>:</p>

<pre><code>npx @purecore/apify create crud billing --entry apps/api/src/main.ts
</code></pre>

<h2 style="color: #ffff00; font-size: 48px; text-align: center; font-weight: bold;">Decorators disponíveis</h2>

<p>Você pode usar os decorators para aplicar resiliência, observabilidade, segurança e performance em controladores class-based (igual ao Nest):</p>

<pre><code>import {
  CircuitBreaker,
  Timeout,
  Logs,
  Metrics,
  TraceSpan,
  SmartCache,
  AuthJWTGuard,
} from '@purecore/apify';

class UsersController {
  @Logs()
  @Metrics()
  @TraceSpan('users.list')
  @SmartCache({ ttlMs: 3000 })
  @CircuitBreaker({ failureThreshold: 3 })
  @Timeout({ ms: 2000 })
  async list(req, res) {
    res.json({ ok: true });
  }

  @AuthJWTGuard()
  async create(req, res) {
    res.status(201).json({ created: true });
  }
}
</code></pre>

<h3>Resilience</h3>
<ul>
<li><code>@CircuitBreaker</code>, <code>@Timeout</code>, <code>@Failover</code></li>
</ul>

<h3>Observability</h3>
<ul>
<li><code>@Logs</code>, <code>@Metrics</code>, <code>@TraceSpan</code></li>
</ul>

<h3>Security</h3>
<ul>
<li><code>@AuthExpressGuard</code>, <code>@XSSGuard</code>, <code>@AuthJWTGuard</code>, <code>@IdempotentGuard</code>, <code>@CSRFGuard</code></li>
</ul>

<h3>Performance</h3>
<ul>
<li><code>@SmartCache</code>, <code>@CQRS</code></li>
</ul>
</div>


</div>


## Visão geral

`@purecore/apify` expõe a classe `Apify`, que herda de um roteador compatível com Express.

Você monta sua aplicação exatamente como faria com `{ express: () => app }`: registra middlewares com `app.use(...)`, define `app.get/post/put/delete/patch(...)` e finaliza com `app.listen(...)`.

Os objetos `Request` e `Response` carregam `params`, `query`, `body`, `baseUrl`, `originalUrl` e helpers `status`, `json`, `send`, permitindo migrar handlers Express com mínimo esforço.

> **Acho que essa lib não precisa de muita explicação.**

### Uso básico (igualzinho ao Express)

Instalação:

```sh
npm i @purecore/apify

yarn add @purecore/apify

bun add @purecore/apify

pnpm add @purecore/apify
```

```ts
import { Apify, jsonBodyParser } from '@purecore/apify';

const app = new Apify();

// Middleware global (body parser, logger, etc.)
app.use(jsonBodyParser);

// Rota com params e query
app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  const { role } = req.query;
  res.status(200).json({ id, role, message: 'Usuário encontrado' });
});

// Sub-router (igual express.Router)
const apiRouter = new Apify();
apiRouter.get('/status', (req, res) => res.json({ status: 'ok' }));
app.use('/api', apiRouter);

app.listen(3344, () => console.log('@purecore/apify rodando na porta 3344'));
```

## Template `modules/<resource>/routes.ts`

O gerador cria um sub-roteador completo com todas as operações CRUD:

- **POST `/`** – cria usuário em memória e retorna o registro persistido.
- **GET `/:id`** – busca um usuário específico (com 404 se não existir).
- **GET `/`** – lista todos os usuários, retornando `{ total, data }`.
- **PUT/PATCH `/:id`** – atualização pontual (`updateOne`) aceitando tanto PUT quanto PATCH.
- **PUT/PATCH `/bulk`** – atualização em massa (`updateMany`) recebendo `{ ids: string[], data: Partial<User> }`.
- **DELETE `/:id`** – remove usuário e responde 204 se tudo certo.

Basta importar e registrar:

```ts
import { usersRouter } from './modules/users/routes';

app.use('/users', usersRouter);
```

## Gerador de CRUD via CLI

Você pode criar módulos automaticamente com:

```bash
npx @purecore/apify create crud users
```

O comando fará duas coisas:

1. Gera `modules/users/routes.ts` com todas as rotas CRUD usando o template acima.
2. Injeta automaticamente `import { usersRouter } from '../modules/users/routes';` e `app.use('/users', usersRouter);` no arquivo `src/index.ts` (ou outro informado com `--entry`).

Caso seu arquivo principal esteja em outro caminho, passe `--entry`:

```bash
npx @purecore/apify create crud billing --entry apps/api/src/main.ts
```

## Auto-Geração de Código Baseado em Schemas Zod 🚀

O `@purecore/apify` possui um sistema revolucionário de **auto-geração de código** baseado em schemas Zod! Basta definir um schema Zod simples e o sistema gera automaticamente:

- **Repository** com operações CRUD completas
- **Service** com regras de negócio
- **Controller** com endpoints REST
- **Routes** com roteamento automático
- **DTOs** e **Interfaces** TypeScript
- **Tests** automatizados
- **Configurações** e **Schemas** de banco

### Como Funciona

1. **Crie um arquivo `.ts` com schema Zod** em `src/modules/`
2. **Execute o servidor** - o sistema detecta e gera código automaticamente
3. **Pronto!** Toda a estrutura CRUD está criada

### Exemplo Prático

```ts
// src/modules/patient.ts
import { z } from 'zod';

export const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }).optional(),
});
```

**Resultado:** O sistema gera automaticamente:

```
src/modules/patient/
├── index.ts                 # Exportações principais
├── routes.ts               # Rotas Express
├── config.ts               # Configurações
├── database/
│   ├── repository.ts       # Operações de banco
│   └── schema.ts          # Schema SQL
├── services/
│   └── patient.service.ts  # Regras de negócio
├── controllers/
│   └── patient.controller.ts # Handlers HTTP
├── types/
│   ├── dto.ts             # Data Transfer Objects
│   └── interface.ts       # Interfaces TypeScript
└── tests/
    └── patient.test.ts    # Testes automatizados
```

### Endpoints Gerados Automaticamente

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/patient` | Lista pacientes com paginação |
| `POST` | `/patient` | Cria novo paciente |
| `GET` | `/patient/:id` | Busca paciente por ID |
| `PUT` | `/patient/:id` | Atualiza paciente |
| `DELETE` | `/patient/:id` | Remove paciente |

### Recursos Avançados

#### Busca e Filtros
```bash
GET /patient?search=João&page=1&limit=10&sortBy=name&sortOrder=asc
```

#### Validação Automática
- **Zod validation** em todos os inputs
- **TypeScript types** gerados automaticamente
- **SQL schemas** para bancos de dados

#### Testes Automatizados
```ts
describe('Patient Module', () => {
  it('should create a new patient', async () => {
    const result = await patientService.create({
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '+5511999999999',
      birthDate: '1990-01-01'
    });

    expect(result.id).toBeDefined();
  });
});
```

### Estrutura de Dados

#### Interface Gerada
```ts
export interface IPatient {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

#### DTO Gerado
```ts
export class PatientDTO {
  name!: string;
  email!: string;
  phone!: string;
  birthDate!: string;
  address?: Address;

  static validate(data: any): { success: boolean; data?: PatientDTO } {
    // Validação Zod automática
  }
}
```

### Repository com Operações Completas

```ts
export class PatientRepository {
  async create(data: Omit<IPatient, 'id'>): Promise<IPatient>
  async findById(id: string): Promise<IPatient | null>
  async find(query: PatientQuery): Promise<PatientResult>
  async update(id: string, data: Partial<IPatient>): Promise<IPatient | null>
  async delete(id: string): Promise<boolean>
}
```

### Service com Regras de Negócio

```ts
export class PatientService {
  async create(input: PatientCreateInput): Promise<IPatient>
  async getById(id: string): Promise<IPatient>
  async list(options: ListOptions): Promise<PaginatedResult>
  async update(id: string, input: PatientUpdateInput): Promise<IPatient>
  async delete(id: string): Promise<void>
}
```

### Controller com ApifyCompleteSentinel

```ts
export class PatientController {
  @ApifyCompleteSentinel
  async list(req: Request, res: Response) {
    // Circuit Breaker + Timeout + JWT + XSS + Cache + Logs + Metrics
  }

  @ApifyCompleteSentinel
  async create(req: Request, res: Response) {
    // Tudo automático!
  }
}
```

### Vantagens do Sistema

- ⚡ **Desenvolvimento 10x mais rápido** - De schema para API completa em segundos
- 🛡️ **Segurança máxima** - Todos os decorators aplicados automaticamente
- 🔧 **Manutenção zero** - Código consistente e padronizado
- 📊 **Observabilidade completa** - Logs, métricas e traces incluídos
- ✅ **Testes automatizados** - Cobertura completa gerada automaticamente
- 🎯 **TypeScript first** - Types seguros em todas as camadas

### Quando Executar

O sistema executa automaticamente quando:

1. **Servidor inicia** - Detecta arquivos `.ts` soltos em `modules/`
2. **Modo desenvolvimento** - Regenera código quando schemas mudam
3. **Comando manual** - Via API do auto-generator

### Configuração Manual (Opcional)

```bash
# Forçar regeneração
npm run generate-modules

# Limpar módulos gerados
npm run clean-modules

# Listar módulos
npm run list-modules
```

## Configuração de Ambiente

Para usar a **configuração padrão completa**, crie um arquivo `.env` baseado no template:

```bash
# Copie o template de configuração
cp src/env-config.ts .env

# Ou crie manualmente com:
cat > .env << 'EOF'
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NO_AUTH="GET /health, POST /login, GET /status"
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=10000
TIMEOUT_DEFAULT_MS=30000
TIMEOUT_MAX_MS=60000
TIMEOUT_RETRY_ATTEMPTS=3
CACHE_DEFAULT_TTL=300
ENABLE_DETAILED_LOGS=true
ENABLE_METRICS=true
ENABLE_TRACES=true
ENABLE_XSS_PROTECTION=true
ENABLE_WS_RETRY_CHANNEL=true
NODE_ENV=development
PORT=3344
API_PREFIX=/api/v1
EOF
```

### Variáveis de Ambiente Principais

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `JWT_SECRET` | Segredo para tokens JWT | `your-super-secret-jwt-key-change-this-in-production` |
| `NO_AUTH` | Rotas sem autenticação | `GET /health, POST /login, GET /status` |
| `TIMEOUT_DEFAULT_MS` | Timeout padrão (ms) | `30000` (30s) |
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | Limite de falhas | `5` |
| `ENABLE_WS_RETRY_CHANNEL` | Canal WS para retries | `true` |

## Auto-Carregamento de Módulos

O `@purecore/apify` detecta automaticamente todas as pastas dentro de `src/modules` e carrega suas rotas com o prefixo padrão `/api/v1`.

### Estrutura de Módulos

```
src/
└── modules/
    ├── users/
    │   └── routes.ts      # ou routes/index.ts
    └── products/
        └── routes.ts
```

### Uso Automático

```ts
import { Apify } from '@purecore/apify';

const app = new Apify();
// ✅ Prefixo '/api/v1' configurado automaticamente
// ✅ Módulos carregados automaticamente

app.listen(3344, () => {
  console.log('Módulos carregados:');
  console.log('• GET /api/v1/users');
  console.log('• GET /api/v1/products');
});
```

### Convenções de Export

Os módulos podem exportar o router de diferentes formas:

```ts
// routes.ts
import { Router } from '@purecore/apify';

const usersRouter = new Router();
// ... definir rotas ...

export { usersRouter }; // ✅ Detectado automaticamente
// ou export default usersRouter;
```

## Tratamento de Erro Robusto

O `@purecore/apify` inclui um sistema completo de tratamento de erro com status codes apropriados e formatação consistente.

### Classes de Erro Disponíveis

```typescript
import {
  NotFoundError,        // 404
  BadRequestError,      // 400
  ValidationError,      // 400 (com campo específico)
  UnauthorizedError,    // 401
  ForbiddenError,       // 403
  ConflictError,        // 409
  InternalServerError   // 500
} from '@purecore/apify';
```

### Uso Básico

```typescript
import { NotFoundError, ValidationError } from '@purecore/apify';

app.get('/users/:id', (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('ID obrigatório', 'id', id);
  }

  const user = findUser(id);
  if (!user) {
    throw new NotFoundError(`Usuário ${id} não encontrado`);
  }

  res.json(user);
});
```

### Middleware de Tratamento de Erro

```typescript
import { errorHandler } from '@purecore/apify';

// Deve ser o ÚLTIMO middleware registrado
app.use(errorHandler);
```

### Funções Helper

```typescript
import { error, validationError } from '@purecore/apify';

// Atalho para lançar erro por status code
throw error(404, 'Recurso não encontrado');

// Erro de validação com campo específico
throw validationError('Email inválido', 'email', 'invalid-email');
```

### Formato de Resposta de Erro

```json
{
  "error": {
    "message": "Usuário não encontrado",
    "statusCode": 404,
    "type": "NotFoundError",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "path": "/api/v1/users/999",
    "method": "GET"
  }
}
```

### Tratamento Automático de Erros Comuns

O sistema automaticamente detecta e trata:

- **Erros de validação**: `ValidationError` → 400
- **JSON malformado**: `SyntaxError` → 400
- **IDs inválidos**: `CastError` → 400
- **Registros duplicados**: MongoDB 11000 → 409
- **Problemas de conectividade**: `ENOTFOUND` → 503
- **Erros inesperados**: Qualquer erro → 500

## Configuração Padrão Completa ⭐

O `@purecore/apify` agora vem com uma **configuração padrão completa** que ativa **TODOS** os decorators automaticamente! Basta usar o `ApifyCompleteSentinel` e sua API estará completamente equipada com resiliência, observabilidade, segurança e performance.

### ApifyCompleteSentinel - Tudo Incluído

```ts
import { ApifyCompleteSentinel } from '@purecore/apify';

class UsersController {
  @ApifyCompleteSentinel
  async list(req, res) {
    // ✨ Circuit Breaker + Timeout 30s + WS Retry Channel
    // 📊 Logger + Metrics + TraceSpan
    // 🔐 JWT Auth + XSS Protection
    // 🚀 Smart Cache (5min TTL)
    res.json({ ok: true });
  }
}
```

**O que vem ativado por padrão:**
- 🔄 **Circuit Breaker** (5 falhas, reset 10s)
- ⏱️ **Timeout** (30s, max 60s, 3 retries)
- 🔗 **WS Retry Channel** para processamento paralelo
- 📝 **Logger**, 📊 **Metrics**, 🔍 **TraceSpan**
- 🔐 **JWT Auth** (com suporte NO_AUTH)
- 🛡️ **XSS Protection**
- 🛡️ **Helmet Security Headers** (CSP, HSTS, X-Frame-Options, etc.)
- 🚀 **Smart Cache** (5min TTL)

### Sistema NO_AUTH

Configure rotas que **não precisam** de autenticação via `.env`:

```bash
# .env
NO_AUTH="GET /health, POST /login, GET /status, GET /api/v1/public/info"
```

Rotas como `/health` e `/login` já são excluídas automaticamente.

## Decorators Individuais

Você também pode usar os decorators individualmente para controle fino:

```ts
import {
  CircuitBreaker,
  Timeout,
  Logs,
  Metrics,
  TraceSpan,
  SmartCache,
  AuthJWTGuard,
} from '@purecore/apify';

class UsersController {
  @Logs()
  @Metrics()
  @TraceSpan('users.list')
  @SmartCache({ ttlMs: 3000 })
  @CircuitBreaker({ failureThreshold: 3 })
  @Timeout({ ms: 2000 })
  async list(req, res) {
    res.json({ ok: true });
  }

  @AuthJWTGuard()
  async create(req, res) {
    res.status(201).json({ created: true });
  }
}
```

### Resilience
- `@CircuitBreaker`, `@Timeout`, `@Failover`

### Observability
- `@Logs`, `@Metrics`, `@TraceSpan`

### Security
- `@AuthExpressGuard`, `@XSSGuard`, `@AuthJWTGuard`, `@IdempotentGuard`, `@CSRFGuard`

### Performance
- `@SmartCache`, `@CQRS`

## Helmet.js - Segurança HTTP Nativa

O `@purecore/apify` inclui uma implementação **nativa e completa** de todos os headers de segurança HTTP do [Helmet.js](https://github.com/helmetjs/helmet), sem dependências externas. Todos os headers estão disponíveis como decorators individuais ou através do `HelmetGuard` que combina tudo automaticamente.

### Headers de Segurança Incluídos

| Header | Decorator | Descrição |
|--------|-----------|-----------|
| `Content-Security-Policy` | `@CSPGuard` | Controla recursos que o navegador pode carregar |
| `Strict-Transport-Security` | `@HSTSGuard` | Força conexões HTTPS |
| `X-Frame-Options` | `@XFrameOptionsGuard` | Previne clickjacking |
| `X-Content-Type-Options` | `@XContentTypeOptionsGuard` | Previne MIME sniffing |
| `X-XSS-Protection` | `@XXSSProtectionGuard` | Desabilita filtro XSS do navegador |
| `Referrer-Policy` | `@ReferrerPolicyGuard` | Controla envio de referrer |
| `Cross-Origin-Embedder-Policy` | `@COEPGuard` | Previne carregamento cross-origin |
| `Cross-Origin-Opener-Policy` | `@COOPGuard` | Isola janelas cross-origin |
| `Cross-Origin-Resource-Policy` | `@CORPGuard` | Controla compartilhamento cross-origin |
| `X-Powered-By` | `@XPoweredByGuard` | Remove header X-Powered-By |
| `Origin-Agent-Cluster` | `@OriginAgentClusterGuard` | Melhora isolamento de processos |

### Uso do HelmetGuard Completo

```ts
import { HelmetGuard } from '@purecore/apify';

class SecureController {
  @HelmetGuard({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://trusted.cdn.com'],
        'style-src': ["'self'", "'unsafe-inline'"]
      }
    },
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  })
  async secureEndpoint(req, res) {
    res.json({ secure: true });
  }
}
```

### Decorators Individuais

```ts
import {
  CSPGuard,
  HSTSGuard,
  XFrameOptionsGuard,
  ReferrerPolicyGuard
} from '@purecore/apify';

class ApiController {
  // Content Security Policy personalizado
  @CSPGuard({
    directives: {
      'default-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'script-src': ["'self'", "'unsafe-inline'"]
    }
  })
  async getContent(req, res) {
    res.json({ content: 'CSP protected' });
  }

  // HSTS com preload
  @HSTSGuard({
    maxAge: 63072000, // 2 anos
    includeSubDomains: true,
    preload: true
  })
  async secureConnection(req, res) {
    res.json({ hsts: 'enabled' });
  }

  // Anti-clickjacking
  @XFrameOptionsGuard({ action: 'DENY' })
  async noFrames(req, res) {
    res.json({ frames: 'denied' });
  }

  // Referrer Policy rigorosa
  @ReferrerPolicyGuard({ policy: 'no-referrer' })
  async privateData(req, res) {
    res.json({ referrer: 'hidden' });
  }
}
```

### Uso como Middleware

```ts
import { helmet } from '@purecore/apify';

// Middleware completo
app.use(helmet());

// Middleware personalizado
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar CSP
  strictTransportSecurity: {
    maxAge: 31536000
  }
}));
```

### Headers Aplicados Automaticamente

Quando você usa `@HelmetGuard()` ou `helmet()`, os seguintes headers são aplicados:

```
Content-Security-Policy: default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: https:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
X-Powered-By: (removido)
```

### Configuração via Ambiente

```bash
# .env
ENABLE_CSP=true
ENABLE_HSTS=true
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true
REFERRER_POLICY=strict-origin-when-cross-origin
X_FRAME_OPTIONS=SAMEORIGIN
COEP_POLICY=require-corp
COOP_POLICY=same-origin
CORP_POLICY=same-origin
```