/**
 * 🚀 @purecore/syncify
 *
 * Biblioteca de utilidades para sincronização de funções assíncronas.
 *
 * @module @purecore/syncify
 * @author Suissa
 * @license MIT
 *
 * @example
 * ```typescript
 * import {
 *   syncFlow,
 *   syncParallel,
 *   syncRace,
 *   syncRetry,
 *   SyncQueue,
 *   SyncPubSub,
 *   SyncChannel
 * } from '@purecore/syncify';
 *
 * // Pipeline de funções assíncronas
 * const result = await syncFlow([
 *   async (x) => x * 2,
 *   async (x) => x + 10,
 *   async (x) => `Resultado: ${x}`
 * ], 5);
 *
 * // Execução paralela
 * const users = await syncParallel([
 *   () => fetchUser(1),
 *   () => fetchUser(2),
 *   () => fetchUser(3)
 * ]);
 *
 * // Corrida entre funções
 * const fastest = await syncRace([
 *   () => fetchFromServer1(),
 *   () => fetchFromServer2()
 * ]);
 *
 * // Retry com backoff exponencial
 * const data = await syncRetry(
 *   () => unstableApi.fetch(),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */

// ============================================
// 📦 Types
// ============================================
export type {
  AsyncFn,
  AsyncFnNoInput,
  SyncFn,
  ExecutionResult,
  RetryOptions,
  QueueOptions,
  QueueItem,
  QueueState,
  PubSubOptions,
  Subscriber,
  PubSubMessage,
  PubSubResponse,
  ChannelOptions,
  ChannelState,
  ChannelMessage,
  FlowOptions,
  FlowResult,
  ParallelOptions,
  SettledResult,
  RaceOptions,
  RaceResult,
} from "./types";

// ============================================
// 🔗 syncFlow - Pipeline de funções assíncronas
// ============================================
export {
  syncFlow,
  syncFlowSimple,
  createSyncFlow,
  syncFlowWithController,
  composeSyncFlow,
  FlowController,
} from "./utils/syncFlow";

// ============================================
// ⚡ syncParallel - Execução paralela
// ============================================
export {
  syncParallel,
  syncParallelSimple,
  syncParallelSettled,
  syncParallelMap,
  syncParallelFilter,
  syncParallelReduce,
  createParallelBatch,
  type ParallelResult,
} from "./utils/syncParallel";

// ============================================
// 🏁 syncRace - Corrida entre funções
// ============================================
export {
  syncRace,
  syncRaceSimple,
  syncRaceWithFallback,
  syncRaceFirst,
  syncRaceTimeout,
  createRaceExecutor,
} from "./utils/syncRace";

// ============================================
// 🔄 syncRetry - Retry com backoff
// ============================================
export {
  syncRetry,
  syncRetrySimple,
  syncRetryWithInput,
  syncRetryConditional,
  syncRetryUntilTimeout,
  createRetryExecutor,
  withRetry,
  withRetryInput,
  type RetryResult,
} from "./utils/syncRetry";

// ============================================
// 📋 syncQueue - Fila com concorrência
// ============================================
export {
  SyncQueue,
  syncQueue,
  syncQueueSimple,
  createQueueExecutor,
  PriorityQueue,
  RateLimitedQueue,
  type QueueEvent,
  type QueueEventListener,
} from "./utils/syncQueue";

// ============================================
// 📢 syncPubSub - Pub/Sub síncrono
// ============================================
export {
  SyncPubSub,
  RequestResponse,
  createPubSub,
  createRequestResponse,
  type PublishResult,
} from "./utils/syncPubSub";

// ============================================
// 🔌 syncChannel - Comunicação bidirecional
// ============================================
export {
  SyncChannel,
  AsyncIterableChannel,
  BroadcastChannel,
  WebSocketLikeChannel,
  createChannel,
  createChannelPair,
  type MessageHandler,
  type ChannelEvent,
  type ChannelEventListener,
} from "./utils/syncChannel";

// ============================================
// 🎨 Decorators
// ============================================
export {
  Syncify,
  Retry,
  RetrySimple,
  Timeout,
  Queued,
  Memoize,
  Debounce,
  Throttle,
  Flow,
  Measure,
  Fallback,
  CircuitBreaker,
  Lock,
} from "./decorators";

// ============================================
// 🛠️ Utility Functions
// ============================================

/**
 * Delay assíncrono
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cria um deferred (Promise com resolve/reject externos)
 */
export function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Timeout wrapper para qualquer Promise
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Executa função e ignora erros
 */
export async function ignoreError<T>(
  fn: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await fn();
  } catch {
    return defaultValue;
  }
}

/**
 * Converte callback para Promise
 */
export function promisify<T>(
  fn: (callback: (error: Error | null, result: T) => void) => void
): () => Promise<T>;
export function promisify<T, A1>(
  fn: (arg1: A1, callback: (error: Error | null, result: T) => void) => void
): (arg1: A1) => Promise<T>;
export function promisify<T, A1, A2>(
  fn: (
    arg1: A1,
    arg2: A2,
    callback: (error: Error | null, result: T) => void
  ) => void
): (arg1: A1, arg2: A2) => Promise<T>;
export function promisify(
  fn: (...args: any[]) => void
): (...args: any[]) => Promise<any> {
  return (...args: any[]) => {
    return new Promise((resolve, reject) => {
      fn(...args, (error: Error | null, result: unknown) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  };
}

/**
 * Semáforo para controle de concorrência
 */
export class Semaphore {
  private permits: number;
  private waiters: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter();
    } else {
      this.permits++;
    }
  }

  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  availablePermits(): number {
    return this.permits;
  }
}

/**
 * Mutex (semáforo binário)
 */
export class Mutex {
  private semaphore = new Semaphore(1);

  async lock(): Promise<void> {
    await this.semaphore.acquire();
  }

  unlock(): void {
    this.semaphore.release();
  }

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    return this.semaphore.withPermit(fn);
  }
}

/**
 * Barreira de sincronização
 */
export class Barrier {
  private count: number;
  private waiting = 0;
  private waiters: Array<() => void> = [];

  constructor(count: number) {
    this.count = count;
  }

  async wait(): Promise<void> {
    this.waiting++;

    if (this.waiting >= this.count) {
      // Libera todos os waiters
      this.waiters.forEach((waiter) => waiter());
      this.waiters = [];
      this.waiting = 0;
      return;
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }
}

/**
 * Latch (barreira de contagem regressiva)
 */
export class CountDownLatch {
  private count: number;
  private waiters: Array<() => void> = [];

  constructor(count: number) {
    this.count = count;
  }

  countDown(): void {
    this.count--;

    if (this.count <= 0) {
      this.waiters.forEach((waiter) => waiter());
      this.waiters = [];
    }
  }

  async wait(): Promise<void> {
    if (this.count <= 0) return;

    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  getCount(): number {
    return this.count;
  }
}
