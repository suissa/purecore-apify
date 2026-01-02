/**
 * 🎨 Decorators - Decorators para sincronização
 * @module @purecore/syncify/decorators
 */

import type { RetryOptions, QueueOptions, FlowOptions } from '../types';
import { syncRetry, syncRetryWithInput, type RetryResult } from '../utils/syncRetry';
import { SyncQueue } from '../utils/syncQueue';

/**
 * 🚀 @Syncify - Transforma função assíncrona em síncrona
 * 
 * ⚠️ ATENÇÃO: Este decorator usa busy-waiting e pode bloquear a thread.
 * Use apenas quando absolutamente necessário.
 * 
 * @example
 * ```typescript
 * class MyService {
 *   @Syncify()
 *   async fetchData(): Promise<string> {
 *     return await fetch(url).then(r => r.text());
 *   }
 * }
 * 
 * const service = new MyService();
 * const data = service.fetchData(); // Roda de forma síncrona
 * ```
 */
export function Syncify() {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      let result: unknown;
      let completed = false;
      let error: Error | null = null;

      const promise = originalMethod.apply(this, args);

      if (promise instanceof Promise) {
        promise
          .then((res: unknown) => {
            result = res;
            completed = true;
          })
          .catch((err: Error) => {
            error = err;
            completed = true;
          });

        // Busy-wait (não recomendado para produção)
        const start = Date.now();
        const timeout = 30000; // 30 segundos de timeout

        while (!completed && Date.now() - start < timeout) {
          // Pequena pausa para não travar completamente
          const end = Date.now() + 1;
          while (Date.now() < end) {
            // Busy wait
          }
        }

        if (!completed) {
          throw new Error('Syncify timeout: Operation took too long');
        }

        if (error) {
          throw error;
        }

        return result;
      }

      return promise;
    };

    return descriptor;
  };
}

/**
 * 🔄 @Retry - Adiciona retry automático a um método
 * 
 * @example
 * ```typescript
 * class ApiClient {
 *   @Retry({ maxRetries: 3, baseDelay: 1000 })
 *   async fetchUser(id: number): Promise<User> {
 *     return await fetch(`/users/${id}`).then(r => r.json());
 *   }
 * }
 * ```
 */
export function Retry(options: Partial<RetryOptions> = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<RetryResult<unknown>> {
      return syncRetry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * 🔄 @RetrySimple - Retry que retorna diretamente o resultado
 * 
 * @example
 * ```typescript
 * class ApiClient {
 *   @RetrySimple(3)
 *   async fetchUser(id: number): Promise<User> {
 *     return await fetch(`/users/${id}`).then(r => r.json());
 *   }
 * }
 * ```
 */
export function RetrySimple(maxRetries: number = 3) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const result = await syncRetry(
        () => originalMethod.apply(this, args), 
        { maxRetries }
      );
      
      if (!result.success) {
        throw result.error;
      }
      
      return result.data;
    };

    return descriptor;
  };
}

/**
 * ⏱️ @Timeout - Adiciona timeout a um método assíncrono
 * 
 * @example
 * ```typescript
 * class SlowService {
 *   @Timeout(5000)
 *   async slowOperation(): Promise<void> {
 *     // Se demorar mais de 5s, lança erro
 *   }
 * }
 * ```
 */
export function Timeout(ms: number) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
      });

      return Promise.race([
        originalMethod.apply(this, args),
        timeoutPromise
      ]);
    };

    return descriptor;
  };
}

/**
 * 📋 @Queued - Executa método em fila com concorrência controlada
 * 
 * Todos os métodos decorados com @Queued na mesma classe compartilham a mesma fila.
 * 
 * @example
 * ```typescript
 * class BatchProcessor {
 *   @Queued({ concurrency: 3 })
 *   async processItem(item: Item): Promise<Result> {
 *     return await heavyProcessing(item);
 *   }
 * }
 * ```
 */
export function Queued(options: Partial<QueueOptions> = {}) {
  const queue = new SyncQueue<unknown, unknown>(options);

  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]): Promise<unknown> {
      return queue.add(
        () => originalMethod.apply(this, args),
        undefined as unknown
      );
    };

    return descriptor;
  };
}

/**
 * 📝 @Memoize - Cache de resultados de métodos assíncronos
 * 
 * @example
 * ```typescript
 * class UserService {
 *   @Memoize({ ttl: 60000 }) // Cache por 1 minuto
 *   async getUser(id: number): Promise<User> {
 *     return await fetchUser(id);
 *   }
 * }
 * ```
 */
export function Memoize(options: { ttl?: number; maxSize?: number } = {}) {
  const { ttl = 0, maxSize = 100 } = options;
  const cache = new Map<string, { value: unknown; timestamp: number }>();

  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const key = JSON.stringify(args);
      const now = Date.now();

      // Verifica cache
      const cached = cache.get(key);
      if (cached) {
        if (ttl === 0 || now - cached.timestamp < ttl) {
          return cached.value;
        }
        cache.delete(key);
      }

      // Executa e cacheia
      const result = await originalMethod.apply(this, args);
      
      // Limpa cache se excedeu tamanho
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }

      cache.set(key, { value: result, timestamp: now });
      return result;
    };

    return descriptor;
  };
}

/**
 * 🔒 @Debounce - Debounce de chamadas de método
 * 
 * @example
 * ```typescript
 * class SearchService {
 *   @Debounce(300)
 *   async search(query: string): Promise<Results> {
 *     return await searchApi(query);
 *   }
 * }
 * ```
 */
