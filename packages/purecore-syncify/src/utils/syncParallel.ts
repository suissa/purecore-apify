/**
 * ⚡ syncParallel - Execução paralela com resultado agregado
 * @module @purecore/syncify/utils/syncParallel
 * 
 * Executa múltiplas funções assíncronas em paralelo e agrega os resultados.
 */

import type { AsyncFnNoInput, ParallelOptions, SettledResult, ExecutionResult } from '../types';

/**
 * Resultado do Parallel
 */
export interface ParallelResult<T> extends ExecutionResult<T[]> {
  results: SettledResult<T>[];
  successful: number;
  failed: number;
}

/**
 * ⚡ syncParallel - Executa funções em paralelo
 * 
 * @param fns - Array de funções assíncronas sem parâmetros
 * @param options - Opções de configuração
 * @returns Promise com array de resultados
 * 
 * @example
 * ```typescript
 * const result = await syncParallel([
 *   async () => fetchUser(1),
 *   async () => fetchUser(2),
 *   async () => fetchUser(3)
 * ]);
 * // result.data = [user1, user2, user3]
 * ```
 */
export async function syncParallel<T>(
  fns: AsyncFnNoInput<T>[],
  options: ParallelOptions = {}
): Promise<ParallelResult<T>> {
  const {
    timeout,
    failMode = 'all',
    maxConcurrency = 0
  } = options;

  const startTime = Date.now();

  const executeOne = async (fn: AsyncFnNoInput<T>, index: number): Promise<SettledResult<T>> => {
    const fnStart = Date.now();

    try {
      let result: T;

      if (timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Function ${index} timeout after ${timeout}ms`)), timeout);
        });
        result = await Promise.race([fn(), timeoutPromise]);
      } else {
        result = await fn();
      }

      return {
        status: 'fulfilled',
        value: result,
        duration: Date.now() - fnStart
      };

    } catch (error) {
      return {
        status: 'rejected',
        reason: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - fnStart
      };
    }
  };

  let results: SettledResult<T>[];

  if (maxConcurrency > 0 && maxConcurrency < fns.length) {
    // Execução com concorrência limitada
    results = await executeWithConcurrency(fns, executeOne, maxConcurrency);
  } else {
    // Execução totalmente paralela
    results = await Promise.all(fns.map((fn, index) => executeOne(fn, index)));
  }

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  if (failMode === 'all' && failed > 0) {
    const firstError = results.find(r => r.status === 'rejected')?.reason;
    return {
      success: false,
      error: firstError,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      results,
      successful,
      failed
    };
  }

  const data = results
    .filter((r): r is SettledResult<T> & { status: 'fulfilled'; value: T } => r.status === 'fulfilled')
    .map(r => r.value);

  return {
    success: true,
    data,
    duration: Date.now() - startTime,
    timestamp: new Date(),
    results,
    successful,
    failed
  };
}

/**
 * Executa funções com concorrência limitada
 */
async function executeWithConcurrency<T>(
  fns: AsyncFnNoInput<T>[],
  executor: (fn: AsyncFnNoInput<T>, index: number) => Promise<SettledResult<T>>,
  concurrency: number
): Promise<SettledResult<T>[]> {
  const results: SettledResult<T>[] = new Array(fns.length);
  let currentIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (currentIndex < fns.length) {
      const index = currentIndex++;
      results[index] = await executor(fns[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * ⚡ syncParallelSimple - Versão simplificada (equivalente a Promise.all)
 * 
 * @example
 * ```typescript
 * const [user1, user2, user3] = await syncParallelSimple([
 *   () => fetchUser(1),
 *   () => fetchUser(2),
 *   () => fetchUser(3)
 * ]);
 * ```
 */
export async function syncParallelSimple<T>(
  fns: AsyncFnNoInput<T>[]
): Promise<T[]> {
  return Promise.all(fns.map(fn => fn()));
}

/**
 * ⚡ syncParallelSettled - Retorna todos os resultados (sucesso e falha)
 * 
 * @example
 * ```typescript
 * const results = await syncParallelSettled([
 *   () => fetchUser(1),
 *   () => Promise.reject(new Error('Not found')),
 *   () => fetchUser(3)
 * ]);
 * // results = [{ status: 'fulfilled', value: user1 }, { status: 'rejected', reason: Error }, ...]
 * ```
 */
export async function syncParallelSettled<T>(
  fns: AsyncFnNoInput<T>[]
): Promise<SettledResult<T>[]> {
  const result = await syncParallel(fns, { failMode: 'settled' });
  return result.results;
}

/**
 * ⚡ syncParallelMap - Aplica uma função assíncrona a cada item de um array em paralelo
 * 
 * @example
 * ```typescript
 * const users = await syncParallelMap(
 *   [1, 2, 3],
 *   async (id) => fetchUser(id)
 * );
 * ```
 */
export async function syncParallelMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options: ParallelOptions = {}
): Promise<ParallelResult<R>> {
  const fns = items.map((item, index) => () => fn(item, index));
  return syncParallel(fns, options);
}

/**
 * ⚡ syncParallelFilter - Filtra items de forma assíncrona em paralelo
 * 
 * @example
 * ```typescript
 * const activeUsers = await syncParallelFilter(
 *   users,
 *   async (user) => await checkIfActive(user.id)
 * );
 * ```
 */
export async function syncParallelFilter<T>(
  items: T[],
  predicate: (item: T, index: number) => Promise<boolean>,
  options: ParallelOptions = {}
): Promise<T[]> {
  const fns = items.map((item, index) => async () => {
    const keep = await predicate(item, index);
    return { item, keep };
  });

  const result = await syncParallel(fns, options);

  if (!result.success || !result.data) {
    return [];
  }

  return result.data
    .filter(r => r.keep)
    .map(r => r.item);
}

/**
 * ⚡ syncParallelReduce - Reduce assíncrono com paralelismo na fase de map
 * 
 * @example
 * ```typescript
 * const totalPrice = await syncParallelReduce(
 *   productIds,
 *   async (id) => fetchProduct(id),
 *   (acc, product) => acc + product.price,
 *   0
 * );
 * ```
 */
export async function syncParallelReduce<T, M, R>(
  items: T[],
  mapFn: (item: T, index: number) => Promise<M>,
  reduceFn: (acc: R, mapped: M, index: number) => R,
  initialValue: R,
  options: ParallelOptions = {}
): Promise<R> {
  const result = await syncParallelMap(items, mapFn, options);

  if (!result.success || !result.data) {
    return initialValue;
  }

  return result.data.reduce(reduceFn, initialValue);
}

/**
 * ⚡ createParallelBatch - Cria um executor de batches paralelos
 * 
 * @example
 * ```typescript
 * const batchExecutor = createParallelBatch<number, User>(
 *   async (id) => fetchUser(id),
 *   { maxConcurrency: 5 }
 * );
 * 
 * const users = await batchExecutor([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * // Executa no máximo 5 por vez
 * ```
 */
export function createParallelBatch<T, R>(
  fn: (item: T) => Promise<R>,
  options: ParallelOptions = {}
): (items: T[]) => Promise<ParallelResult<R>> {
  return (items: T[]) => syncParallelMap(items, fn, options);
}

