/**
 * 🧪 Testes - syncPubSub
 */

import { describe, test, expect } from 'bun:test';
import { 
  SyncPubSub,
  RequestResponse,
  createPubSub
} from '../src/utils/syncPubSub';
import { delay } from '../src/index';

describe('SyncPubSub', () => {
  test('deve publicar e receber mensagens', async () => {
    const pubsub = new SyncPubSub<string, string>();

    pubsub.subscribe('test', async (data) => {
      return `Received: ${data}`;
    });

    const result = await pubsub.publish('test', 'Hello');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(['Received: Hello']);
    expect(result.subscriberCount).toBe(1);
  });

  test('deve suportar múltiplos subscribers', async () => {
    const pubsub = new SyncPubSub<number, number>();

    pubsub.subscribe('calc', async (x) => x * 2);
    pubsub.subscribe('calc', async (x) => x + 10);

    const result = await pubsub.publish('calc', 5);

    expect(result.success).toBe(true);
    expect(result.data).toContain(10);
    expect(result.data).toContain(15);
    expect(result.subscriberCount).toBe(2);
  });

  test('deve retornar vazio se não houver subscribers', async () => {
    const pubsub = new SyncPubSub();

    const result = await pubsub.publish('empty', { data: 'test' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(result.subscriberCount).toBe(0);
  });

  test('deve permitir unsubscribe', async () => {
    const pubsub = new SyncPubSub<string, string>();

    const id = pubsub.subscribe('test', async (data) => `Got: ${data}`);
    
    expect(pubsub.subscriberCount('test')).toBe(1);
    
    pubsub.unsubscribe('test', id);
    
    expect(pubsub.subscriberCount('test')).toBe(0);
  });

  test('deve listar tópicos', async () => {
    const pubsub = new SyncPubSub();

    pubsub.subscribe('topic1', async () => {});
    pubsub.subscribe('topic2', async () => {});
    pubsub.subscribe('topic3', async () => {});

    const topics = pubsub.topics();

    expect(topics).toContain('topic1');
    expect(topics).toContain('topic2');
    expect(topics).toContain('topic3');
  });

  test('deve publicar para subscriber específico', async () => {
    const pubsub = new SyncPubSub<number, string>();

    pubsub.subscribe('calc', async (x) => `Sub1: ${x}`);
    const id2 = pubsub.subscribe('calc', async (x) => `Sub2: ${x}`);

    const response = await pubsub.publishTo('calc', id2, 42);

    expect(response).not.toBeNull();
    expect(response?.result).toBe('Sub2: 42');
  });
});

describe('RequestResponse', () => {
  test('deve implementar padrão request/response', async () => {
    const rr = new RequestResponse<{ a: number; b: number }, number>();

    // Servidor (responder)
    rr.respond('add', async (data) => data.a + data.b);

    // Cliente (requester)
    const result = await rr.request('add', { a: 5, b: 3 });

    expect(result).toBe(8);
  });

  test('deve suportar múltiplos responders', async () => {
    const rr = new RequestResponse<number, number>();

    rr.respond('multiply', async (x) => x * 2);
    rr.respond('multiply', async (x) => x * 3);

    const result = await rr.request('multiply', 5);

    // Deve receber uma das respostas
    expect([10, 15]).toContain(result);
  });

  test('deve respeitar timeout', async () => {
    const rr = new RequestResponse<string, string>({ timeout: 50 });

    rr.respond('slow', async (data) => {
      await delay(100);
      return `Response: ${data}`;
    });

    await expect(rr.request('slow', 'test', 50)).rejects.toThrow('timeout');
  });
});

describe('createPubSub', () => {
  test('deve criar pubsub tipado', async () => {
    interface Event {
      userId: string;
      action: string;
    }

    interface Result {
      logged: boolean;
    }

    const pubsub = createPubSub<Event, Result>();

    pubsub.subscribe('event', async (event) => ({
      logged: event.action === 'login'
    }));

    const result = await pubsub.publish('event', {
      userId: '123',
      action: 'login'
    });

    expect(result.success).toBe(true);
    expect(result.data?.[0]?.logged).toBe(true);
  });
});

