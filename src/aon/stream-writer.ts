/**
 * Stream Writer para AON (Adaptive Observability Negotiation)
 * Implementa streaming NDJSON conforme especificação AONP
 */

import { ServerResponse } from "node:http";
import {
  AONEvent,
  AONStreamWriter,
  AONBaseEvent,
  AONResultEvent,
  AONErrorEvent,
  createAONEvent,
} from "./types.js";

export class NDJSONStreamWriter implements AONStreamWriter {
  protected response: ServerResponse;
  private active: boolean = true;
  private eventCount: number = 0;
  private maxEvents: number;

  constructor(response: ServerResponse, maxEvents: number = 1000) {
    this.response = response;
    this.maxEvents = maxEvents;

    // Configura headers para streaming NDJSON
    this.setupStreamingHeaders();

    // Envia acknowledgement imediato
    this.sendAcknowledgement();
  }

  private setupStreamingHeaders(): void {
    this.response.statusCode = 200;
    this.response.setHeader("Content-Type", "application/x-ndjson");
    this.response.setHeader("Transfer-Encoding", "chunked");
    this.response.setHeader("Cache-Control", "no-cache");
    this.response.setHeader("Connection", "keep-alive");

    // Headers para evitar buffering em proxies
    this.response.setHeader("X-Accel-Buffering", "no");
    this.response.setHeader("X-Content-Type-Options", "nosniff");
  }

  private sendAcknowledgement(): void {
    // Envia evento inicial de acknowledgement
    const ackEvent = createAONEvent<AONEvent>("status", {
      message: "AON stream initialized - Glass Box mode active",
    });

    this.writeRawEvent(ackEvent);
  }

  writeEvent(event: AONBaseEvent): void {
    if (!this.active) {
      console.warn("[AON] Tentativa de escrever em stream inativo");
      return;
    }

    // Proteção contra spam de eventos
    if (this.eventCount >= this.maxEvents) {
      console.warn("[AON] Limite máximo de eventos atingido");
      return;
    }

    this.writeRawEvent(event);
    this.eventCount++;
  }

  private writeRawEvent(event: AONBaseEvent): void {
    try {
      const jsonLine = JSON.stringify(event) + "\n";
      this.response.write(jsonLine);
    } catch (error) {
      console.error("[AON] Erro ao serializar evento:", error);
    }
  }

  end(result?: any): void {
    if (!this.active) return;

    try {
      // Envia evento de resultado final
      const resultEvent = createAONEvent<AONResultEvent>("result", {
        data: result || { success: true },
      });

      this.writeRawEvent(resultEvent);

      // Finaliza a conexão
      this.response.end();
      this.active = false;
    } catch (error) {
      console.error("[AON] Erro ao finalizar stream:", error);
      this.forceClose();
    }
  }

  error(error: Error | string, code?: string): void {
    if (!this.active) return;

    try {
      const errorMessage = typeof error === "string" ? error : error.message;
      const errorCode =
        code ||
        (typeof error === "object" && "code" in error
          ? error.code
          : "UNKNOWN_ERROR");

      const errorEvent = createAONEvent<AONErrorEvent>("error", {
        code: String(errorCode),
        message: errorMessage,
        trace_id: this.generateTraceId(),
      });

      this.writeRawEvent(errorEvent);

      // Finaliza a conexão
      this.response.end();
      this.active = false;
    } catch (writeError) {
      console.error("[AON] Erro ao escrever evento de erro:", writeError);
      this.forceClose();
    }
  }

  isActive(): boolean {
    return this.active && !this.response.destroyed;
  }

  private forceClose(): void {
    try {
      if (!this.response.destroyed) {
        this.response.destroy();
      }
    } catch (error) {
      console.error("[AON] Erro ao forçar fechamento:", error);
    } finally {
      this.active = false;
    }
  }

  private generateTraceId(): string {
    return `aon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // =========================================
  // MÉTODOS UTILITÁRIOS
  // =========================================

  /**
   * Envia evento de status/heartbeat
   */
  status(message: string, estimatedDelayMs?: number): void {
    this.writeEvent(
      createAONEvent("status", {
        message,
        ...(estimatedDelayMs && { estimated_delay_ms: estimatedDelayMs }),
      })
    );
  }

  /**
   * Envia evento de análise de intenção
   */
  intentAnalysis(
    originalIntent: string,
    detectedIssue: string,
    decision: string
  ): void {
    this.writeEvent(
      createAONEvent("intent_analysis", {
        original_intent: originalIntent,
        detected_issue: detectedIssue,
        decision: decision,
      })
    );
  }

  /**
   * Envia evento de healing
   */
  healing(
    action: string,
    description: string,
    severity: "low" | "medium" | "high" | "critical" = "medium",
    metadata?: Record<string, any>
  ): void {
    this.writeEvent(
      createAONEvent("healing", {
        severity,
        action,
        description,
        ...(metadata && { metadata }),
      })
    );
  }

  /**
   * Obtém estatísticas do stream
   */
  getStats() {
    return {
      eventCount: this.eventCount,
      maxEvents: this.maxEvents,
      active: this.active,
      responseDestroyed: this.response.destroyed,
    };
  }
}

/**
 * Factory para criar stream writers
 */
export function createAONStreamWriter(
  response: ServerResponse,
  maxEvents?: number
): AONStreamWriter {
  return new NDJSONStreamWriter(response, maxEvents);
}
