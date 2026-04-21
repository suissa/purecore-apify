/**
 * Tipos e interfaces para o padrão AON (Adaptive Observability Negotiation)
 * Implementa a especificação definida em docs/AONP.md
 */

// =========================================
// TIPOS BASE DO AON
// =========================================

export type AONSeverity = "low" | "medium" | "high" | "critical";

export interface AONBaseEvent {
  type: string;
  timestamp: number;
}

export interface AONIntentAnalysisEvent extends AONBaseEvent {
  type: "intent_analysis";
  original_intent: string;
  detected_issue: string;
  decision: string;
}

export interface AONHealingEvent extends AONBaseEvent {
  type: "healing";
  severity: AONSeverity;
  action: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface AONStatusEvent extends AONBaseEvent {
  type: "status";
  message: string;
  estimated_delay_ms?: number;
}

export interface AONResultEvent extends AONBaseEvent {
  type: "result";
  data: any;
}

export interface AONErrorEvent extends AONBaseEvent {
  type: "error";
  code: string;
  message: string;
  trace_id?: string;
}

export type AONEvent =
  | AONIntentAnalysisEvent
  | AONHealingEvent
  | AONStatusEvent
  | AONResultEvent
  | AONErrorEvent;

// =========================================
// INTERFACES DE CONFIGURAÇÃO
// =========================================

export interface AONConfig {
  /** Habilita/desabilita o AON globalmente */
  enabled?: boolean;

  /** Nível de detalhe em produção */
  productionDetailLevel?: "minimal" | "standard" | "detailed";

  /** Timeout para operações de healing (ms) */
  healingTimeout?: number;

  /** Máximo de eventos de telemetria por request */
  maxTelemetryEvents?: number;

  /** Habilita logs de debug */
  debug?: boolean;
}

export interface AONContext {
  /** ID único da requisição */
  requestId: string;

  /** Timestamp de início */
  startTime: number;

  /** Modo de operação (black box ou glass box) */
  mode: "blackbox" | "glassbox";

  /** Eventos coletados */
  events: AONEvent[];

  /** Configuração específica da requisição */
  config: AONConfig;

  /** Metadados adicionais */
  metadata: Record<string, any>;
}

// =========================================
// INTERFACES DE STREAMING
// =========================================

export interface AONStreamWriter {
  /** Escreve um evento no stream NDJSON */
  writeEvent(event: AONBaseEvent): void;

  /** Finaliza o stream com resultado */
  end(result?: any): void;

  /** Finaliza o stream com erro */
  error(error: Error | string, code?: string): void;

  /** Verifica se o stream ainda está ativo */
  isActive(): boolean;

  /** Envia evento de status/heartbeat */
  status(message: string, estimatedDelayMs?: number): void;

  /** Envia evento de análise de intenção */
  intentAnalysis(
    originalIntent: string,
    detectedIssue: string,
    decision: string
  ): void;

  /** Envia evento de healing */
  healing(
    action: string,
    description: string,
    severity?: AONSeverity,
    metadata?: Record<string, any>
  ): void;
}

export interface AONHealer {
  /** Executa uma ação de healing */
  heal(
    action: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<boolean>;

  /** Registra uma tentativa de healing */
  registerHealingAttempt(action: string, severity: AONSeverity): void;

  /** Obtém estatísticas de healing */
  getHealingStats(): Record<string, any>;
}

// =========================================
// EXTENSÕES DE REQUEST/RESPONSE
// =========================================

import { Request, Response } from "../types.js";

export interface AONRequest extends Request {
  /** Contexto AON da requisição */
  aon?: AONContext;

  /** Writer para streaming de eventos */
  aonWriter?: AONStreamWriter;

  /** Healer para auto-cura */
  aonHealer?: AONHealer;
}

export interface AONResponse extends Response {
  /** Indica se está em modo streaming */
  isAONStreaming?: boolean;

  /** Buffer de eventos para modo blackbox */
  aonEventBuffer?: AONEvent[];
}

// =========================================
// TIPOS DE MIDDLEWARE
// =========================================

export type AONMiddleware = (
  req: AONRequest,
  res: AONResponse,
  next: () => void | Promise<void>
) => void | Promise<void>;

export type AONHandler = (
  req: AONRequest,
  res: AONResponse,
  writer: AONStreamWriter,
  healer: AONHealer
) => Promise<any>;

// =========================================
// UTILITÁRIOS DE TIPO
// =========================================

export function isAONEvent(obj: any): obj is AONEvent {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.type === "string" &&
    typeof obj.timestamp === "number"
  );
}

export function createAONEvent<T extends AONBaseEvent>(
  type: T["type"],
  data: Omit<T, "type" | "timestamp">
): T {
  return {
    type,
    timestamp: Date.now(),
    ...data,
  } as T;
}
