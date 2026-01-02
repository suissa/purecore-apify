/**
 * 📦 Types - Tipos TypeScript para Syncify
 * @module @purecore/syncify/types
 */

/**
 * Função assíncrona genérica
 */
export type AsyncFn<T = unknown, R = unknown> = (input: T) => Promise<R>;

/**
 * Função assíncrona sem input
 */
export type AsyncFnNoInput<R = unknown> = () => Promise<R>;

/**
 * Função síncrona genérica
 */
export type SyncFn<T = unknown, R = unknown> = (input: T) => R;

/**
 * Resultado de execução com metadados
 */
export interface ExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  timestamp: Date;
}

/**
 * Opções de retry
 */
export interface RetryOptions {
  /** Número máximo de tentativas */
  maxRetries: number;
  /** Delay base em ms */
  baseDelay: number;
  /** Multiplicador para backoff exponencial */
  backoffMultiplier?: number;
  /** Delay máximo em ms */
  maxDelay?: number;
  /** Função para determinar se deve retry */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Callback em cada retry */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Opções de fila
 */
export interface QueueOptions {
  /** Número máximo de execuções paralelas */
  concurrency: number;
  /** Timeout por item em ms */
  timeout?: number;
  /** Retry por item */
  retry?: RetryOptions;
  /** Callback quando item é processado */
  onProcess?: <T>(item: T, index: number) => void;
  /** Callback quando item falha */
  onError?: (error: Error, index: number) => void;
}

/**
 * Item da fila
 */
export interface QueueItem<T, R> {
  fn: AsyncFn<T, R>;
  input: T;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
}

/**
 * Estado da fila
 */
export interface QueueState {
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

/**
 * Opções do PubSub
 */
export interface PubSubOptions {
  /** Timeout para aguardar resposta em ms */
  timeout?: number;
  /** Número máximo de subscribers por tópico */
  maxSubscribers?: number;
  /** Buffer de mensagens não consumidas */
  bufferSize?: number;
}

/**
 * Subscriber do PubSub
 */
export interface Subscriber<T = unknown, R = unknown> {
  id: string;
  handler: AsyncFn<T, R>;
  createdAt: Date;
}

/**
 * Mensagem do PubSub
 */
export interface PubSubMessage<T = unknown> {
  id: string;
  topic: string;
  data: T;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Resposta do PubSub
 */
export interface PubSubResponse<R = unknown> {
  messageId: string;
  subscriberId: string;
  result: R;
  duration: number;
}

/**
 * Opções do Channel
 */
export interface ChannelOptions {
  /** Buffer de mensagens */
  bufferSize?: number;
  /** Timeout para operações */
  timeout?: number;
  /** Auto-reconnect para WebSocket */
  autoReconnect?: boolean;
  /** Intervalo de reconnect em ms */
  reconnectInterval?: number;
  /** Máximo de tentativas de reconnect */
  maxReconnectAttempts?: number;
}

/**
 * Estado do Channel
 */
export type ChannelState = 'open' | 'closed' | 'connecting' | 'error';

/**
 * Mensagem do Channel
 */
export interface ChannelMessage<T = unknown> {
  id: string;
  type: 'request' | 'response' | 'event';
  data: T;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Opções do Flow
 */
export interface FlowOptions {
  /** Timeout total em ms */
  timeout?: number;
  /** Callback para cada etapa */
  onStep?: <T>(stepIndex: number, result: T) => void;
  /** Callback em caso de erro */
  onError?: (error: Error, stepIndex: number) => void;
  /** Continuar mesmo com erro (retorna undefined para próxima etapa) */
  continueOnError?: boolean;
}

/**
 * Resultado do Flow
 */
export interface FlowResult<T> extends ExecutionResult<T> {
  steps: ExecutionResult<unknown>[];
  totalSteps: number;
  completedSteps: number;
}

/**
 * Opções do Parallel
 */
export interface ParallelOptions {
  /** Timeout total em ms */
  timeout?: number;
  /** Modo de falha: 'all' falha se qualquer um falhar, 'settled' retorna todos os resultados */
  failMode?: 'all' | 'settled';
  /** Máximo de execuções paralelas (0 = ilimitado) */
  maxConcurrency?: number;
}

/**
 * Resultado do Parallel (modo settled)
 */
export interface SettledResult<T> {
  status: 'fulfilled' | 'rejected';
  value?: T;
  reason?: Error;
  duration: number;
}

/**
 * Opções do Race
 */
export interface RaceOptions {
  /** Timeout em ms */
  timeout?: number;
  /** Callback quando uma função vence */
  onWin?: <T>(result: T, index: number, duration: number) => void;
  /** Cancelar outras funções após vitória */
  cancelOnWin?: boolean;
}

/**
 * Resultado do Race
 */
export interface RaceResult<T> extends ExecutionResult<T> {
  winnerIndex: number;
  totalParticipants: number;
}

