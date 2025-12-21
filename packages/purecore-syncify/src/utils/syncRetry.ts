/**
 * 🔄 syncRetry - Retry automático com backoff exponencial
 * @module @purecore/syncify/utils/syncRetry
 * 
 * Executa uma função assíncrona com retry automático em caso de falha.
 */

import type { AsyncFn, AsyncFnNoInput, RetryOptions, ExecutionResult } from '../types';

/**
 * Resultado do Retry
 */
export interface RetryResult<T> extends ExecutionResult<T> {
  attempts: number;
  errors: Error[];
  totalDelay: number;
}

/**
 * Opções padrão de retry
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
  shouldRetry: () => true,
  onRetry: () => {}
};

/**
 * Calcula o delay com backoff exponencial
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  backoffMultiplier: number,
  maxDelay: number
): number {
  const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Delay assíncrono
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🔄 syncRetry - Executa função com retry automático
 * 
 * @param fn - Função assíncrona a executar
 * @param options - Opções de retry
 * @returns Promise com resultado e metadados
 * 
 * @example
 * ```typescript
 * const result = await syncRetry(
 *   () => fetchUnstableAPI(),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */
export async function syncRetry<T>(
  fn: AsyncFnNoInput<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const {
    maxRetries,
    baseDelay,
    backoffMultiplier,
    maxDelay,
    shouldRetry,
    onRetry
  } = config;

  const startTime = Date.now();
  const errors: Error[] = [];
  let totalDelay = 0;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await fn();

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        attempts: attempt,
        errors,
        totalDelay
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);

      // Se é a última tentativa ou não deve retry
      if (attempt > maxRetries || !shouldRetry(err, attempt)) {
        return {
          success: false,
          error: err,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          attempts: attempt,
          errors,
          totalDelay
        };
      }

      // Calcula delay e espera
      const waitTime = calculateDelay(attempt, baseDelay, backoffMultiplier!, maxDelay!);
      totalDelay += waitTime;
      
      onRetry(err, attempt);
      await delay(waitTime);
    }
  }

  // Não deveria chegar aqui, mas TypeScript precisa
  return {
    success: false,
    error: new Error('Unexpected retry flow'),
    duration: Date.now() - startTime,
    timestamp: new Date(),
    attempts: maxRetries + 1,
    errors,
    totalDelay
  };
}

/**
 * 🔄 syncRetrySimple - Versão simplificada do retry
 * 
 * @example
 * ```typescript
 * const data = await syncRetrySimple(
 *   () => fetchAPI(),
 *   3 // máximo de tentativas
 * );
 * ```
 */
export async function syncRetrySimple<T>(
  fn: AsyncFnNoInput<T>,
  maxRetries: number = 3
): Promise<T> {
  const result = await syncRetry(fn, { maxRetries });
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.data!;
}

/**
 * 🔄 syncRetryWithInput - Retry com input para a função
 * 
 * @example
 * ```typescript
 * const user = await syncRetryWithInput(
 *   async (id) => fetchUser(id),
 *   123,
 *   { maxRetries: 3 }
 * );
 * ```
 */
export async function syncRetryWithInput<T, R>(
  fn: AsyncFn<T, R>,
  input: T,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<R>> {
  return syncRetry(() => fn(input), options);
}

/**
 * 🔄 syncRetryConditional - Retry com condição de sucesso
 * 
 * Permite definir uma condição para considerar o resultado válido.
 * 
 * @example
 * ```typescript
 * const result = await syncRetryConditional(
 *   () => fetchStatus(),
 *   (status) => status === 'ready', // Só para quando status for 'ready'
 *   { maxRetries: 10, baseDelay: 500 }
 * );
 * ```
 */
export async function syncRetryConditional<T>(
  fn: AsyncFnNoInput<T>,
  condition: (result: T) => boolean,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const {
    maxRetries,
    baseDelay,
    backoffMultiplier,
    maxDelay,
    onRetry
  } = config;

  const startTime = Date.now();
  const errors: Error[] = [];
  let totalDelay = 0;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await fn();

      if (condition(result)) {
        return {
          success: true,
          data: result,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          attempts: attempt,
          errors,
          totalDelay
        };
      }

      // Resultado não satisfaz condição
      const err = new Error(`Condition not met on attempt ${attempt}`);
      errors.push(err);

      if (attempt > maxRetries) {
        return {
          success: false,
          error: err,
          data: result, // Inclui último resultado mesmo que não satisfaça
          duration: Date.now() - startTime,
          timestamp: new Date(),
          attempts: attempt,
          errors,
          totalDelay
        };
      }

      const waitTime = calculateDelay(attempt, baseDelay, backoffMultiplier!, maxDelay!);
      totalDelay += waitTime;
      
      onRetry(err, attempt);
      await delay(waitTime);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);

      if (attempt > maxRetries) {
        return {
          success: false,
          error: err,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          attempts: attempt,
          errors,
          totalDelay
        };
      }

      const waitTime = calculateDelay(attempt, baseDelay, backoffMultiplier!, maxDelay!);
      totalDelay += waitTime;
      
      onRetry(err, attempt);
      await delay(waitTime);
    }
  }

  return {
    success: false,
    error: new Error('Unexpected retry flow'),
    duration: Date.now() - startTime,
    timestamp: new Date(),
    attempts: maxRetries + 1,
    errors,
    totalDelay
  };
}

