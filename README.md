<div align="center"><img src="https://i.imgur.com/Ry9Iljd.png" style="display:block; margin: 0 auto; margint-top: 20px"></div>

## Visão geral

`@purecore/apify` expõe a classe `Apify`, que herda de um roteador compatível com Express.

Você monta sua aplicação exatamente como faria com `{ express: () => app }`: registra middlewares com `app.use(...)`, define `app.get/post/put/delete/patch(...)` e finaliza com `app.listen(...)`.

Os objetos `Request` e `Response` carregam `params`, `query`, `body`, `baseUrl`, `originalUrl` e helpers `status`, `json`, `send`, permitindo migrar handlers Express com mínimo esforço.

> Acho que essa lib não precisa de muita explicação.

### Uso básico (igualzinho ao Express)

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
