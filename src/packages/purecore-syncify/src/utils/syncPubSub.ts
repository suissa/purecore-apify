/**
 * 📢 syncPubSub - Pub/Sub síncrono com await do resultado
 * @module @purecore/syncify/utils/syncPubSub
 * 
 * Sistema de publicação/subscrição onde o publisher pode aguardar
 * o resultado do processamento pelos subscribers.
 */

import type { 
  AsyncFn, 
  PubSubOptions, 
  Subscriber, 
  PubSubMessage, 
  PubSubResponse,
  ExecutionResult 
} from '../types';

/**
 * Gera um ID único
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Resultado do publish
 */
export interface PublishResult<R> extends ExecutionResult<R[]> {
  messageId: string;
  topic: string;
  responses: PubSubResponse<R>[];
  subscriberCount: number;
}

/**
 * 📢 SyncPubSub - Sistema de pub/sub síncrono
 * 
 * @example
 * ```typescript
 * const pubsub = new SyncPubSub();
 * 
 * // Subscriber
 * pubsub.subscribe('user.created', async (data) => {
 *   await sendWelcomeEmail(data.email);
 *   return { emailSent: true };
 * });
 * 
 * // Publisher aguarda resultado
 * const result = await pubsub.publish('user.created', { email: 'user@example.com' });
 * console.log(result.data); // [{ emailSent: true }]
 * ```
 */
export class SyncPubSub<T = unknown, R = unknown> {
  private subscribers: Map<string, Subscriber<T, R>[]> = new Map();
  private messageBuffer: Map<string, PubSubMessage<T>[]> = new Map();
  private options: Required<PubSubOptions>;

  constructor(options: Partial<PubSubOptions> = {}) {
    this.options = {
      timeout: options.timeout ?? 30000,
      maxSubscribers: options.maxSubscribers ?? 100,
      bufferSize: options.bufferSize ?? 0
    };
  }

  /**
   * Subscreve a um tópico
   */
  subscribe(topic: string, handler: AsyncFn<T, R>): string {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }

    const subs = this.subscribers.get(topic)!;

    if (subs.length >= this.options.maxSubscribers) {
      throw new Error(`Max subscribers (${this.options.maxSubscribers}) reached for topic: ${topic}`);
    }

    const subscriber: Subscriber<T, R> = {
      id: generateId(),
      handler,
      createdAt: new Date()
    };

    subs.push(subscriber);

    // Processa mensagens bufferizadas
    this.processBufferedMessages(topic, subscriber);

    return subscriber.id;
  }

  /**
   * Remove uma subscrição
   */
  unsubscribe(topic: string, subscriberId: string): boolean {
    const subs = this.subscribers.get(topic);
    if (!subs) return false;

    const index = subs.findIndex(s => s.id === subscriberId);
    if (index === -1) return false;

    subs.splice(index, 1);
    return true;
  }

  /**
   * Publica uma mensagem e aguarda resultado dos subscribers
   */
  async publish(topic: string, data: T, correlationId?: string): Promise<PublishResult<R>> {
    const startTime = Date.now();
    const messageId = generateId();
    
    const message: PubSubMessage<T> = {
      id: messageId,
      topic,
      data,
      timestamp: new Date(),
      correlationId
    };

    const subs = this.subscribers.get(topic) || [];

    if (subs.length === 0) {
      // Buffer a mensagem se configurado
      if (this.options.bufferSize > 0) {
        this.bufferMessage(topic, message);
      }

      return {
        success: true,
        data: [],
        duration: Date.now() - startTime,
        timestamp: new Date(),
        messageId,
        topic,
        responses: [],
        subscriberCount: 0
      };
    }

    const responses: PubSubResponse<R>[] = [];
    const errors: Error[] = [];

    // Executa todos os handlers em paralelo com timeout
    const promises = subs.map(async (subscriber): Promise<PubSubResponse<R> | null> => {
      const handlerStart = Date.now();

      try {
        let result: R;

        if (this.options.timeout > 0) {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Handler timeout after ${this.options.timeout}ms`)), this.options.timeout);
          });
          result = await Promise.race([subscriber.handler(data), timeoutPromise]);
        } else {
          result = await subscriber.handler(data);
        }

        return {
          messageId,
          subscriberId: subscriber.id,
          result,
          duration: Date.now() - handlerStart
        };

      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
        return null;
      }
    });

    const results = await Promise.all(promises);
    
    results.forEach(r => {
      if (r !== null) {
        responses.push(r);
      }
    });

    const data_results = responses.map(r => r.result);

    return {
      success: errors.length === 0,
      data: data_results,
      error: errors.length > 0 ? errors[0] : undefined,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      messageId,
      topic,
      responses,
      subscriberCount: subs.length
    };
  }

  /**
   * Publica e aguarda resposta de um subscriber específico
   */
  async publishAndWait(
    topic: string, 
    data: T, 
    expectedSubscriberId?: string
  ): Promise<PubSubResponse<R> | null> {
    const result = await this.publish(topic, data);

    if (expectedSubscriberId) {
      return result.responses.find(r => r.subscriberId === expectedSubscriberId) || null;
    }

    return result.responses[0] || null;
  }

  /**
   * Publica para um subscriber específico
   */
  async publishTo(
    topic: string, 
    subscriberId: string, 
    data: T
  ): Promise<PubSubResponse<R> | null> {
    const subs = this.subscribers.get(topic);
    if (!subs) return null;

    const subscriber = subs.find(s => s.id === subscriberId);
    if (!subscriber) return null;

    const startTime = Date.now();
    const messageId = generateId();

    try {
      let result: R;

      if (this.options.timeout > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Handler timeout after ${this.options.timeout}ms`)), this.options.timeout);
        });
        result = await Promise.race([subscriber.handler(data), timeoutPromise]);
      } else {
        result = await subscriber.handler(data);
      }

      return {
        messageId,
        subscriberId: subscriber.id,
        result,
        duration: Date.now() - startTime
      };

    } catch {
      return null;
    }
  }

  /**
   * Buffer de mensagens
   */
  private bufferMessage(topic: string, message: PubSubMessage<T>): void {
    if (!this.messageBuffer.has(topic)) {
      this.messageBuffer.set(topic, []);
    }

    const buffer = this.messageBuffer.get(topic)!;
    buffer.push(message);

    // Remove mensagens antigas se exceder o limite
    while (buffer.length > this.options.bufferSize) {
      buffer.shift();
    }
  }

  /**
   * Processa mensagens bufferizadas para um novo subscriber
   */
  private async processBufferedMessages(topic: string, subscriber: Subscriber<T, R>): Promise<void> {
    const buffer = this.messageBuffer.get(topic);
    if (!buffer || buffer.length === 0) return;

    for (const message of buffer) {
      try {
        await subscriber.handler(message.data);
      } catch {
        // Ignora erros no processamento de buffer
      }
    }

    // Limpa o buffer após processamento
    this.messageBuffer.set(topic, []);
  }

  /**
   * Lista todos os tópicos
   */
  topics(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Conta subscribers de um tópico
   */
  subscriberCount(topic: string): number {
    return this.subscribers.get(topic)?.length || 0;
  }

  /**
   * Lista subscribers de um tópico
   */
  getSubscribers(topic: string): Array<{ id: string; createdAt: Date }> {
    const subs = this.subscribers.get(topic) || [];
    return subs.map(s => ({ id: s.id, createdAt: s.createdAt }));
  }

  /**
   * Remove todos os subscribers de um tópico
   */
  clearTopic(topic: string): void {
    this.subscribers.delete(topic);
    this.messageBuffer.delete(topic);
  }

  /**
   * Remove todos os subscribers
   */
  clear(): void {
    this.subscribers.clear();
    this.messageBuffer.clear();
  }
}

