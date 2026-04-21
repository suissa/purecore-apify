/**
 * 🔌 syncChannel - Comunicação bidirecional WebSocket-like
 * @module @purecore/syncify/utils/syncChannel
 * 
 * Canal de comunicação bidirecional com suporte a request/response
 * e eventos, similar a WebSockets mas totalmente em memória.
 */

import type { 
  ChannelOptions, 
  ChannelState, 
  ChannelMessage,
  ExecutionResult 
} from '../types';

/**
 * Gera um ID único
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handler de mensagens
 */
export type MessageHandler<T, R> = (message: ChannelMessage<T>) => Promise<R>;

/**
 * Evento do Channel
 */
export type ChannelEvent<T = unknown> = 
  | { type: 'open' }
  | { type: 'close'; reason?: string }
  | { type: 'error'; error: Error }
  | { type: 'message'; message: ChannelMessage<T> };

/**
 * Listener de eventos do Channel
 */
export type ChannelEventListener<T = unknown> = (event: ChannelEvent<T>) => void;

/**
 * 🔌 SyncChannel - Canal de comunicação bidirecional
 * 
 * @example
 * ```typescript
 * // Criar canais conectados
 * const [clientChannel, serverChannel] = SyncChannel.createPair();
 * 
 * // Servidor
 * serverChannel.onMessage(async (msg) => {
 *   if (msg.type === 'request') {
 *     return { result: msg.data.value * 2 };
 *   }
 * });
 * 
 * // Cliente
 * const response = await clientChannel.request({ value: 5 });
 * console.log(response); // { result: 10 }
 * ```
 */
export class SyncChannel<TSend = unknown, TReceive = unknown> {
  private state: ChannelState = 'closed';
  private messageHandlers: MessageHandler<TReceive, unknown>[] = [];
  private eventListeners: ChannelEventListener<TReceive>[] = [];
  private pendingRequests: Map<string, { 
    resolve: (value: unknown) => void; 
    reject: (error: Error) => void;
    timeout?: ReturnType<typeof setTimeout>;
  }> = new Map();
  private buffer: ChannelMessage<TSend>[] = [];
  private peer?: SyncChannel<TReceive, TSend>;
  private options: Required<ChannelOptions>;

  constructor(options: Partial<ChannelOptions> = {}) {
    this.options = {
      bufferSize: options.bufferSize ?? 100,
      timeout: options.timeout ?? 30000,
      autoReconnect: options.autoReconnect ?? false,
      reconnectInterval: options.reconnectInterval ?? 1000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5
    };
  }

  /**
   * Cria um par de canais conectados
   */
  static createPair<T, R>(): [SyncChannel<T, R>, SyncChannel<R, T>] {
    const channel1 = new SyncChannel<T, R>();
    const channel2 = new SyncChannel<R, T>();
    
    channel1.connect(channel2);
    channel2.connect(channel1);
    
    return [channel1, channel2];
  }

  /**
   * Conecta a outro canal
   */
  connect(peer: SyncChannel<TReceive, TSend>): void {
    this.peer = peer;
    this.state = 'open';
    this.emit({ type: 'open' });

    // Processa mensagens bufferizadas
    this.flushBuffer();
  }

  /**
   * Desconecta do peer
   */
  disconnect(reason?: string): void {
    this.state = 'closed';
    this.peer = undefined;
    
    // Rejeita todas as requisições pendentes
    this.pendingRequests.forEach(({ reject, timeout }) => {
      if (timeout) clearTimeout(timeout);
      reject(new Error(`Channel closed: ${reason || 'No reason'}`));
    });
    this.pendingRequests.clear();
    
    this.emit({ type: 'close', reason });
  }

  /**
   * Envia uma mensagem (fire and forget)
   */
  send(data: TSend): boolean {
    const message: ChannelMessage<TSend> = {
      id: generateId(),
      type: 'event',
      data,
      timestamp: new Date()
    };

    if (this.state !== 'open' || !this.peer) {
      if (this.buffer.length < this.options.bufferSize) {
        this.buffer.push(message);
        return true;
      }
      return false;
    }

    this.peer.receiveMessage(message as unknown as ChannelMessage<TReceive>);
    return true;
  }

