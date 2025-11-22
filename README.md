<div align="center"><img src="https://i.imgur.com/Ry9Iljd.png" style="display:block; margin: 0 auto; margint-top: 20px"></div>

[Acompanhe o CHANGELOG](../CHANGELOG.md)

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

## Módulo `modules/users/routes.ts`

O monorepo já inclui um sub-roteador pronto em `modules/users/routes.ts` com todas as operações CRUD:

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