export function Debounce(ms: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: { resolve: (value: unknown) => void; reject: (error: Error) => void } | null = null;

  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]): Promise<unknown> {
      return new Promise((resolve, reject) => {
        // Cancela timeout anterior
        if (timeoutId) {
          clearTimeout(timeoutId);
          if (pendingPromise) {
            pendingPromise.reject(new Error('Debounced'));
          }
        }

        pendingPromise = { resolve, reject };

        timeoutId = setTimeout(async () => {
          try {
            const result = await originalMethod.apply(this, args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            timeoutId = null;
            pendingPromise = null;
          }
        }, ms);
      });
    };

    return descriptor;
  };
}

/**
 * 🚦 @Throttle - Throttle de chamadas de método
 * 
 * @example
 * ```typescript
 * class RateLimitedService {
 *   @Throttle(1000)
 *   async sendRequest(): Promise<void> {
 *     // Máximo uma chamada por segundo
 *   }
 * }
 * ```
 */
export function Throttle(ms: number) {
  let lastExecution = 0;
  let pendingExecution: Promise<unknown> | null = null;

  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecution;

      if (timeSinceLastExecution >= ms) {
        lastExecution = now;
        return originalMethod.apply(this, args);
      }

      // Aguarda o tempo restante
      if (pendingExecution) {
        return pendingExecution;
      }

      const waitTime = ms - timeSinceLastExecution;
      
      pendingExecution = new Promise(resolve => {
        setTimeout(async () => {
          lastExecution = Date.now();
          const result = await originalMethod.apply(this, args);
          pendingExecution = null;
          resolve(result);
        }, waitTime);
      });

      return pendingExecution;
    };

    return descriptor;
  };
}

/**
 * 🔗 @Flow - Executa método como parte de um flow
 * 
 * @example
 * ```typescript
 * class Pipeline {
 *   @Flow({ onStep: (i, r) => console.log(`Step ${i}:`, r) })
 *   async process(data: Data): Promise<Result> {
 *     return await processData(data);
 *   }
 * }
 * ```
 */
export function Flow(options: FlowOptions = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    let stepIndex = 0;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const start = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        options.onStep?.(stepIndex++, result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        options.onError?.(err, stepIndex);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 📊 @Measure - Mede tempo de execução de método
 * 
 * @example
 * ```typescript
 * class PerformanceTest {
 *   @Measure((duration) => console.log(`Took ${duration}ms`))
 *   async heavyOperation(): Promise<void> {
 *     // ...
 *   }
 * }
 * ```
 */
export function Measure(onComplete?: (duration: number, method: string) => void) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const start = Date.now();
      
      try {
        return await originalMethod.apply(this, args);
      } finally {
        const duration = Date.now() - start;
        onComplete?.(duration, propertyKey);
      }
    };

    return descriptor;
  };
}

/**
 * 🛡️ @Fallback - Executa fallback em caso de erro
 * 
 * @example
 * ```typescript
 * class DataService {
 *   @Fallback(() => ({ cached: true, data: [] }))
 *   async fetchData(): Promise<Data> {
 *     return await api.getData();
 *   }
 * }
 * ```
 */
export function Fallback<T>(fallbackFn: () => T | Promise<T>) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<T> {
      try {
        return await originalMethod.apply(this, args);
      } catch {
        return await fallbackFn();
      }
    };

    return descriptor;
  };
}

/**
 * 🔄 @CircuitBreaker - Padrão circuit breaker para resiliência
 * 
 * @example
 * ```typescript
 * class ExternalService {
 *   @CircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 })
 *   async callExternal(): Promise<Response> {
 *     return await externalApi.call();
 *   }
 * }
 * ```
 */
export function CircuitBreaker(options: {
  failureThreshold?: number;
  resetTimeout?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
} = {}) {
  const {
    failureThreshold = 5,
    resetTimeout = 30000,
    onOpen,
    onClose,
    onHalfOpen
  } = options;

  let failures = 0;
  let state: 'closed' | 'open' | 'half-open' = 'closed';
  let lastFailureTime = 0;

  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      // Verifica se deve resetar
      if (state === 'open') {
        const now = Date.now();
        if (now - lastFailureTime >= resetTimeout) {
          state = 'half-open';
          onHalfOpen?.();
        } else {
          throw new Error('Circuit breaker is open');
        }
      }

      try {
        const result = await originalMethod.apply(this, args);
        
        // Sucesso: fecha o circuit
        if (state === 'half-open') {
          state = 'closed';
          failures = 0;
          onClose?.();
        }
        
        return result;

      } catch (error) {
        failures++;
        lastFailureTime = Date.now();

        if (failures >= failureThreshold) {
          state = 'open';
          onOpen?.();
        }

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 🔒 @Lock - Garante execução serializada (mutex)
 * 
 * @example
 * ```typescript
 * class SharedResource {
 *   @Lock()
 *   async updateResource(): Promise<void> {
 *     // Apenas uma execução por vez
 *   }
 * }
 * ```
 */
export function Lock() {
  let locked = false;
  const waiters: Array<() => void> = [];

  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      // Aguarda se estiver locked
      if (locked) {
        await new Promise<void>(resolve => waiters.push(resolve));
      }

      locked = true;

      try {
        return await originalMethod.apply(this, args);
      } finally {
        locked = false;
        const next = waiters.shift();
        if (next) next();
      }
    };

    return descriptor;
  };
}