/**
 * 📢 RequestResponse - Padrão request/response sobre pub/sub
 * 
 * Implementa o padrão onde o publisher também é subscriber do resultado.
 * 
 * @example
 * ```typescript
 * const rr = new RequestResponse();
 * 
 * // Servidor (responder)
 * rr.respond('calculate', async (data) => {
 *   return data.a + data.b;
 * });
 * 
 * // Cliente (requester)
 * const result = await rr.request('calculate', { a: 5, b: 3 });
 * console.log(result); // 8
 * ```
 */
export class RequestResponse<T = unknown, R = unknown> {
  private pubsub: SyncPubSub<{ data: T; replyTo: string }, R>;
  private responseHandlers: Map<string, (response: R) => void> = new Map();

  constructor(options: Partial<PubSubOptions> = {}) {
    this.pubsub = new SyncPubSub(options);
  }

  /**
   * Registra um responder para um tópico
   */
  respond(topic: string, handler: AsyncFn<T, R>): string {
    return this.pubsub.subscribe(topic, async (envelope) => {
      const result = await handler(envelope.data);
      
      // Notifica o response handler
      const responseHandler = this.responseHandlers.get(envelope.replyTo);
      if (responseHandler) {
        responseHandler(result);
      }
      
      return result;
    });
  }

  /**
   * Envia uma requisição e aguarda resposta
   */
  async request(topic: string, data: T, timeout?: number): Promise<R> {
    const replyTo = generateId();

    return new Promise<R>((resolve, reject) => {
      // Configura timeout
      const timeoutId = timeout ? setTimeout(() => {
        this.responseHandlers.delete(replyTo);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout) : null;

      // Registra handler de resposta
      this.responseHandlers.set(replyTo, (response: R) => {
        if (timeoutId) clearTimeout(timeoutId);
        this.responseHandlers.delete(replyTo);
        resolve(response);
      });

      // Publica a requisição
      this.pubsub.publish(topic, { data, replyTo }).catch(err => {
        if (timeoutId) clearTimeout(timeoutId);
        this.responseHandlers.delete(replyTo);
        reject(err);
      });
    });
  }

  /**
   * Remove um responder
   */
  removeResponder(topic: string, responderId: string): boolean {
    return this.pubsub.unsubscribe(topic, responderId);
  }
}

/**
 * 📢 createPubSub - Factory para criar um PubSub tipado
 * 
 * @example
 * ```typescript
 * interface UserCreatedEvent {
 *   userId: string;
 *   email: string;
 * }
 * 
 * interface UserCreatedResult {
 *   notified: boolean;
 * }
 * 
 * const userPubSub = createPubSub<UserCreatedEvent, UserCreatedResult>();
 * 
 * userPubSub.subscribe('user.created', async (event) => {
 *   await notify(event.email);
 *   return { notified: true };
 * });
 * ```
 */
export function createPubSub<T, R>(
  options: Partial<PubSubOptions> = {}
): SyncPubSub<T, R> {
  return new SyncPubSub<T, R>(options);
}

/**
 * 📢 createRequestResponse - Factory para criar um RequestResponse tipado
 */
export function createRequestResponse<T, R>(
  options: Partial<PubSubOptions> = {}
): RequestResponse<T, R> {
  return new RequestResponse<T, R>(options);
}

