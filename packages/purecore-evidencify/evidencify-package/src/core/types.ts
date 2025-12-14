export type Attributes = Record<string, any>;

export interface SpanStatus {
  code: "UNSET" | "OK" | "ERROR";
  message?: string;
}

export interface SpanEnvelope {
  type: "span";
  span: {
    traceId: string;
    spanId: string;
    parentSpanId?: string | null;
    name: string;
    kind: "INTERNAL" | "SERVER" | "CLIENT";
    startTime: string;
    endTime: string;
    durationMs: number;
    attributes: Attributes;
    status: SpanStatus;
  };
}

export interface MetricEnvelope {
  type: "metric";
  kind: "counter" | "updown" | "histogram";
  name: string;
  value: number;
  attributes?: Attributes;
  timestamp: string;
}

export type AnyEnvelope = SpanEnvelope | MetricEnvelope;
