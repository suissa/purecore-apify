# 🚀 @purecore/syncify

> Biblioteca de utilidades para sincronização de funções assíncronas em TypeScript/JavaScript.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-compatible-orange.svg)](https://bun.sh/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 📚 Sumário

- [Instalação](#-instalação)
- [Funcionalidades](#-funcionalidades)
- [Uso Rápido](#-uso-rápido)
- [API Reference](#-api-reference)
  - [syncFlow](#-syncflow---pipeline-de-funções-assíncronas)
  - [syncParallel](#-syncparallel---execução-paralela)
  - [syncRace](#-syncrace---corrida-entre-funções)
  - [syncRetry](#-syncretry---retry-com-backoff)
  - [SyncQueue](#-syncqueue---fila-com-concorrência)
  - [SyncPubSub](#-syncpubsub---pubsub-síncrono)
  - [SyncChannel](#-syncchannel---comunicação-bidirecional)
  - [Decorators](#-decorators)
  - [Utilities](#-utilities)
- [Como foi feito](#-como-foi-feito)
- [Como funciona](#-como-funciona)
- [Como testar](#-como-testar)
- [Fontes de informação](#-fontes-de-informação)
- [CHANGELOG](./CHANGELOG.md)

## 📦 Instalação

```bash
bun add @purecore/syncify
```

## ✨ Funcionalidades

| Função | Descrição |
|--------|-----------|
| `syncFlow` | Pipeline de funções assíncronas sequenciais (como `for await of`) |
| `syncParallel` | Execução paralela com resultado agregado |
| `syncRace` | Primeira função a resolver vence |
| `syncRetry` | Retry automático com backoff exponencial |
| `SyncQueue` | Fila de execução com concorrência controlada |
| `SyncPubSub` | Pub/Sub onde publisher aguarda resultado do subscriber |
| `SyncChannel` | Comunicação bidirecional WebSocket-like |

## 🚀 Uso Rápido

```typescript
import { 
  syncFlow, 
  syncParallel, 
  syncRace, 
  syncRetry,
  SyncPubSub,
  SyncChannel
} from '@purecore/syncify';

// 🔗 Pipeline de funções
const result = await syncFlow([
  async (x) => x * 2,
  async (x) => x + 10,
  async (x) => `Resultado: ${x}`
], 5);
// result.data = "Resultado: 20"

// ⚡ Execução paralela
const users = await syncParallel([
  () => fetchUser(1),
  () => fetchUser(2),
  () => fetchUser(3)
]);

// 🏁 Corrida - primeiro a responder
const fastest = await syncRace([
  () => fetchFromServer1(),
  () => fetchFromServer2()
]);

// 🔄 Retry com backoff
const data = await syncRetry(
  () => unstableApi.fetch(),
  { maxRetries: 3, baseDelay: 1000 }
);
```

## 📖 API Reference

### 🔗 syncFlow - Pipeline de funções assíncronas

Executa uma sequência de funções onde o resultado de uma passa como argumento para a próxima.

```typescript
import { syncFlow, createSyncFlow, FlowController } from '@purecore/syncify';

// Uso básico
const result = await syncFlow<number, string>([
  async (x) => x * 2,           // 5 -> 10
  async (x) => x + 10,          // 10 -> 20
  async (x) => `Value: ${x}`    // 20 -> "Value: 20"
], 5);

console.log(result.data);           // "Value: 20"
console.log(result.completedSteps); // 3
console.log(result.duration);       // tempo em ms

// Com opções
const result = await syncFlow(fns, initialValue, {
  timeout: 5000,                    // Timeout por step
  continueOnError: true,            // Continua mesmo com erro
  onStep: (index, value) => {},     // Callback por step
  onError: (error, index) => {}     // Callback de erro
});

// Flow reutilizável
const processUser = createSyncFlow([
  async (id) => fetchUser(id),
  async (user) => validateUser(user),
  async (user) => enrichUser(user)
]);

const user1 = await processUser(1);
const user2 = await processUser(2);

// Com cancelamento
const controller = new FlowController();
const flowPromise = syncFlowWithController(fns, value, controller);

// Cancela após 1s
setTimeout(() => controller.cancel('Timeout'), 1000);
```

### ⚡ syncParallel - Execução paralela

Executa múltiplas funções em paralelo e agrega os resultados.

```typescript
import { 
  syncParallel, 
  syncParallelMap, 
  syncParallelFilter,
  createParallelBatch 
} from '@purecore/syncify';

// Execução paralela básica
const result = await syncParallel([
  () => fetchUser(1),
  () => fetchUser(2),
  () => fetchUser(3)
]);

console.log(result.data);       // [user1, user2, user3]
console.log(result.successful); // 3
console.log(result.failed);     // 0

// Com concorrência limitada
const result = await syncParallel(fns, {
  maxConcurrency: 3,    // Máximo 3 em paralelo
  timeout: 5000,        // Timeout por função
  failMode: 'settled'   // 'all' ou 'settled'
});

// Map paralelo
const users = await syncParallelMap(
  [1, 2, 3, 4, 5],
  async (id) => fetchUser(id),
  { maxConcurrency: 3 }
);

// Filter paralelo
const activeUsers = await syncParallelFilter(
  users,
  async (user) => await checkIfActive(user.id)
);

// Batch executor reutilizável
const batchFetch = createParallelBatch(
  (id) => fetchUser(id),
  { maxConcurrency: 5 }
);

const users = await batchFetch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
```

### 🏁 syncRace - Corrida entre funções

Executa múltiplas funções e retorna o primeiro resultado.

```typescript
import { 
  syncRace, 
  syncRaceFirst, 
  syncRaceWithFallback 
} from '@purecore/syncify';

// Race básico
const result = await syncRace([
  async () => { await delay(100); return 'server1'; },
  async () => { await delay(50); return 'server2'; }  // Vence!
]);

console.log(result.data);        // 'server2'
console.log(result.winnerIndex); // 1

// Primeiro sucesso (ignora erros)
const result = await syncRaceFirst([
  () => failingServer(),   // Falha, continua
  () => workingServer()    // Retorna resultado
]);

// Com fallback
const result = await syncRaceWithFallback(
  [() => primaryServer(), () => secondaryServer()],
  () => getCachedData()  // Fallback se todos falharem
);

// Com timeout individual
const result = await syncRaceTimeout([
  { fn: () => fastApi(), timeout: 100 },
  { fn: () => slowApi(), timeout: 500 }
]);
```

### 🔄 syncRetry - Retry com backoff

Executa função com retry automático em caso de falha.

```typescript
import { 
  syncRetry, 
  syncRetryConditional,
  syncRetryUntilTimeout,
  withRetry
} from '@purecore/syncify';

// Retry básico
const result = await syncRetry(
  () => unstableApi.fetch(),
  {
    maxRetries: 3,
    baseDelay: 1000,
    backoffMultiplier: 2,  // 1s, 2s, 4s
    maxDelay: 10000,
    shouldRetry: (error, attempt) => !error.message.includes('Fatal'),
    onRetry: (error, attempt) => console.log(`Retry ${attempt}: ${error}`)
  }
);

console.log(result.attempts);   // Número de tentativas
console.log(result.errors);     // Array de erros
console.log(result.totalDelay); // Tempo total de delays

// Retry condicional (aguarda condição)
const result = await syncRetryConditional(
  () => checkStatus(),
  (status) => status === 'ready',  // Condição de sucesso
  { maxRetries: 10, baseDelay: 500 }
);

// Retry até timeout
const result = await syncRetryUntilTimeout(
  () => checkServiceReady(),
  30000,  // 30 segundos
  { baseDelay: 1000 }
);

// HOF para adicionar retry
const fetchWithRetry = withRetry(fetchData, { maxRetries: 3 });
const data = await fetchWithRetry();
```

### 📋 SyncQueue - Fila com concorrência

Gerencia fila de execução com controle de concorrência.

```typescript
import { 
  SyncQueue, 
  syncQueue, 
  PriorityQueue,
  RateLimitedQueue 
} from '@purecore/syncify';

// Usando classe
const queue = new SyncQueue({ concurrency: 3 });

// Adiciona tarefas
const promise1 = queue.add(async (x) => processItem(x), item1);
const promise2 = queue.add(async (x) => processItem(x), item2);

// Eventos
queue.on((event) => {
  switch (event.type) {
    case 'start': console.log(`Starting ${event.index}`); break;
    case 'complete': console.log(`Completed ${event.index}`); break;
    case 'error': console.log(`Error ${event.index}:`, event.error); break;
    case 'drain': console.log('Queue empty'); break;
  }
});

// Aguarda todas completarem
await queue.drain();

// Estado da fila
console.log(queue.state());
// { pending: 0, running: 0, completed: 10, failed: 2 }

// Função simplificada
const results = await syncQueue(
  items,
  (item) => processItem(item),
  { concurrency: 5 }
);

// Fila com prioridade
const pQueue = new PriorityQueue({ concurrency: 2 });
pQueue.add(slowTask, data, 10);   // Prioridade baixa
pQueue.add(urgentTask, data, 1);  // Prioridade alta (executa primeiro)

// Rate limiting
const rateLimited = new RateLimitedQueue(1000); // 1 req/segundo
rateLimited.add(apiCall, params);
```

### 📢 SyncPubSub - Pub/Sub síncrono

Sistema de pub/sub onde o publisher pode aguardar o resultado do processamento.

```typescript
import { SyncPubSub, RequestResponse, createPubSub } from '@purecore/syncify';

// PubSub básico
const pubsub = new SyncPubSub<UserEvent, ProcessResult>();

// Subscriber
const subId = pubsub.subscribe('user.created', async (event) => {
  await sendWelcomeEmail(event.email);
  await createProfile(event.userId);
  return { processed: true };
});

// Publisher aguarda resultado
const result = await pubsub.publish('user.created', {
  userId: '123',
  email: 'user@example.com'
});

console.log(result.data);           // [{ processed: true }]
console.log(result.subscriberCount); // 1
console.log(result.responses);       // Detalhes de cada subscriber

// Padrão Request/Response
const rr = new RequestResponse<CalculateRequest, number>();

// Servidor
rr.respond('calculate', async (req) => req.a + req.b);

// Cliente
const sum = await rr.request('calculate', { a: 5, b: 3 });
console.log(sum); // 8

// PubSub tipado
interface Event { action: string; data: unknown }
interface Result { success: boolean }

const typedPubSub = createPubSub<Event, Result>({
  timeout: 5000,
  maxSubscribers: 10,
  bufferSize: 100  // Buffer mensagens sem subscribers
});
```

### 🔌 SyncChannel - Comunicação bidirecional

Canal de comunicação bidirecional similar a WebSocket.

```typescript
import { 
  SyncChannel, 
  AsyncIterableChannel,
  BroadcastChannel,
  WebSocketLikeChannel 
} from '@purecore/syncify';

// Criar par de canais conectados
const [client, server] = SyncChannel.createPair<Request, Response>();

// Servidor
server.onMessage(async (msg) => {
  if (msg.type === 'request') {
    const result = await processRequest(msg.data);
    return result;
  }
});

// Cliente - fire and forget
client.send({ action: 'notify', data: 'Hello' });

// Cliente - request/response
const response = await client.request({ action: 'getData' });

// Eventos
client.on((event) => {
  switch (event.type) {
    case 'open': console.log('Connected'); break;
    case 'close': console.log('Disconnected:', event.reason); break;
    case 'error': console.log('Error:', event.error); break;
    case 'message': console.log('Message:', event.message); break;
  }
});

// Canal iterável (como Go channels)
const channel = new AsyncIterableChannel<string>();

// Consumidor
for await (const message of channel) {
  console.log('Received:', message);
}

// Produtor
channel.push('Hello');
channel.push('World');
channel.close();

// Broadcast (um para muitos)
const broadcast = new BroadcastChannel<Notification>();

broadcast.subscribe((n) => showDesktopNotification(n));
broadcast.subscribe((n) => logNotification(n));

await broadcast.send({ title: 'Alert', message: 'Server is down!' });

// API similar a WebSocket
const ws = new WebSocketLikeChannel();

ws.onopen = () => console.log('Connected');
ws.onmessage = (data) => console.log('Data:', data);
ws.onclose = () => console.log('Closed');

ws.connect(peerChannel);
ws.send({ type: 'hello' });
```

### 🎨 Decorators

Decorators para adicionar funcionalidades a métodos de classe.

```typescript
import { 
  Syncify,
  Retry,
  Timeout,
  Queued,
  Memoize,
  Debounce,
  Throttle,
  Fallback,
  CircuitBreaker,
  Lock,
  Measure
} from '@purecore/syncify';

class ApiService {
  // Transforma async em sync (⚠️ usar com cuidado)
  @Syncify()
  syncMethod() {
    return this.asyncMethod();
  }

  // Retry automático
  @Retry({ maxRetries: 3, baseDelay: 1000 })
  async fetchData(): Promise<Data> {
    return await api.getData();
  }

  // Timeout
  @Timeout(5000)
  async slowOperation(): Promise<void> {
    // Erro se demorar mais de 5s
  }

  // Execução em fila
  @Queued({ concurrency: 3 })
  async processItem(item: Item): Promise<Result> {
    return await heavyProcessing(item);
  }

  // Cache de resultados
  @Memoize({ ttl: 60000 }) // 1 minuto
  async getUser(id: number): Promise<User> {
    return await fetchUser(id);
  }

  // Debounce
  @Debounce(300)
  async search(query: string): Promise<Results> {
    return await searchApi(query);
  }

  // Throttle
  @Throttle(1000)
  async sendRequest(): Promise<void> {
    // Máximo 1 chamada por segundo
  }

  // Fallback em caso de erro
  @Fallback(() => ({ cached: true, data: [] }))
  async getData(): Promise<Data> {
    return await api.getData();
  }

  // Circuit breaker
  @CircuitBreaker({ 
    failureThreshold: 5, 
    resetTimeout: 30000,
    onOpen: () => console.log('Circuit opened'),
    onClose: () => console.log('Circuit closed')
  })
  async callExternal(): Promise<Response> {
    return await externalApi.call();
  }

  // Mutex (execução serializada)
  @Lock()
  async updateResource(): Promise<void> {
    // Apenas uma execução por vez
  }

  // Medição de tempo
  @Measure((duration, method) => {
    metrics.record(method, duration);
  })
  async trackedOperation(): Promise<void> {
    // Tempo será registrado
  }
}
```

### 🛠️ Utilities

Funções utilitárias para sincronização.

```typescript
import { 
  delay,
  deferred,
  withTimeout,
  ignoreError,
  promisify,
  Semaphore,
  Mutex,
  Barrier,
  CountDownLatch
} from '@purecore/syncify';

// Delay
await delay(1000);

// Deferred (Promise com resolve/reject externos)
const { promise, resolve, reject } = deferred<string>();
setTimeout(() => resolve('Done!'), 1000);
const result = await promise;

// Timeout wrapper
const result = await withTimeout(
  longOperation(),
  5000,
  'Operation timeout'
);

// Ignorar erros
const data = await ignoreError(
  () => riskyOperation(),
  defaultValue
);

// Promisify
const readFileAsync = promisify(fs.readFile);
const content = await readFileAsync('file.txt');

// Semáforo
const sem = new Semaphore(3);
await sem.withPermit(async () => {
  // Máximo 3 execuções simultâneas
});

// Mutex
const mutex = new Mutex();
await mutex.withLock(async () => {
  // Execução exclusiva
});

// Barreira (sincroniza N threads)
const barrier = new Barrier(3);
// Thread 1, 2, 3 chamam:
await barrier.wait(); // Só continua quando 3 chegarem

// Latch (contagem regressiva)
const latch = new CountDownLatch(3);
latch.countDown(); // Chamado por cada worker
await latch.wait(); // Espera todos terminarem
```

## 🔧 Como foi feito

### Arquitetura

A biblioteca foi desenvolvida seguindo princípios de:

1. **Composição**: Cada utilidade é independente e composável
2. **Type Safety**: TypeScript com tipos genéricos para máxima segurança
3. **Zero Dependencies**: Sem dependências externas (exceto dev)
4. **Tree Shakeable**: Importações individuais para bundle otimizado

### Padrões implementados

| Padrão | Implementação |
|--------|---------------|
| Pipeline | `syncFlow` - Encadeamento de funções |
| Parallel Execution | `syncParallel` - Fork-join pattern |
| Race Condition | `syncRace` - Primeiro resultado vence |
| Retry with Backoff | `syncRetry` - Exponential backoff |
| Producer-Consumer | `SyncQueue` - Fila com workers |
| Pub/Sub | `SyncPubSub` - Observer síncrono |
| CSP Channels | `SyncChannel` - Go-style channels |
| Request-Response | `RequestResponse` - RPC pattern |
| Circuit Breaker | `@CircuitBreaker` - Resiliência |

### Técnicas utilizadas

- **Promises com timeout**: `Promise.race` com timeout Promise
- **Backoff exponencial**: `delay * Math.pow(multiplier, attempt)`
- **Async Iterators**: `Symbol.asyncIterator` para canais
- **WeakMap para decorators**: Metadata sem memory leaks
- **Event Emitters**: Padrão observer para eventos

## ⚙️ Como funciona

### syncFlow

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  fn1    │───▶│  fn2    │───▶│  fn3    │
│ (input) │    │ (fn1()) │    │ (fn2()) │
└─────────┘    └─────────┘    └─────────┘
     5      ──▶     10     ──▶     20
```

### syncParallel

```
          ┌─────────┐
       ┌──│  fn1()  │──┐
       │  └─────────┘  │
input ─┼──┌─────────┐──┼─▶ [result1, result2, result3]
       │  │  fn2()  │  │
       │  └─────────┘  │
       └──┌─────────┐──┘
          │  fn3()  │
          └─────────┘
```

### SyncPubSub (Publisher aguarda resultado)

```
Publisher ──publish()──▶ Topic ──▶ Subscriber1 ──handler()──┐
                              └──▶ Subscriber2 ──handler()──┤
                                                            ▼
Publisher ◀──────────────────────────────── [results] ◀─────┘
```

## 🧪 Como testar

```bash
# Instalar dependências
bun install

# Rodar todos os testes
bun test

# Rodar testes específicos
bun test syncFlow
bun test syncPubSub

# Rodar com coverage
bun test --coverage

# Watch mode
bun test --watch
```

### Exemplo de teste

```typescript
import { describe, test, expect } from 'bun:test';
import { syncFlow } from '@purecore/syncify';

describe('syncFlow', () => {
  test('deve executar funções em sequência', async () => {
    const result = await syncFlow([
      async (x) => x * 2,
      async (x) => x + 10
    ], 5);

    expect(result.success).toBe(true);
    expect(result.data).toBe(20);
  });
});
```

## 📚 Fontes de informação

- [MDN - Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN - Async Iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of)
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [Resilience Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [CSP - Communicating Sequential Processes](https://en.wikipedia.org/wiki/Communicating_sequential_processes)
- [Go Channels](https://go.dev/tour/concurrency/2)
- [RxJS Patterns](https://rxjs.dev/)

## 📄 Licença

MIT © [Suissa](https://github.com/suissa)

---

[CHANGELOG](./CHANGELOG.md) | [Issues](https://github.com/purecore/syncify/issues) | [Pull Requests](https://github.com/purecore/syncify/pulls)
