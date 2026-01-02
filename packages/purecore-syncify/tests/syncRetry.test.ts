/**
 * 🧪 Testes - syncRetry
 */

import { describe, test, expect } from 'bun:test';
import { 
  syncRetry, 
  syncRetrySimple,
  syncRetryConditional,
  createRetryExecutor,
  withRetry
} from '../src/utils/syncRetry';

describe('syncRetry', () => {
  test('deve retornar sucesso na primeira tentativa', async () => {
    const result = await syncRetry(async () => 'success');

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(1);
    expect(result.errors.length).toBe(0);
  });

  test('deve fazer retry em caso de erro', async () => {
    let attempts = 0;

    const result = await syncRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      },
      { maxRetries: 3, baseDelay: 10 }
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(3);
    expect(result.errors.length).toBe(2);
  });

  test('deve falhar após máximo de retries', async () => {
    const result = await syncRetry(
      async () => { throw new Error('Always fails'); },
      { maxRetries: 2, baseDelay: 10 }
    );

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3); // 1 inicial + 2 retries
    expect(result.errors.length).toBe(3);
  });

  test('deve chamar onRetry callback', async () => {
    const retries: number[] = [];
    let attempts = 0;

    await syncRetry(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
        return 'success';
      },
      { 
        maxRetries: 3, 
        baseDelay: 10,
        onRetry: (_, attempt) => retries.push(attempt)
      }
    );

    expect(retries).toEqual([1, 2]);
  });

  test('deve respeitar shouldRetry', async () => {
    const result = await syncRetry(
      async () => { throw new Error('Do not retry'); },
      { 
        maxRetries: 5, 
        baseDelay: 10,
        shouldRetry: (err) => !err.message.includes('Do not retry')
      }
    );

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
  });

  test('deve aplicar backoff exponencial', async () => {
    const delays: number[] = [];
    let lastTime = Date.now();
    let attempts = 0;

    await syncRetry(
      async () => {
        attempts++;
        const now = Date.now();
        if (attempts > 1) {
          delays.push(now - lastTime);
        }
        lastTime = now;
        if (attempts < 4) throw new Error('fail');
        return 'success';
      },
      { maxRetries: 3, baseDelay: 50, backoffMultiplier: 2 }
    );

    // Delays devem ser aproximadamente 50, 100, 200
    expect(delays[0]).toBeGreaterThan(40);
    expect(delays[1]).toBeGreaterThan(80);
    expect(delays[2]).toBeGreaterThan(160);
  });
});

describe('syncRetrySimple', () => {
  test('deve retornar valor diretamente', async () => {
    const result = await syncRetrySimple(async () => 'value');
    expect(result).toBe('value');
  });

  test('deve lançar erro após falhas', async () => {
    await expect(
      syncRetrySimple(async () => { throw new Error('fail'); }, 1)
    ).rejects.toThrow('fail');
  });
});

describe('syncRetryConditional', () => {
  test('deve fazer retry até condição ser satisfeita', async () => {
    let count = 0;

    const result = await syncRetryConditional(
      async () => {
        count++;
        return count;
      },
      (value) => value >= 3,
      { maxRetries: 5, baseDelay: 10 }
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe(3);
    expect(result.attempts).toBe(3);
  });
});

describe('createRetryExecutor', () => {
  test('deve criar executor reutilizável', async () => {
    const retryFetch = createRetryExecutor<string>({ maxRetries: 2, baseDelay: 10 });

    const result = await retryFetch(async () => 'data');

    expect(result.success).toBe(true);
    expect(result.data).toBe('data');
  });
});

describe('withRetry', () => {
  test('deve criar wrapper com retry', async () => {
    const fn = async () => 'value';
    const fnWithRetry = withRetry(fn, { maxRetries: 2 });

    const result = await fnWithRetry();

    expect(result.success).toBe(true);
    expect(result.data).toBe('value');
  });
});

