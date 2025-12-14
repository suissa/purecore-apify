/**
 * 🧪 Testes - syncChannel
 */

import { describe, test, expect } from 'bun:test';
import { 
  SyncChannel,
  AsyncIterableChannel,
  BroadcastChannel,
  createChannelPair
} from '../src/utils/syncChannel';
import { delay } from '../src/index';

describe('SyncChannel', () => {
  test('deve criar par de canais conectados', () => {
    const [client, server] = SyncChannel.createPair<string, string>();

    expect(client.isConnected()).toBe(true);
    expect(server.isConnected()).toBe(true);
  });

  test('deve enviar e receber mensagens', async () => {
    const [client, server] = SyncChannel.createPair<string, string>();
    const received: string[] = [];

    server.onMessage(async (msg) => {
      received.push(msg.data);
      return 'ok';
    });

    client.send('Hello');
    client.send('World');

    await delay(10);

    expect(received).toContain('Hello');
    expect(received).toContain('World');
  });

  test('deve suportar request/response', async () => {
    const [client, server] = SyncChannel.createPair<{ op: string; a: number; b: number }, number>();

    server.onMessage(async (msg) => {
      const { op, a, b } = msg.data;
      switch (op) {
        case 'add': return a + b;
        case 'multiply': return a * b;
        default: return 0;
      }
    });

    const addResult = await client.request<number>({ op: 'add', a: 5, b: 3 });
    const mulResult = await client.request<number>({ op: 'multiply', a: 5, b: 3 });

    expect(addResult).toBe(8);
    expect(mulResult).toBe(15);
  });

  test('deve desconectar corretamente', () => {
    const [client, server] = SyncChannel.createPair<string, string>();

    expect(client.isConnected()).toBe(true);

    client.disconnect('Test disconnect');

    expect(client.isConnected()).toBe(false);
    expect(client.getState()).toBe('closed');
  });

  test('deve emitir eventos', async () => {
    const [client, server] = SyncChannel.createPair<string, string>();
    const events: string[] = [];

    server.on((event) => {
      events.push(event.type);
    });

    server.onMessage(async () => 'ok');

    client.send('test');
    await delay(10);

    expect(events).toContain('open');
    expect(events).toContain('message');
  });
});

describe('AsyncIterableChannel', () => {
  test('deve suportar async iteration', async () => {
    const channel = new AsyncIterableChannel<number>();
    const received: number[] = [];

    // Consumidor
    const consumer = (async () => {
      for await (const value of channel) {
        received.push(value);
        if (received.length >= 3) break;
      }
    })();

    // Produtor
    channel.push(1);
    channel.push(2);
    channel.push(3);

    await consumer;

    expect(received).toEqual([1, 2, 3]);
  });

  test('deve funcionar com tryPull', () => {
    const channel = new AsyncIterableChannel<string>();

    channel.push('first');
    channel.push('second');

    expect(channel.tryPull()).toBe('first');
    expect(channel.tryPull()).toBe('second');
    expect(channel.tryPull()).toBeUndefined();
  });

  test('deve fechar corretamente', async () => {
    const channel = new AsyncIterableChannel<number>();

    channel.push(1);
    channel.close();

    expect(channel.isClosed()).toBe(true);
    expect(channel.push(2)).toBe(false);
  });
});

describe('BroadcastChannel', () => {
  test('deve fazer broadcast para todos subscribers', async () => {
    const broadcast = new BroadcastChannel<string>();
    const received1: string[] = [];
    const received2: string[] = [];

    broadcast.subscribe((msg) => { received1.push(msg); });
    broadcast.subscribe((msg) => { received2.push(msg); });

    await broadcast.send('Hello everyone!');

    expect(received1).toEqual(['Hello everyone!']);
    expect(received2).toEqual(['Hello everyone!']);
  });

  test('deve contar subscribers', () => {
    const broadcast = new BroadcastChannel<string>();

    const id1 = broadcast.subscribe(() => {});
    broadcast.subscribe(() => {});
    broadcast.subscribe(() => {});

    expect(broadcast.subscriberCount()).toBe(3);

    broadcast.unsubscribe(id1);

    expect(broadcast.subscriberCount()).toBe(2);
  });
});

describe('createChannelPair', () => {
  test('deve criar par tipado', async () => {
    interface Request { action: string }
    interface Response { success: boolean }

    const [client, server] = createChannelPair<Request, Response>();

    server.onMessage(async (msg) => ({
      success: msg.data.action === 'valid'
    }));

    const result = await client.request<Response>({ action: 'valid' });

    expect(result.success).toBe(true);
  });
});

