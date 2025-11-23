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

## Decorators disponíveis

Você pode usar os decorators para aplicar resiliência, observabilidade, segurança e performance em controladores class-based (igual ao Nest):

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