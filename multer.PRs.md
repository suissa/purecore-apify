# Análise de PRs Abertos do Multer

Este documento analisa os Pull Requests abertos recentemente no repositório do [multer](https://github.com/expressjs/multer) e verifica se os problemas ou melhorias propostas se aplicam à nossa implementação `uploadify`.

Legenda:
- ✅: O problema não acontece no nosso projeto ou a melhoria já está implementada/não se aplica.
- ⚠️: O problema/comportamento também acontece no nosso projeto.

---

## [#1210] headers-support-utf8
**Status:** ⚠️

**Descrição:** O PR visa adicionar suporte adequado para caracteres UTF-8 nos headers (ex: nomes de arquivos com caracteres especiais).
**Análise:** O `uploadify` utiliza `buffer.toString()` que decodifica UTF-8 por padrão, mas não implementa lógica robusta para decodificação de headers complexos (RFC 2047) ou edge cases de encoding que o PR pretende resolver. Portanto, estamos suscetíveis a problemas similares com encodings específicos.

## [#1361] Fix file size validation issue
**Status:** ⚠️

**Descrição:** Correção de problemas na validação do tamanho do arquivo.
**Análise:** Nossa validação de tamanho é feita durante o stream (`bytes > limit`). Embora funcional, é uma implementação direta que pode compartilhar das mesmas falhas de lógica (ex: race conditions ou validação tardia) que o multer enfrenta, dependendo da especificidade do bug que o PR corrige.

## [#1124] Preserve async hooks context
**Status:** ⚠️

**Descrição:** O multer (através do busboy) perde o contexto de execução assíncrona (`async_hooks`), o que quebra ferramentas de tracing e Contexto de Armazenamento Local (ALS).
**Análise:** Implementações customizadas de parsing de stream com callbacks (`MultipartParser`) frequentemente quebram a propagação do contexto do `async_hooks` se não houver um gerenciamento explícito (ex: usando `AsyncResource`). Como não fazemos esse gerenciamento, o risco existe.

## [#1356] Refactor: remove concat-stream dependency and modernize MemoryStorage
**Status:** ✅

**Descrição:** Modernização do código e remoção da dependência `concat-stream`.
**Análise:** O nosso projeto já utiliza construções modernas do Node.js (Buffers nativos, Promises) e não depende de bibliotecas legadas como `concat-stream`.

## [#1067] DiskStorage destination folder check
**Status:** ⚠️

**Descrição:** Adiciona verificação se a pasta de destino existe quando o destino é fornecido como uma função.
**Análise:** Atualmente, o `uploadify` segue o comportamento padrão (e documentado) do multer de transferir a responsabilidade da criação da pasta para o usuário quando uma função é usada. Se o multer considera isso um problema a ser corrigido, nós também temos esse comportamento.

## [#438] Fix cleaning up temporary files on client abort
**Status:** ⚠️

**Descrição:** Garante que arquivos parciais sejam apagados se o cliente abortar a conexão durante o upload.
**Análise:** O `uploadify` não escuta eventos de `aborted` ou `close` prematuro da requisição para acionar a limpeza de arquivos. Arquivos parciais podem permanecer no disco.

## [#756] Call callback when file close occurs, not finish
**Status:** ⚠️

**Descrição:** Altera o comportamento para chamar o callback apenas quando o evento `close` (descritor de arquivo liberado) ocorre, ao invés de `finish` (dados escritos).
**Análise:** Nossa implementação `DiskStorage` escuta o evento `finish`. Em alguns sistemas de arquivos ou fluxos específicos, isso pode ser prematuro comparado ao `close`.

## [#432] Creating path folders by default for using multer.diskStorage
**Status:** ✅

**Descrição:** Criação automática de pastas para o `DiskStorage`.
**Análise:** O `uploadify` já implementa `mkdirSync(opts.destination, { recursive: true })` quando o destino é fornecido como uma string.

## [#1119] fix: wrap middleware in promise
**Status:** ✅

**Descrição:** Envolve o middleware em uma Promise para melhor suporte a async/await.
**Análise:** O `uploadify` é implementado nativamente com `async/await` e Promises, suportando fluxos assíncronos corretamente.
