/**
 * 🏁 syncRace - Primeira função a resolver vence
 * @module @purecore/syncify/utils/syncRace
 * 
 * Executa múltiplas funções assíncronas e retorna o primeiro resultado.
 */

import type { AsyncFnNoInput, RaceOptions, RaceResult } from '../types';

/**
 * 🏁 syncRace - Executa funções em corrida
 * 
 * @param fns - Array de funções assíncronas
 * @param options - Opções de configuração
 * @returns Promise com o primeiro resultado
 * 
 * @example
 * ```typescript
 * const result = await syncRace([
 *   async () => { await delay(100); return 'fast'; },
 *   async () => { await delay(500); return 'slow'; }
 * ]);
 * // result.data = 'fast', result.winnerIndex = 0
 * ```
 */
export async function syncRace<T>(
  fns: AsyncFnNoInput<T>[],
  options: RaceOptions = {}
): Promise<RaceResult<T>> {
  const { timeout, onWin, cancelOnWin = false } = options;
  const startTime = Date.now();

  // AbortController para cancelamento
  const abortControllers = fns.map(() => new AbortController());

  const wrappedFns = fns.map((fn, index) => 
    new Promise<{ result: T; index: number; duration: number }>((resolve, reject) => {
      const fnStart = Date.now();
      const signal = abortControllers[index].signal;

      // Checa se já foi cancelado
      if (signal.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      fn()
        .then(result => {
          if (!signal.aborted) {
            resolve({ 
              result, 
              index, 
              duration: Date.now() - fnStart 
            });
          }
        })
        .catch(reject);
    })
  );

  // Adiciona timeout se configurado
  if (timeout) {
    wrappedFns.push(
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Race timeout after ${timeout}ms`)), timeout);
      })
    );
  }

  try {
    const winner = await Promise.race(wrappedFns);
    
    // Cancela as outras funções se configurado
    if (cancelOnWin) {
      abortControllers.forEach((controller, i) => {
        if (i !== winner.index) {
          controller.abort();
        }
      });
    }

    // Callback de vitória
    onWin?.(winner.result, winner.index, winner.duration);

    return {
      success: true,
      data: winner.result,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      winnerIndex: winner.index,
      totalParticipants: fns.length
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      duration: Date.now() - startTime,
      timestamp: new Date(),
      winnerIndex: -1,
      totalParticipants: fns.length
    };
  }
}

/**
 * 🏁 syncRaceSimple - Versão simplificada (equivalente a Promise.race)
 * 
 * @example
 * ```typescript
 * const fastestResult = await syncRaceSimple([
 *   () => fetchFromServer1(),
 *   () => fetchFromServer2()
 * ]);
 * ```
 */
export async function syncRaceSimple<T>(
  fns: AsyncFnNoInput<T>[]
): Promise<T> {
  return Promise.race(fns.map(fn => fn()));
}

/**
 * 🏁 syncRaceWithFallback - Corrida com fallback em caso de erro
 * 
 * @example
 * ```typescript
 * const result = await syncRaceWithFallback(
 *   [
 *     () => fetchFromPrimary(),
 *     () => fetchFromSecondary()
 *   ],
 *   () => fetchFromCache() // fallback
 * );
 * ```
 */
export async function syncRaceWithFallback<T>(
  fns: AsyncFnNoInput<T>[],
  fallback: AsyncFnNoInput<T>,
  options: RaceOptions = {}
): Promise<RaceResult<T>> {
  const result = await syncRace(fns, options);

  if (!result.success) {
    const startTime = Date.now();
    try {
      const fallbackResult = await fallback();
      return {
        success: true,
        data: fallbackResult,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        winnerIndex: -1, // -1 indica fallback
        totalParticipants: fns.length + 1
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
        timestamp: new Date(),
        winnerIndex: -1,
        totalParticipants: fns.length + 1
      };
    }
  }

  return result;
}

/**
 * 🏁 syncRaceFirst - Retorna o primeiro resultado bem-sucedido
 * 
 * Diferente do race normal, continua tentando se uma função falhar.
 * 
 * @example
 * ```typescript
 * const result = await syncRaceFirst([
 *   () => failingServer(),  // Falha
 *   () => workingServer()   // Retorna resultado
 * ]);
 * ```
 */
export async function syncRaceFirst<T>(
  fns: AsyncFnNoInput<T>[],
  options: RaceOptions = {}
): Promise<RaceResult<T>> {
  const { timeout, onWin } = options;
  const startTime = Date.now();
  const errors: Error[] = [];

  const wrappedFns = fns.map((fn, index) => 
    new Promise<{ result: T; index: number; duration: number }>((resolve, reject) => {
      const fnStart = Date.now();

      fn()
        .then(result => {
          resolve({ 
            result, 
            index, 
            duration: Date.now() - fnStart 
          });
        })
        .catch(error => {
          errors.push(error instanceof Error ? error : new Error(String(error)));
          // Só rejeita se todas falharem
          if (errors.length === fns.length) {
            reject(new AggregateError(errors, 'All promises rejected'));
          }
        });
    })
  );

  // Adiciona timeout se configurado
  const allPromises = [...wrappedFns];
  if (timeout) {
    allPromises.push(
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Race timeout after ${timeout}ms`)), timeout);
      })
    );
  }

  try {
    const winner = await Promise.race(allPromises);
    
    onWin?.(winner.result, winner.index, winner.duration);

    return {
      success: true,
      data: winner.result,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      winnerIndex: winner.index,
      totalParticipants: fns.length
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      duration: Date.now() - startTime,
      timestamp: new Date(),
      winnerIndex: -1,
      totalParticipants: fns.length
    };
  }
}

/**
 * 🏁 syncRaceTimeout - Corrida com timeout individual por função
 * 
 * @example
 * ```typescript
 * const result = await syncRaceTimeout([
 *   { fn: () => fastOperation(), timeout: 100 },
 *   { fn: () => slowOperation(), timeout: 500 }
 * ]);
 * ```
 */
export async function syncRaceTimeout<T>(
  items: Array<{ fn: AsyncFnNoInput<T>; timeout: number }>,
  options: RaceOptions = {}
): Promise<RaceResult<T>> {
  const wrappedFns = items.map(({ fn, timeout }) => 
    async (): Promise<T> => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Individual timeout after ${timeout}ms`)), timeout);
      });
      return Promise.race([fn(), timeoutPromise]);
    }
  );

  return syncRace(wrappedFns, options);
}

/**
 * 🏁 createRaceExecutor - Factory para criar um executor de corrida reutilizável
 * 
 * @example
 * ```typescript
 * const fetchRace = createRaceExecutor<Response>({
 *   timeout: 5000,
 *   onWin: (result, index) => console.log(`Server ${index} won!`)
 * });
 * 
 * const response = await fetchRace([
 *   () => fetch(server1),
 *   () => fetch(server2)
 * ]);
 * ```
 */
export function createRaceExecutor<T>(
  options: RaceOptions = {}
): (fns: AsyncFnNoInput<T>[]) => Promise<RaceResult<T>> {
  return (fns: AsyncFnNoInput<T>[]) => syncRace(fns, options);
}

