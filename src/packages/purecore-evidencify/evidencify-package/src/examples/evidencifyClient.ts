import { trace } from "../core/trace"; // for trace
import { metrics as m } from "../core/metrics";

// Exporta utilitários usados pelos exemplos
export const tracer = trace.getTracer("example-api") as any;
export const meter = m.getMeter("example-api") as any;

export const requestCounter = meter.createCounter("http_requests_total");
export const latencyHistogram = meter.createHistogram("http_request_duration_ms");
