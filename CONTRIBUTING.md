# Contribuindo com o @purecore-br/4pi

Obrigado por contribuir.

## Requisitos

- Bun instalado.
- Node.js 20+.
- TypeScript com `strict` habilitado.

## Setup local

```bash
bun install
bun run build
```

## Fluxo de contribuicao

1. Crie uma branch a partir da `main`.
2. Faça alteracoes pequenas e focadas.
3. Inclua ou atualize testes quando aplicavel.
4. Atualize documentacao e `CHANGELOG.md` quando houver mudanca de comportamento publico.
5. Abra Pull Request com contexto, motivacao e plano de teste.

## Padrao de codigo

- Preferir TypeScript estrito.
- Priorizar nomes semanticos e tipagem nominal quando aplicavel.
- Evitar breaking changes sem documentar migracao.
- Manter exemplos em `examples/` funcionando.

## Testes

```bash
bun test
bun run test:bun
```

Se voce alterou multipart nativo, execute tambem:

```bash
bun run test:native
```

## Pull Request

Inclua no PR:

- Objetivo da mudanca.
- Riscos e impactos.
- Como testar localmente.
- Evidencias (logs, screenshots, ou saida resumida de testes).
