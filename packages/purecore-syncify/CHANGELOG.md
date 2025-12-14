# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2024-11-26

### ✨ Added

#### Core Utilities
- **syncFlow** - Pipeline de funções assíncronas sequenciais
  - `syncFlow()` - Execução com metadados completos
  - `syncFlowSimple()` - Versão simplificada
  - `createSyncFlow()` - Factory para flows reutilizáveis
  - `syncFlowWithController()` - Com suporte a cancelamento
  - `composeSyncFlow()` - Composição de múltiplos flows
  - `FlowController` - Classe para controle de cancelamento

- **syncParallel** - Execução paralela com resultado agregado
  - `syncParallel()` - Execução com concorrência controlada
  - `syncParallelSimple()` - Equivalente a Promise.all
  - `syncParallelSettled()` - Retorna todos os resultados
  - `syncParallelMap()` - Map paralelo em arrays
  - `syncParallelFilter()` - Filter paralelo em arrays
  - `syncParallelReduce()` - Reduce com map paralelo
  - `createParallelBatch()` - Factory para batch executor

- **syncRace** - Corrida entre funções
  - `syncRace()` - Primeira a resolver vence
  - `syncRaceSimple()` - Equivalente a Promise.race
  - `syncRaceWithFallback()` - Com fallback em caso de erro
  - `syncRaceFirst()` - Primeiro sucesso (ignora erros)
  - `syncRaceTimeout()` - Com timeout individual
  - `createRaceExecutor()` - Factory para executor

- **syncRetry** - Retry com backoff exponencial
  - `syncRetry()` - Retry com configuração completa
  - `syncRetrySimple()` - Versão simplificada
  - `syncRetryWithInput()` - Retry com input
  - `syncRetryConditional()` - Retry até condição
  - `syncRetryUntilTimeout()` - Retry até timeout
  - `createRetryExecutor()` - Factory para executor
  - `withRetry()` / `withRetryInput()` - HOFs

- **SyncQueue** - Fila com concorrência controlada
  - `SyncQueue` - Classe com eventos e controle
  - `syncQueue()` - Função para processar arrays
  - `syncQueueSimple()` - Versão simplificada
  - `createQueueExecutor()` - Factory
  - `PriorityQueue` - Fila com prioridade
  - `RateLimitedQueue` - Fila com rate limiting

- **SyncPubSub** - Pub/Sub síncrono
  - `SyncPubSub` - Publisher aguarda resultado
  - `RequestResponse` - Padrão request/response
  - `createPubSub()` - Factory tipada
  - `createRequestResponse()` - Factory tipada

- **SyncChannel** - Comunicação bidirecional
  - `SyncChannel` - Canal WebSocket-like
  - `AsyncIterableChannel` - Canal com async iteration
  - `BroadcastChannel` - Um para muitos
  - `WebSocketLikeChannel` - API similar a WebSocket
  - `createChannel()` / `createChannelPair()` - Factories

#### Decorators
- `@Syncify` - Transforma async em sync
- `@Retry` - Retry automático
- `@RetrySimple` - Retry simplificado
- `@Timeout` - Timeout em métodos
- `@Queued` - Execução em fila
- `@Memoize` - Cache de resultados
- `@Debounce` - Debounce de chamadas
- `@Throttle` - Throttle de chamadas
- `@Flow` - Integração com flow
- `@Measure` - Medição de tempo
- `@Fallback` - Fallback em erro
- `@CircuitBreaker` - Circuit breaker pattern
- `@Lock` - Mutex para métodos

#### Utilities
- `delay()` - Delay assíncrono
- `deferred()` - Promise com resolve/reject externos
- `withTimeout()` - Timeout wrapper
- `ignoreError()` - Ignora erros
- `promisify()` - Converte callback para Promise
- `Semaphore` - Semáforo
- `Mutex` - Mutex
- `Barrier` - Barreira de sincronização
- `CountDownLatch` - Contagem regressiva

#### Types
- Tipos completos para todas as funções
- Interfaces para opções e resultados
- Tipos genéricos para máxima flexibilidade

### 📝 Documentation
- README.md completo com exemplos
- JSDoc em todas as funções
- Diagramas de funcionamento
- Seção "Como foi feito"
- Seção "Como funciona"
- Seção "Como testar"

### 🧪 Tests
- Testes para syncFlow
- Testes para syncParallel
- Testes para syncRetry
- Testes para syncPubSub
- Testes para syncChannel

---

## Links

- [README](./README.md)
- [Repositório](https://github.com/purecore/syncify)