  /**
   * Envia uma requisição e aguarda resposta
   */
  async request<R = unknown>(data: TSend, timeout?: number): Promise<R> {
    const correlationId = generateId();
    const requestTimeout = timeout ?? this.options.timeout;

    const message: ChannelMessage<TSend> = {
      id: generateId(),
      type: 'request',
      data,
      timestamp: new Date(),
      correlationId
    };

    if (this.state !== 'open' || !this.peer) {
      throw new Error('Channel not connected');
    }

    return new Promise<R>((resolve, reject) => {
      // Configura timeout
      const timeoutId = requestTimeout > 0 ? setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Request timeout after ${requestTimeout}ms`));
      }, requestTimeout) : undefined;

      this.pendingRequests.set(correlationId, { 
        resolve: resolve as (value: unknown) => void, 
        reject,
        timeout: timeoutId
      });

      this.peer!.receiveMessage(message as unknown as ChannelMessage<TReceive>);
    });
  }

  /**
   * Recebe uma mensagem do peer
   */
  private async receiveMessage(message: ChannelMessage<TReceive>): Promise<void> {
    this.emit({ type: 'message', message });

    if (message.type === 'response' && message.correlationId) {
      // É uma resposta a uma requisição
      const pending = this.pendingRequests.get(message.correlationId);
      if (pending) {
        if (pending.timeout) clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.correlationId);
        pending.resolve(message.data);
      }
      return;
    }

    // Processa com os handlers
    for (const handler of this.messageHandlers) {
      try {
        const response = await handler(message);

        // Se é uma requisição, envia resposta
        if (message.type === 'request' && message.correlationId && this.peer) {
          const responseMessage: ChannelMessage<unknown> = {
            id: generateId(),
            type: 'response',
            data: response,
            timestamp: new Date(),
            correlationId: message.correlationId
          };
          this.peer.receiveMessage(responseMessage as ChannelMessage<TReceive>);
        }

      } catch (error) {
        this.emit({ 
          type: 'error', 
          error: error instanceof Error ? error : new Error(String(error)) 
        });
      }
    }
  }

  /**
   * Registra handler de mensagens
   */
  onMessage(handler: MessageHandler<TReceive, unknown>): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Remove handler de mensagens
   */
  offMessage(handler: MessageHandler<TReceive, unknown>): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index !== -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  /**
   * Registra listener de eventos
   */
  on(listener: ChannelEventListener<TReceive>): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove listener de eventos
   */
  off(listener: ChannelEventListener<TReceive>): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emite um evento
   */
  private emit(event: ChannelEvent<TReceive>): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Processa mensagens bufferizadas
   */
  private flushBuffer(): void {
    if (!this.peer) return;

    while (this.buffer.length > 0) {
      const message = this.buffer.shift()!;
      this.peer.receiveMessage(message as unknown as ChannelMessage<TReceive>);
    }
  }

  /**
   * Retorna o estado atual
   */
  getState(): ChannelState {
    return this.state;
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.state === 'open' && this.peer !== undefined;
  }
}

/**
 * 🔌 AsyncIterableChannel - Canal com suporte a async iteration
 * 
 * @example
 * ```typescript
 * const channel = new AsyncIterableChannel<string>();
 * 
 * // Consumidor
 * (async () => {
 *   for await (const message of channel) {
 *     console.log('Received:', message);
 *   }
 * })();
 * 
 * // Produtor
 * channel.push('Hello');
 * channel.push('World');
 * channel.close();
 * ```
 */
export class AsyncIterableChannel<T> implements AsyncIterable<T> {
  private buffer: T[] = [];
  private waiters: Array<{ resolve: (value: T) => void; reject: (error: Error) => void }> = [];
  private closed = false;
  private error?: Error;

  /**
   * Adiciona um valor ao canal
   */
  push(value: T): boolean {
    if (this.closed) return false;

    if (this.waiters.length > 0) {
      const waiter = this.waiters.shift()!;
      waiter.resolve(value);
    } else {
      this.buffer.push(value);
    }

    return true;
  }

  /**
   * Fecha o canal
   */
  close(): void {
    this.closed = true;
    
    // Notifica todos os waiters
    this.waiters.forEach(waiter => {
      waiter.reject(new Error('Channel closed'));
    });
    this.waiters = [];
  }

  /**
   * Fecha o canal com erro
   */
  closeWithError(error: Error): void {
    this.error = error;
    this.close();
  }

  /**
   * Retira um valor do canal
   */
  async pull(): Promise<T> {
    if (this.error) throw this.error;
    if (this.closed && this.buffer.length === 0) {
      throw new Error('Channel closed');
    }

    if (this.buffer.length > 0) {
      return this.buffer.shift()!;
    }

    return new Promise<T>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  /**
   * Tenta retirar um valor sem bloquear
   */
  tryPull(): T | undefined {
    return this.buffer.shift();
  }

  /**
   * Implementa AsyncIterable
   */
  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    while (!this.closed || this.buffer.length > 0) {
      try {
        yield await this.pull();
      } catch {
        return;
      }
    }
  }

  /**
   * Verifica se está fechado
   */
  isClosed(): boolean {
    return this.closed;
  }

  /**
   * Retorna quantidade de itens no buffer
   */
  size(): number {
    return this.buffer.length;
  }
}

/**
 * 🔌 BroadcastChannel - Canal para broadcast (um-para-muitos)
 * 
 * @example
 * ```typescript
 * const broadcast = new BroadcastChannel<string>();
 * 
 * // Subscribers
 * broadcast.subscribe(msg => console.log('Sub1:', msg));
 * broadcast.subscribe(msg => console.log('Sub2:', msg));
 * 
 * // Broadcast
 * await broadcast.send('Hello everyone!');
 * ```
 */
export class BroadcastChannel<T> {
  private subscribers: Map<string, (message: T) => Promise<void> | void> = new Map();

  /**
   * Adiciona um subscriber
   */
  subscribe(handler: (message: T) => Promise<void> | void): string {
    const id = generateId();
    this.subscribers.set(id, handler);
    return id;
  }

  /**
   * Remove um subscriber
   */
  unsubscribe(id: string): boolean {
    return this.subscribers.delete(id);
  }

  /**
   * Envia mensagem para todos os subscribers
   */
  async send(message: T): Promise<ExecutionResult<void[]>> {
    const startTime = Date.now();
    const errors: Error[] = [];

    const promises = Array.from(this.subscribers.values()).map(async (handler) => {
      try {
        await handler(message);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    });

    await Promise.all(promises);

    return {
      success: errors.length === 0,
      data: [],
      error: errors[0],
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }

  /**
   * Envia mensagem de forma síncrona (fire and forget)
   */
  sendSync(message: T): void {
    this.subscribers.forEach(handler => {
      try {
        handler(message);
      } catch {
        // Ignora erros no fire and forget
      }
    });
  }

  /**
   * Conta subscribers
   */
  subscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Remove todos os subscribers
   */
  clear(): void {
    this.subscribers.clear();
  }
}

/**
 * 🔌 WebSocketLikeChannel - Canal que simula interface WebSocket
 * 
 * @example
 * ```typescript
 * const ws = new WebSocketLikeChannel();
 * 
 * ws.onopen = () => console.log('Connected');
 * ws.onmessage = (msg) => console.log('Received:', msg);
 * ws.onclose = () => console.log('Disconnected');
 * 
 * ws.connect(peerChannel);
 * ws.send({ type: 'hello' });
 * ```
 */
export class WebSocketLikeChannel<T = unknown> {
  private channel: SyncChannel<T, T>;
  
  onopen?: () => void;
  onclose?: (reason?: string) => void;
  onerror?: (error: Error) => void;
  onmessage?: (data: T) => void;

  readyState: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' = 'CLOSED';

  constructor(options: Partial<ChannelOptions> = {}) {
    this.channel = new SyncChannel<T, T>(options);

    this.channel.on((event) => {
      switch (event.type) {
        case 'open':
          this.readyState = 'OPEN';
          this.onopen?.();
          break;
        case 'close':
          this.readyState = 'CLOSED';
          this.onclose?.(event.reason);
          break;
        case 'error':
          this.onerror?.(event.error);
          break;
        case 'message':
          this.onmessage?.(event.message.data);
          break;
      }
    });

    this.channel.onMessage(async (msg) => {
      this.onmessage?.(msg.data);
      return undefined;
    });
  }

  connect(peer: WebSocketLikeChannel<T>): void {
    this.readyState = 'CONNECTING';
    this.channel.connect(peer.channel as unknown as SyncChannel<T, T>);
  }

  send(data: T): void {
    this.channel.send(data);
  }

  close(reason?: string): void {
    this.readyState = 'CLOSING';
    this.channel.disconnect(reason);
  }

  async request<R = unknown>(data: T): Promise<R> {
    return this.channel.request<R>(data);
  }
}

/**
 * 🔌 createChannel - Factory para criar canais tipados
 */
export function createChannel<TSend, TReceive>(
  options: Partial<ChannelOptions> = {}
): SyncChannel<TSend, TReceive> {
  return new SyncChannel<TSend, TReceive>(options);
}

/**
 * 🔌 createChannelPair - Factory para criar par de canais conectados
 */
export function createChannelPair<T, R>(
  options: Partial<ChannelOptions> = {}
): [SyncChannel<T, R>, SyncChannel<R, T>] {
  const channel1 = new SyncChannel<T, R>(options);
  const channel2 = new SyncChannel<R, T>(options);
  
  channel1.connect(channel2);
  channel2.connect(channel1);
  
  return [channel1, channel2];
}