/**
 * 🔄 syncRetryUntilTimeout - Retry até um timeout total
 * 
 * @example
 * ```typescript
 * const result = await syncRetryUntilTimeout(
 *   () => checkServiceReady(),
 *   30000, // timeout total de 30 segundos
 *   { baseDelay: 1000 }
 * );
 * ```
 */
export async function syncRetryUntilTimeout<T>(
  fn: AsyncFnNoInput<T>,
  timeout: number,
  options: Partial<Omit<RetryOptions, 'maxRetries'>> = {}
): Promise<RetryResult<T>> {
  const config = { 
    ...DEFAULT_RETRY_OPTIONS, 
    ...options,
    maxRetries: Infinity 
  };
  const { baseDelay, backoffMultiplier, maxDelay, shouldRetry, onRetry } = config;

  const startTime = Date.now();
  const errors: Error[] = [];
  let totalDelay = 0;
  let attempt = 0;

  while (Date.now() - startTime < timeout) {
    attempt++;

    try {
      const result = await fn();

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        attempts: attempt,
        errors,
        totalDelay
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);

      if (!shouldRetry(err, attempt)) {
        return {
          success: false,
          error: err,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          attempts: attempt,
          errors,
          totalDelay
        };
      }

      const waitTime = calculateDelay(attempt, baseDelay, backoffMultiplier!, maxDelay!);
      
      // Verifica se ainda há tempo
      if (Date.now() - startTime + waitTime >= timeout) {
        return {
          success: false,
          error: new Error(`Timeout after ${timeout}ms`),
          duration: Date.now() - startTime,
          timestamp: new Date(),
          attempts: attempt,
          errors,
          totalDelay
        };
      }

      totalDelay += waitTime;
      onRetry(err, attempt);
      await delay(waitTime);
    }
  }

  return {
    success: false,
    error: new Error(`Timeout after ${timeout}ms`),
    duration: Date.now() - startTime,
    timestamp: new Date(),
    attempts: attempt,
    errors,
    totalDelay
  };
}

/**
 * 🔄 createRetryExecutor - Factory para criar um executor de retry reutilizável
 * 
 * @example
 * ```typescript
 * const retryFetch = createRetryExecutor<Response>({
 *   maxRetries: 3,
 *   baseDelay: 1000,
 *   onRetry: (err, attempt) => console.log(`Retry ${attempt}: ${err.message}`)
 * });
 * 
 * const response = await retryFetch(() => fetch(url));
 * ```
 */
export function createRetryExecutor<T>(
  options: Partial<RetryOptions> = {}
): (fn: AsyncFnNoInput<T>) => Promise<RetryResult<T>> {
  return (fn: AsyncFnNoInput<T>) => syncRetry(fn, options);
}

/**
 * 🔄 withRetry - HOF que adiciona retry a uma função
 * 
 * @example
 * ```typescript
 * const fetchWithRetry = withRetry(fetchData, { maxRetries: 3 });
 * const data = await fetchWithRetry();
 * ```
 */
export function withRetry<T>(
  fn: AsyncFnNoInput<T>,
  options: Partial<RetryOptions> = {}
): AsyncFnNoInput<RetryResult<T>> {
  return () => syncRetry(fn, options);
}

/**
 * 🔄 withRetryInput - HOF que adiciona retry a uma função com input
 * 
 * @example
 * ```typescript
 * const fetchUserWithRetry = withRetryInput(fetchUser, { maxRetries: 3 });
 * const user = await fetchUserWithRetry(123);
 * ```
 */
export function withRetryInput<T, R>(
  fn: AsyncFn<T, R>,
  options: Partial<RetryOptions> = {}
): AsyncFn<T, RetryResult<R>> {
  return (input: T) => syncRetryWithInput(fn, input, options);
}

