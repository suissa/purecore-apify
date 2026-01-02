/**
 * 🔗 syncFlow - Pipe de funções assíncronas sequenciais
 * @module @purecore/syncify/utils/syncFlow
 * 
 * Executa uma sequência de funções assíncronas onde o resultado
 * de uma é passado como argumento para a próxima (como um for await of).
 */

import type { AsyncFn, FlowOptions, FlowResult, ExecutionResult } from '../types';

/**
 * Cria um controller para cancelamento
 */
export class FlowController {
  private _cancelled = false;
  private _reason?: string;

  get cancelled(): boolean {
    return this._cancelled;
  }

  get reason(): string | undefined {
    return this._reason;
  }

  cancel(reason?: string): void {
    this._cancelled = true;
    this._reason = reason;
  }
}

/**
 * 🔗 syncFlow - Executa funções assíncronas em sequência (pipe)
 * 
 * @param fns - Array de funções assíncronas
 * @param initialValue - Valor inicial para a primeira função
 * @param options - Opções de configuração
 * @returns Promise com o resultado final
 * 
 * @example
 * ```typescript
 * const result = await syncFlow([
 *   async (x) => x * 2,
 *   async (x) => x + 10,
 *   async (x) => `Resultado: ${x}`
 * ], 5);
 * // result = "Resultado: 20"
 * ```
 */
