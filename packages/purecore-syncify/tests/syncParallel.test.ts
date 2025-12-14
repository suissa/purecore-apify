/**
 * 🧪 Testes - syncParallel
 */

import { describe, test, expect } from 'bun:test';
import { 
  syncParallel, 
  syncParallelSimple,
  syncParallelSettled,
  syncParallelMap,
  syncParallelFilter
} from '../src/utils/syncParallel';
import { delay } from '../src/index';

describe('syncParallel', () => {
  test('deve executar funções em paralelo', async () => {
    const start = Date.now();

    const result = await syncParallel([
      async () => { await delay(50); return 1; },
      async () => { await delay(50); return 2; },
      async () => { await delay(50); return 3; }
    ]);

    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(result.data).toEqual([1, 2, 3]);
    expect(duration).toBeLessThan(150); // Deve ser paralelo, não sequencial
  });

  test('deve falhar com failMode all', async () => {
    const result = await syncParallel([
      async () => 1,
      async () => { throw new Error('Erro'); },
      async () => 3
    ], { failMode: 'all' });

    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.successful).toBe(2);
  });

  test('deve retornar todos com failMode settled', async () => {
    const result = await syncParallel([
      async () => 1,
      async () => { throw new Error('Erro'); },
      async () => 3
    ], { failMode: 'settled' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual([1, 3]);
    expect(result.results[0].status).toBe('fulfilled');
    expect(result.results[1].status).toBe('rejected');
    expect(result.results[2].status).toBe('fulfilled');
  });

  test('deve respeitar concorrência máxima', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const result = await syncParallel(
      Array(10).fill(null).map(() => async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await delay(20);
        concurrent--;
        return maxConcurrent;
      }),
      { maxConcurrency: 3 }
    );

    expect(result.success).toBe(true);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  test('deve respeitar timeout', async () => {
    const result = await syncParallel([
      async () => { await delay(100); return 1; },
      async () => { await delay(200); return 2; }
    ], { timeout: 50 });

    expect(result.success).toBe(false);
    expect(result.failed).toBe(2);
  });
});

describe('syncParallelSimple', () => {
  test('deve funcionar como Promise.all', async () => {
    const result = await syncParallelSimple([
      async () => 1,
      async () => 2,
      async () => 3
    ]);

    expect(result).toEqual([1, 2, 3]);
  });
});

describe('syncParallelSettled', () => {
  test('deve retornar resultados settled', async () => {
    const results = await syncParallelSettled([
      async () => 'success',
      async () => { throw new Error('fail'); }
    ]);

    expect(results[0].status).toBe('fulfilled');
    expect(results[0].value).toBe('success');
    expect(results[1].status).toBe('rejected');
    expect(results[1].reason?.message).toBe('fail');
  });
});

describe('syncParallelMap', () => {
  test('deve mapear array em paralelo', async () => {
    const result = await syncParallelMap(
      [1, 2, 3],
      async (x) => x * 2
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual([2, 4, 6]);
  });
});

describe('syncParallelFilter', () => {
  test('deve filtrar array em paralelo', async () => {
    const result = await syncParallelFilter(
      [1, 2, 3, 4, 5],
      async (x) => x % 2 === 0
    );

    expect(result).toEqual([2, 4]);
  });
});

