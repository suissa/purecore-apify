/**
 * 🧪 Testes - syncFlow
 */

import { describe, test, expect } from 'bun:test';
import { 
  syncFlow, 
  syncFlowSimple, 
  createSyncFlow,
  syncFlowWithController,
  FlowController,
  composeSyncFlow
} from '../src/utils/syncFlow';
import { delay } from '../src/index';

describe('syncFlow', () => {
  test('deve executar funções em sequência', async () => {
    const result = await syncFlow<number, number>([
      async (x) => x * 2,
      async (x) => x + 10,
      async (x) => x * 3
    ], 5);

    expect(result.success).toBe(true);
    expect(result.data).toBe(60); // (5 * 2 + 10) * 3 = 60
    expect(result.completedSteps).toBe(3);
    expect(result.totalSteps).toBe(3);
  });

  test('deve passar resultado entre funções', async () => {
    const steps: number[] = [];

    const result = await syncFlow<number, string>([
      async (x) => { steps.push(x as number); return (x as number) + 1; },
      async (x) => { steps.push(x as number); return (x as number) + 1; },
      async (x) => { steps.push(x as number); return `Final: ${x}`; }
    ], 0);

    expect(result.success).toBe(true);
    expect(result.data).toBe('Final: 2');
    expect(steps).toEqual([0, 1, 2]);
  });

  test('deve parar em caso de erro', async () => {
    const result = await syncFlow<number, number>([
      async (x) => x * 2,
      async () => { throw new Error('Erro no step 2'); },
      async (x) => x * 3
    ], 5);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Erro no step 2');
    expect(result.completedSteps).toBe(1);
    expect(result.totalSteps).toBe(3);
  });

  test('deve continuar em caso de erro com continueOnError', async () => {
    const result = await syncFlow<number, unknown>([
      async (x) => x * 2,
      async () => { throw new Error('Erro no step 2'); },
      async (x) => x === undefined ? 'undefined input' : x
    ], 5, { continueOnError: true });

    expect(result.success).toBe(true);
    expect(result.data).toBe('undefined input');
    expect(result.completedSteps).toBe(2); // step 1 e step 3
  });

  test('deve chamar onStep callback', async () => {
    const stepResults: Array<{ index: number; result: unknown }> = [];

    await syncFlow<number, number>([
      async (x) => x * 2,
      async (x) => x + 10
    ], 5, {
      onStep: (index, result) => {
        stepResults.push({ index, result });
      }
    });

    expect(stepResults).toEqual([
      { index: 0, result: 10 },
      { index: 1, result: 20 }
    ]);
  });

  test('deve respeitar timeout', async () => {
    const result = await syncFlow<number, number>([
      async (x) => { await delay(100); return x * 2; },
      async (x) => { await delay(100); return x + 10; }
    ], 5, { timeout: 50 });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('timeout');
  });
});

describe('syncFlowSimple', () => {
  test('deve retornar apenas o resultado final', async () => {
    const result = await syncFlowSimple<number, number>([
      async (x) => x * 2,
      async (x) => x + 10
    ], 5);

    expect(result).toBe(20);
  });
});

describe('createSyncFlow', () => {
  test('deve criar flow reutilizável', async () => {
    const multiplyAndAdd = createSyncFlow<number, number>([
      async (x) => x * 2,
      async (x) => x + 10
    ]);

    const result1 = await multiplyAndAdd(5);
    const result2 = await multiplyAndAdd(10);

    expect(result1.data).toBe(20);
    expect(result2.data).toBe(30);
  });
});

describe('syncFlowWithController', () => {
  test('deve permitir cancelamento', async () => {
    const controller = new FlowController();

    const flowPromise = syncFlowWithController<number, number>([
      async (x) => { await delay(50); return x * 2; },
      async (x) => { await delay(50); return x + 10; },
      async (x) => { await delay(50); return x * 3; }
    ], 5, controller);

    // Cancela após 30ms
    setTimeout(() => controller.cancel('Test cancellation'), 30);

    const result = await flowPromise;

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('cancelled');
    expect(controller.cancelled).toBe(true);
    expect(controller.reason).toBe('Test cancellation');
  });
});

describe('composeSyncFlow', () => {
  test('deve compor múltiplos flows', async () => {
    const flow1 = createSyncFlow<number, number>([
      async (x) => x * 2
    ]);

    const flow2 = createSyncFlow<number, number>([
      async (x) => x + 10
    ]);

    const composed = composeSyncFlow<number, number>(flow1, flow2);
    const result = await composed(5);

    expect(result.success).toBe(true);
    expect(result.data).toBe(20); // 5 * 2 + 10 = 20
    expect(result.totalSteps).toBe(2);
  });
});

