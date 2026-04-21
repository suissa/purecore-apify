/**
 * 📋 syncQueue - Fila de execução com concorrência controlada
 * @module @purecore/syncify/utils/syncQueue
 * 
 * Gerencia uma fila de funções assíncronas com controle de concorrência.
 */

import type { AsyncFn, QueueOptions, QueueItem, QueueState, ExecutionResult } from '../types';

/**
 * Evento da fila
 */
export type QueueEvent = 
  | { type: 'start'; index: number }
  | { type: 'complete'; index: number; result: unknown }
  | { type: 'error'; index: number; error: Error }
  | { type: 'drain' }
  | { type: 'pause' }
  | { type: 'resume' };

/**
 * Listener de eventos
 */
export type QueueEventListener = (event: QueueEvent) => void;

/**
 * 📋 SyncQueue - Classe de fila com concorrência controlada
 * 
 * @example
 * ```typescript
 * const queue = new SyncQueue({ concurrency: 3 });
 * 
 * // Adiciona tarefas
 * queue.add(async () => fetchUser(1));
 * queue.add(async () => fetchUser(2));
 * queue.add(async () => fetchUser(3));
 * 
 * // Aguarda todas completarem
 * await queue.drain();
 * ```
 */
export class SyncQueue<T = unknown, R = unknown> {
  private queue: QueueItem<T, R>[] = [];
  private running = 0;
  private completed = 0;
  private failed = 0;
  private paused = false;
  private listeners: QueueEventListener[] = [];
  private options: Required<QueueOptions>;

  constructor(options: Partial<QueueOptions> = {}) {
    this.options = {
      concurrency: options.concurrency ?? 1,
      timeout: options.timeout ?? 0,
      retry: options.retry ?? { maxRetries: 0, baseDelay: 1000 },
      onProcess: options.onProcess ?? (() => {}),
      onError: options.onError ?? (() => {})
    };
  }

