Specification: Adaptive Observability Negotiation (AON)

Status: Draft / Experimental

Version: 1.0.0

Context: Full Agent Stack Initiative

Pattern Type: Architectural / Communication Protocol

1. Abstract

O padrão Adaptive Observability Negotiation (AON) define um mecanismo arquitetural para APIs RESTful que permite ao cliente negociar dinamicamente o nível de observabilidade da resposta.

Diferente de APIs tradicionais que operam estritamente como "Caixas Pretas" (retornando apenas o resultado final), o AON permite que o servidor opere em modo "Caixa de Vidro" (Glass Box), transmitindo telemetria de execução, decisões heurísticas e tentativas de auto-cura (self-healing) em tempo real via streaming, utilizando a mesma conexão HTTP da transação original.

2. Motivation

Em arquiteturas orientadas a agentes e Intent-Driven Development (IDD), o tempo de processamento pode variar devido a ações autônomas do backend (ex: renovação de tokens, correção de schemas, retries com backoff).

O modelo tradicional de Request -> Wait -> Response falha em dois aspectos críticos para agentes:

UX/DX: O cliente não sabe se o servidor travou ou está trabalhando (Self-Healing).

Debug: Falhas ocultas que foram "curadas" silenciosamente impedem a melhoria do sistema.

O AON resolve isso permitindo que clientes sofisticados "assinem" o fluxo de pensamento do agente sem quebrar a compatibilidade com clientes HTTP legados.

3. Protocol Definition

O protocolo baseia-se estritamente na Content Negotiation (RFC 7231) do HTTP.

3.1. The Handshake (Request)

O cliente sinaliza sua intenção através do header Accept.

3.1.1. Standard Mode (Black Box)

Para clientes legados, browsers padrão ou scripts simples.

Header: Accept: application/json (ou omitido)

Comportamento: O servidor deve executar toda a lógica, reter os logs em memória e retornar apenas o payload final.

Timeout: O servidor deve gerenciar o timeout internamente para evitar desconexão prematura.

3.1.2. Agent Mode (Glass Box)

Para Dashboards de IA, CLIs avançadas e Interfaces Conversacionais.

Header: Accept: application/x-ndjson

Comportamento: O servidor deve responder imediatamente com headers de streaming e transmitir eventos linha-a-linha (NDJSON).

MIME Type Resposta: application/x-ndjson

Transfer Encoding: chunked

3.2. Response Lifecycle (Agent Mode)

No modo Agente, a conexão segue o seguinte ciclo de vida:

Acknowledgement: O servidor retorna 200 OK imediatamente.

Keep-Alive (Opcional): Se o processamento inicial for custoso, recomenda-se enviar um status 102 Processing (se suportado pelo ambiente) ou um evento de heartbeat.

Telemetry Stream: Eventos de progresso, cura e decisão são enviados conforme ocorrem.

Result/Error: O último evento do stream contém o resultado final ou o erro fatal.

Termination: O servidor encerra a conexão (res.end()).

4. Data Structure (NDJSON Schema)

O corpo da resposta no modo Agente consiste em objetos JSON separados por quebra de linha (\n). Cada objeto deve conter um campo type discriminador.

4.1. Base Event Schema

type AONEvent = 
  | IntentAnalysisEvent
  | HealingEvent
  | StatusEvent
  | ResultEvent
  | ErrorEvent;


4.2. Event Types

intent_analysis

Emitido quando o agente interpreta o input do usuário e decide alterar a rota de execução padrão.

{
  "type": "intent_analysis",
  "timestamp": 1715432000,
  "original_intent": "create_user",
  "detected_issue": "invalid_schema",
  "decision": "apply_semantic_mapping"
}


healing

Emitido quando o sistema executa uma ação de auto-cura ativa.

{
  "type": "healing",
  "severity": "medium", // low, medium, high, critical
  "action": "refresh_token",
  "description": "JWT Expired. Negotiating new token with Auth Provider.",
  "metadata": { "attempt": 1, "provider": "Auth0" }
}


status

Telemetria geral ou logs de progresso (Heartbeat).

{
  "type": "status",
  "message": "Waiting for rate limit backoff...",
  "estimated_delay_ms": 200
}


result (Terminal)

O sucesso da operação. Equivalente ao body de uma resposta application/json padrão.

{
  "type": "result",
  "data": {
    "id": "usr_123",
    "status": "created",
    "warning": null
  }
}


error (Terminal)

Falha catastrófica onde nenhuma heurística de cura funcionou.

{
  "type": "error",
  "code": "DB_UNREACHABLE",
  "message": "All connection retries exhausted.",
  "trace_id": "req_abc123"
}


5. Implementation Guidelines

5.1. Server-Side (Middleware)

Implementações devem preferir uma abordagem de middleware para abstrair a lógica de negociação.

O middleware deve interceptar o método res.json() ou equivalente.

Se isStreaming, o payload é convertido em evento { type: 'result', data: payload } e a conexão fecha.

Se !isStreaming, o payload é enviado normalmente e os eventos anteriores de telemetria são descartados (ou anexados em um header X-AON-Report para debug leve).

5.2. Client-Side (Consumer)

Clientes AON devem ser capazes de processar NDJSON.

Deve-se usar ReadableStream ou listeners de evento on('data').

O parse deve ser resiliente a JSONs parciais (split chunks).

6. Security Considerations

A transparência radical do AON exige cuidados:

Sanitização: Eventos de healing nunca devem vazar credenciais antigas ou novas, chaves de API ou connection strings, mesmo que estejam sendo "curadas".

Environment Check: Em ambiente de production, o nível de detalhe dos eventos intent_analysis deve ser reduzido, a menos que o solicitante tenha privilégios de administrador (verificado via JWT/Roles).

7. Compliance Verification

Uma implementação é considerada AON-Compliant se:

[ ] Respeitar estritamente o header Accept.

[ ] Não quebrar clientes que não enviam o header (fallback para JSON puro).

[ ] Garantir que o output NDJSON seja válido (parseável linha a linha).

[ ] Implementar pelo menos uma heurística de cura ativa antes de falhar.

Documento gerado para a Full Agent Stack Initiative.