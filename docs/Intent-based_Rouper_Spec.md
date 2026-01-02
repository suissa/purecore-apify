Specification: The Intent-Based Router

Status: Draft / Experimental

Version: 1.0.0

Context: Full Agent Stack Initiative

Package: @purecore/apify

1. Abstract

O Intent-Based Router é um motor de execução de APIs que prioriza a intenção do cliente sobre a precisão sintática da requisição.

Diferente de roteadores determinísticos tradicionais que operam em lógica binária (Sucesso/Erro 404/Erro 400), este roteador implementa uma camada de lógica difusa (fuzzy logic) e heurísticas de autocura. Ele assume que falhas de protocolo, rota ou estrutura de dados são, na maioria das vezes, problemas de tradução de intenção, e tenta resolvê-los autonomamente antes de rejeitar a requisição.

2. Routing Heuristics (Route Healing)

O roteador intercepta falhas de resolução de rota (404/405) e aplica algoritmos de busca para encontrar o destino provável.

2.1. Fuzzy Path Matching

Se a rota exata não for encontrada, o roteador calcula a distância de Levenshtein entre a URL solicitada e as rotas registradas.

Cenário: Cliente solicita POST /api/v1/usres (Typo).

Ação: Roteador detecta similaridade de 90% com /api/v1/users.

Resolução: Redireciona internamente a requisição para o handler de users e adiciona um header de aviso: X-Intent-Correction: redirected-from-typo.

2.2. Method Inference

Resolve erros comuns de verbos HTTP (405 Method Not Allowed) baseados na análise do payload.

Cenário: Cliente envia GET /users/create com um Body JSON.

Análise: Requisições GET não devem ter corpo semântico, mas a intenção é claramente de criação.

Ação: O roteador transmuta a requisição para POST /users se essa rota existir e aceitar o payload fornecido.

2.3. Semantic Version Fallback

Permite que clientes consumam rotas depreciadas ou versões futuras inexistentes sem quebra.

Cenário: Cliente solicita /api/v3/products (ainda não existe).

Ação: O roteador identifica que a versão mais estável é v2, verifica se o contrato é compatível e serve a resposta da v2 com um aviso de Deprecation ou Version-Mismatch.

3. Data Self-Healing (Payload Healing)

Implementa o princípio da robustez (Lei de Postel) analisando semanticamente o corpo da requisição (Body) e os parâmetros (Query/Params).

3.1. Semantic Field Mapping

O roteador utiliza um dicionário semântico reverso para corrigir nomes de campos incorretos no payload JSON.

Mecanismo: Ao receber um erro de validação de schema (ex: "missing field email"), o roteador varre o payload recebido buscando campos semanticamente equivalentes (e_mail, mail, emailAddress).

Cura: Se encontrado, o campo é renomeado em memória e a validação é reexecutada.

3.2. Structural Flattening & Hoisting

Corrige erros de aninhamento no JSON.

Cenário: A API espera { "userId": 123 }, mas o cliente envia { "data": { "user": { "id": 123 } } }.

Ação: O roteador detecta o padrão de aninhamento excessivo e "iça" (hoist) as propriedades profundas para o nível raiz esperado pelo Schema, baseando-se nos tipos de dados.

3.3. Type Coercion Inteligente

Vai além da coerção simples de strings para números.

Cenário: Campo booleano isActive recebe string "sim" ou "enabled".

Ação: O roteador interpreta valores semânticos positivos em pt-BR/en-US como true.

4. HTTP Protocol Correction (Protocol Healing)

O roteador atua como um proxy reverso inteligente para si mesmo, corrigindo falhas na camada de transporte e sessão.

4.1. Auth Session Recovery (401)

Gatilho: Falha de autenticação por token expirado.

Heurística:

O roteador pausa a requisição original.

Invoca o RefresherModule configurado.

Se obtiver novo token, injeta no header Authorization da requisição pausada.

Re-executa a requisição original de forma transparente.

4.2. Rate Limit Negotiation (429)

Gatilho: O handler ou um serviço upstream retorna 429 Too Many Requests.

Heurística:

O roteador lê o header Retry-After.

Se o tempo for aceitável (dentro do SLA configurado, ex: < 2s), ele retém a requisição em um buffer de memória.

Emite status 102 Processing para o cliente (se em modo AON).

Executa a requisição novamente após o tempo de espera.

4.3. Idempotency Assurance

Para evitar efeitos colaterais em retries de cura (especialmente em POST/PUT), o roteador gera e gerencia chaves de idempotência (Idempotency-Key) automaticamente, garantindo que a cura não duplique transações no banco de dados.

5. Intent Telemetry (AON Integration)

Todas as ações de cura geram eventos de telemetria específicos para o padrão Adaptive Observability Negotiation.

Event: intent.route_corrected: "Redirecionado de /usres para /users"

Event: intent.data_healed: "Campo 'mail' mapeado para 'email'"

Event: intent.protocol_fixed: "Token JWT renovado automaticamente"

Documento focado nas capacidades de Intent-Based Networking da Full Agent Stack.