  /**
   * Adiciona um item à fila
   */
  add(fn: AsyncFn<T, R>, input: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, input, resolve, reject });
      this.process();
    });
  }

  /**
   * Adiciona múltiplos itens à fila
   */
  addAll(items: Array<{ fn: AsyncFn<T, R>; input: T }>): Promise<R[]> {
    return Promise.all(items.map(item => this.add(item.fn, item.input)));
  }

  /**
   * Processa a fila
   */
  private async process(): Promise<void> {
    if (this.paused) return;
    if (this.running >= this.options.concurrency) return;
    if (this.queue.length === 0) {
      if (this.running === 0) {
        this.emit({ type: 'drain' });
      }
      return;
    }

    const item = this.queue.shift()!;
    this.running++;
    const index = this.completed + this.failed + this.running - 1;

    this.emit({ type: 'start', index });
    this.options.onProcess(item.input, index);

    try {
      let result: R;

      if (this.options.timeout > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout after ${this.options.timeout}ms`)), this.options.timeout);
        });
        result = await Promise.race([item.fn(item.input), timeoutPromise]);
      } else {
        result = await item.fn(item.input);
      }

      this.completed++;
      this.running--;
      
      this.emit({ type: 'complete', index, result });
      item.resolve(result);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      this.failed++;
      this.running--;
      
      this.emit({ type: 'error', index, error: err });
      this.options.onError(err, index);
      item.reject(err);
    }

    // Continua processando
    this.process();
  }

  /**
   * Pausa o processamento da fila
   */
  pause(): void {
    this.paused = true;
    this.emit({ type: 'pause' });
  }

  /**
   * Retoma o processamento da fila
   */
  resume(): void {
    this.paused = false;
    this.emit({ type: 'resume' });
    
    // Inicia múltiplos workers até a concorrência
    for (let i = 0; i < this.options.concurrency; i++) {
      this.process();
    }
  }

  /**
   * Limpa a fila (não cancela os em execução)
   */
  clear(): void {
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Aguarda todos os itens serem processados
   */
  drain(): Promise<void> {
    if (this.queue.length === 0 && this.running === 0) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      const listener = (event: QueueEvent) => {
        if (event.type === 'drain') {
          this.off(listener);
          resolve();
        }
      };
      this.on(listener);
    });
  }

  /**
   * Retorna o estado atual da fila
   */
  state(): QueueState {
    return {
      pending: this.queue.length,
      running: this.running,
      completed: this.completed,
      failed: this.failed
    };
  }

  /**
   * Registra um listener de eventos
   */
  on(listener: QueueEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove um listener de eventos
   */
  off(listener: QueueEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emite um evento
   */
  private emit(event: QueueEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}

/**
 * 📋 syncQueue - Função para processar array com concorrência
 * 
 * @example
 * ```typescript
 * const results = await syncQueue(
 *   userIds,
 *   async (id) => fetchUser(id),
 *   { concurrency: 3 }
 * );
 * ```
 */
export async function syncQueue<T, R>(
  items: T[],
  fn: AsyncFn<T, R>,
  options: Partial<QueueOptions> = {}
): Promise<ExecutionResult<R[]>> {
  const queue = new SyncQueue<T, R>(options);
  const startTime = Date.now();

  try {
    const results = await queue.addAll(
      items.map(input => ({ fn, input }))
    );

    return {
      success: true,
      data: results,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

/**
 * 📋 syncQueueSimple - Versão simplificada
 * 
 * @example
 * ```typescript
 * const users = await syncQueueSimple(
 *   [1, 2, 3, 4, 5],
 *   fetchUser,
 *   3 // concorrência
 * );
 * ```
 */
export async function syncQueueSimple<T, R>(
  items: T[],
  fn: AsyncFn<T, R>,
  concurrency: number = 1
): Promise<R[]> {
  const result = await syncQueue(items, fn, { concurrency });
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.data!;
}

/**
 * 📋 createQueueExecutor - Factory para criar um executor de fila reutilizável
 * 
 * @example
 * ```typescript
 * const userQueue = createQueueExecutor<number, User>(
 *   fetchUser,
 *   { concurrency: 5 }
 * );
 * 
 * const users = await userQueue([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * ```
 */
export function createQueueExecutor<T, R>(
  fn: AsyncFn<T, R>,
  options: Partial<QueueOptions> = {}
): (items: T[]) => Promise<ExecutionResult<R[]>> {
  return (items: T[]) => syncQueue(items, fn, options);
}

/**
 * 📋 PriorityQueue - Fila com prioridade
 */
export class PriorityQueue<T = unknown, R = unknown> {
  private queues: Map<number, QueueItem<T, R>[]> = new Map();
  private running = 0;
  private paused = false;
  private options: Required<QueueOptions>;

  constructor(options: Partial<QueueOptions> = {}) {
    this.options = {
      concurrency: options.concurrency ?? 1,
      timeout: options.timeout ?? 0,
      retry: options.retry ?? { maxRetries: 0, baseDelay: 1000 },
      onProcess: options.onProcess ?? (() => {}),
      onError: options.onError ?? (() => {})
    };
  }

  /**
   * Adiciona item com prioridade (menor número = maior prioridade)
   */
  add(fn: AsyncFn<T, R>, input: T, priority: number = 0): Promise<R> {
    return new Promise((resolve, reject) => {
      if (!this.queues.has(priority)) {
        this.queues.set(priority, []);
      }
      this.queues.get(priority)!.push({ fn, input, resolve, reject });
      this.process();
    });
  }

  private getNextItem(): QueueItem<T, R> | undefined {
    const priorities = Array.from(this.queues.keys()).sort((a, b) => a - b);
    
    for (const priority of priorities) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    
    return undefined;
  }

  private async process(): Promise<void> {
    if (this.paused) return;
    if (this.running >= this.options.concurrency) return;

    const item = this.getNextItem();
    if (!item) return;

    this.running++;

    try {
      let result: R;

      if (this.options.timeout > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout after ${this.options.timeout}ms`)), this.options.timeout);
        });
        result = await Promise.race([item.fn(item.input), timeoutPromise]);
      } else {
        result = await item.fn(item.input);
      }

      this.running--;
      item.resolve(result);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.running--;
      this.options.onError(err, 0);
      item.reject(err);
    }

    this.process();
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    for (let i = 0; i < this.options.concurrency; i++) {
      this.process();
    }
  }

  size(): number {
    let total = 0;
    this.queues.forEach(queue => total += queue.length);
    return total;
  }
}

/**
 * 📋 RateLimitedQueue - Fila com rate limiting
 */
export class RateLimitedQueue<T = unknown, R = unknown> {
  private queue: QueueItem<T, R>[] = [];
  private lastExecution = 0;
  private options: Required<QueueOptions> & { minInterval: number };

  constructor(
    minInterval: number,
    options: Partial<QueueOptions> = {}
  ) {
    this.options = {
      concurrency: 1, // Rate limiting geralmente é sequencial
      timeout: options.timeout ?? 0,
      retry: options.retry ?? { maxRetries: 0, baseDelay: 1000 },
      onProcess: options.onProcess ?? (() => {}),
      onError: options.onError ?? (() => {}),
      minInterval
    };
  }

  add(fn: AsyncFn<T, R>, input: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, input, resolve, reject });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.queue.length === 0) return;

    const now = Date.now();
    const timeSinceLastExecution = now - this.lastExecution;

    if (timeSinceLastExecution < this.options.minInterval) {
      const waitTime = this.options.minInterval - timeSinceLastExecution;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const item = this.queue.shift();
    if (!item) return;

    this.lastExecution = Date.now();

    try {
      const result = await item.fn(item.input);
      item.resolve(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      item.reject(err);
    }

    // Continua processando
    if (this.queue.length > 0) {
      this.process();
    }
  }
}