export async function syncFlow<T, R>(
  fns: AsyncFn<unknown, unknown>[],
  initialValue: T,
  options: FlowOptions = {}
): Promise<FlowResult<R>> {
  const {
    timeout,
    onStep,
    onError,
    continueOnError = false
  } = options;

  const steps: ExecutionResult<unknown>[] = [];
  const startTime = Date.now();
  let currentValue: unknown = initialValue;
  let completedSteps = 0;

  const executeWithTimeout = async <U>(
    fn: AsyncFn<unknown, U>,
    input: unknown,
    stepIndex: number
  ): Promise<ExecutionResult<U>> => {
    const stepStart = Date.now();

    try {
      let result: U;

      if (timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Step ${stepIndex} timeout after ${timeout}ms`)), timeout);
        });
        result = await Promise.race([fn(input), timeoutPromise]);
      } else {
        result = await fn(input);
      }

      const stepResult: ExecutionResult<U> = {
        success: true,
        data: result,
        duration: Date.now() - stepStart,
        timestamp: new Date()
      };

      onStep?.(stepIndex, result);
      return stepResult;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err, stepIndex);

      return {
        success: false,
        error: err,
        duration: Date.now() - stepStart,
        timestamp: new Date()
      };
    }
  };

  for (let i = 0; i < fns.length; i++) {
    const stepResult = await executeWithTimeout(fns[i], currentValue, i);
    steps.push(stepResult);

    if (!stepResult.success) {
      if (!continueOnError) {
        return {
          success: false,
          error: stepResult.error,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          steps,
          totalSteps: fns.length,
          completedSteps
        };
      }
      currentValue = undefined;
    } else {
      currentValue = stepResult.data;
      completedSteps++;
    }
  }

  return {
    success: true,
    data: currentValue as R,
    duration: Date.now() - startTime,
    timestamp: new Date(),
    steps,
    totalSteps: fns.length,
    completedSteps
  };
}

/**
 * 🔗 syncFlowSimple - Versão simplificada do syncFlow
 * Retorna apenas o resultado final (sem metadados)
 * 
 * @example
 * ```typescript
 * const result = await syncFlowSimple([
 *   async (x) => x * 2,
 *   async (x) => x + 10
 * ], 5);
 * // result = 20
 * ```
 */
export async function syncFlowSimple<T, R>(
  fns: AsyncFn<unknown, unknown>[],
  initialValue: T
): Promise<R> {
  let currentValue: unknown = initialValue;

  for (const fn of fns) {
    currentValue = await fn(currentValue);
  }

  return currentValue as R;
}

/**
 * 🔗 createSyncFlow - Factory para criar um flow reutilizável
 * 
 * @example
 * ```typescript
 * const processUser = createSyncFlow([
 *   async (id) => fetchUser(id),
 *   async (user) => validateUser(user),
 *   async (user) => enrichUser(user)
 * ]);
 * 
 * const user1 = await processUser(1);
 * const user2 = await processUser(2);
 * ```
 */
export function createSyncFlow<T, R>(
  fns: AsyncFn<unknown, unknown>[],
  options: FlowOptions = {}
): (initialValue: T) => Promise<FlowResult<R>> {
  return (initialValue: T) => syncFlow<T, R>(fns, initialValue, options);
}

/**
 * 🔗 syncFlowWithController - Flow com controle de cancelamento
 * 
 * @example
 * ```typescript
 * const controller = new FlowController();
 * 
 * const flowPromise = syncFlowWithController([
 *   async (x) => { await delay(1000); return x * 2; },
 *   async (x) => { await delay(1000); return x + 10; }
 * ], 5, controller);
 * 
 * // Cancelar após 500ms
 * setTimeout(() => controller.cancel('Timeout'), 500);
 * 
 * const result = await flowPromise;
 * // result.success = false, result.error = 'Flow cancelled: Timeout'
 * ```
 */
export async function syncFlowWithController<T, R>(
  fns: AsyncFn<unknown, unknown>[],
  initialValue: T,
  controller: FlowController,
  options: FlowOptions = {}
): Promise<FlowResult<R>> {
  const { onStep, onError, continueOnError = false } = options;

  const steps: ExecutionResult<unknown>[] = [];
  const startTime = Date.now();
  let currentValue: unknown = initialValue;
  let completedSteps = 0;

  for (let i = 0; i < fns.length; i++) {
    if (controller.cancelled) {
      return {
        success: false,
        error: new Error(`Flow cancelled: ${controller.reason || 'No reason provided'}`),
        duration: Date.now() - startTime,
        timestamp: new Date(),
        steps,
        totalSteps: fns.length,
        completedSteps
      };
    }

    const stepStart = Date.now();

    try {
      const result = await fns[i](currentValue);
      
      const stepResult: ExecutionResult<unknown> = {
        success: true,
        data: result,
        duration: Date.now() - stepStart,
        timestamp: new Date()
      };

      steps.push(stepResult);
      onStep?.(i, result);
      currentValue = result;
      completedSteps++;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err, i);

      const stepResult: ExecutionResult<unknown> = {
        success: false,
        error: err,
        duration: Date.now() - stepStart,
        timestamp: new Date()
      };

      steps.push(stepResult);

      if (!continueOnError) {
        return {
          success: false,
          error: err,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          steps,
          totalSteps: fns.length,
          completedSteps
        };
      }
      currentValue = undefined;
    }
  }

  return {
    success: true,
    data: currentValue as R,
    duration: Date.now() - startTime,
    timestamp: new Date(),
    steps,
    totalSteps: fns.length,
    completedSteps
  };
}

/**
 * 🔗 composeSyncFlow - Compõe múltiplos flows em um único
 * 
 * @example
 * ```typescript
 * const flow1 = createSyncFlow([fn1, fn2]);
 * const flow2 = createSyncFlow([fn3, fn4]);
 * 
 * const composedFlow = composeSyncFlow(flow1, flow2);
 * const result = await composedFlow(initialValue);
 * ```
 */
export function composeSyncFlow<T, R>(
  ...flows: ((input: unknown) => Promise<FlowResult<unknown>>)[]
): (initialValue: T) => Promise<FlowResult<R>> {
  return async (initialValue: T): Promise<FlowResult<R>> => {
    const allSteps: ExecutionResult<unknown>[] = [];
    const startTime = Date.now();
    let currentValue: unknown = initialValue;
    let totalSteps = 0;
    let completedSteps = 0;

    for (const flow of flows) {
      const result = await flow(currentValue);
      
      allSteps.push(...result.steps);
      totalSteps += result.totalSteps;
      completedSteps += result.completedSteps;

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          steps: allSteps,
          totalSteps,
          completedSteps
        };
      }

      currentValue = result.data;
    }

    return {
      success: true,
      data: currentValue as R,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      steps: allSteps,
      totalSteps,
      completedSteps
    };
  };
}

