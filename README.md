# Core Way

[Acompanhe o CHANGELOG](../CHANGELOG.md)

## Como foi feito
1. Ajustei o middleware de log em `examples/index.ts` para usar os tipos `Request`, `Response` e `NextFunction` exportados pelo próprio pacote, evitando conflitos com os tipos de Express.
2. Reintroduzi o `.gitignore` padrão na raiz para impedir versionamento de `node_modules` e `dist`.
3. Documentei este fluxo para manter o pacote alinhado com o estilo de blog técnico definido pelo projeto.

## Como funciona
O exemplo executa um servidor `CoreWay`, aplica o `jsonBodyParser` e em seguida registra um middleware de log tipado com os tipos nativos do framework. Isso garante que `app.use` receba um `Handler` compatível com o núcleo e que as propriedades adicionadas pelo runtime (`params`, `query`, helpers de resposta) estejam disponíveis sem casting inseguro.

## Como testar
1. Instale as dependências do pacote `core-way` usando `bun install`.
2. Rode `bun run examples/index.ts` para subir o servidor de exemplo e validar o middleware.
3. Opcionalmente execute `bun tsc --noEmit` para garantir que o projeto compila sem erros de tipo.

## Fontes
- [Documentação oficial do TypeScript sobre tipos estruturais](https://www.typescriptlang.org/docs/)

