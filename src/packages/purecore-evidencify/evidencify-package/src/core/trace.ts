import { randomUUID } from "node:crypto";
import type { Attributes, SpanEnvelope, SpanStatus } from "./types";
import { emitEnvelope } from "./exporter";

export interface Span {
  setAttribute(key: string, value: any): void;
  addEvent(name: string, attributes?: Attributes): void;
  setStatus(status: SpanStatus): void;
  end(): void;
}

class EvidencifySpan implements Span {
  private attributes: Attributes = {};
  private ended = false;
  private status: SpanStatus = { code: "UNSET" };
  private startTime = new Date();
  private endTime: Date | null = null;

  constructor(
    private readonly name: string,
    private readonly traceId: string,
    private readonly spanId: string,
    private readonly parentSpanId?: string | null,
    private readonly kind: "INTERNAL" | "SERVER" | "CLIENT" = "INTERNAL"
  ) {}

  setAttribute(key: string, value: any): void {
    this.attributes[key] = value;
  }

  addEvent(_name: string, _attributes?: Attributes): void {
    // simplificado: poderia guardar os eventos se quiser
  }

  setStatus(status: SpanStatus): void {
    this.status = status;
  }

  end(): void {
    if (this.ended) return;
    this.ended = true;
    this.endTime = new Date();
    const durationMs =
      this.endTime.getTime() - this.startTime.getTime();

    const env: SpanEnvelope = {
      type: "span",
      span: {
        traceId: this.traceId,
        spanId: this.spanId,
        parentSpanId: this.parentSpanId ?? null,
        name: this.name,
        kind: this.kind,
        startTime: this.startTime.toISOString(),
        endTime: this.endTime.toISOString(),
        durationMs,
        attributes: this.attributes,
        status: this.status
      }
    };

    void emitEnvelope(env);
  }
}

class Tracer {
  constructor(private readonly scopeName: string) {}

  startSpan(
    name: string,
    options?: {
      parentSpanId?: string | null;
      kind?: "INTERNAL" | "SERVER" | "CLIENT";
      attributes?: Attributes;
    }
  ): Span {
    const traceId = randomUUID();
    const spanId = randomUUID();
    const span = new EvidencifySpan(
      name,
      traceId,
      spanId,
      options?.parentSpanId,
      options?.kind ?? "INTERNAL"
    );
    if (options?.attributes) {
      for (const [k, v] of Object.entries(options.attributes)) {
        span.setAttribute(k, v);
      }
    }
    return span;
  }
}

class TracerProvider {
  private tracers = new Map<string, Tracer>();

  getTracer(name: string): Tracer {
    if (!this.tracers.has(name)) {
      this.tracers.set(name, new Tracer(name));
    }
    return this.tracers.get(name)!;
  }
}

const provider = new TracerProvider();

export const trace = {
  getTracer(name: string): Tracer {
    return provider.getTracer(name);
  }
};
