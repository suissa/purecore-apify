import React, { useEffect, useMemo, useState } from "react";
import type { AnyEnvelope, SpanEnvelope, MetricEnvelope } from "../core/types";

type SpanStatusCode = "UNSET" | "OK" | "ERROR";

type TraceAggregate = {
  traceId: string;
  serviceName: string;
  spans: SpanEnvelope["span"][];
  maxStatus: SpanStatusCode;
  lastEnd: number;
};

type MetricAggregate = {
  name: string;
  kind: "counter" | "updown" | "histogram";
  lastValue: number;
  min: number;
  max: number;
  count: number;
  lastTimestamp?: string;
  sampleAttributes?: Record<string, any>;
};

const statusRank: Record<SpanStatusCode, number> = {
  UNSET: 0,
  OK: 1,
  ERROR: 2
};

function formatTime(ts: string | number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toISOString().split("T")[1]?.replace("Z", "") ?? "";
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)} s`;
  const m = s / 60;
  return `${m.toFixed(1)} min`;
}

function statusColor(status: SpanStatusCode): string {
  switch (status) {
    case "ERROR":
      return "#fb7185";
    case "OK":
      return "#22c55e";
    case "UNSET":
    default:
      return "#e5e7eb";
  }
}

export const App: React.FC = () => {
  const [status, setStatus] = useState("conectando...");
  const [traces, setTraces] = useState<Map<string, TraceAggregate>>(
    () => new Map()
  );
  const [metrics, setMetrics] = useState<Map<string, MetricAggregate>>(
    () => new Map()
  );
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: any = null;

    function connect() {
      const protocol = location.protocol === "https:" ? "wss" : "ws";
      const url = `${protocol}://${location.host.replace(":9521", ":9520")}/stream`;
      ws = new WebSocket(url);
      console.log("Connecting to:", url);
      ws.onopen = () => {
        setStatus("conectado");
      };

      ws.onclose = () => {
        setStatus("desconectado, tentando reconectar...");
        retryTimer = setTimeout(connect, 1000);
      };

      ws.onerror = () => {
        setStatus("erro de conexão");
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as AnyEnvelope;

          if (msg.type === "span") {
            const spanEnv = msg as SpanEnvelope;
            const span = spanEnv.span;
            setTraces((prev) => {
              const next = new Map(prev);
              const traceId = span.traceId || "no-trace";
              const serviceName =
                (span.attributes?.["service.name"] as string) ??
                (span.attributes?.["service"] as string) ??
                "unknown-service";

              const prevAgg = next.get(traceId);

              if (!prevAgg) {
                next.set(traceId, {
                  traceId,
                  serviceName,
                  spans: [span],
                  maxStatus: span.status?.code ?? "UNSET",
                  lastEnd: new Date(span.endTime).getTime()
                });
              } else {
                const spans = [...prevAgg.spans, span].sort(
                  (a, b) =>
                    new Date(a.startTime).getTime() -
                    new Date(b.startTime).getTime()
                );
                const maxStatus =
                  statusRank[span.status?.code ?? "UNSET"] >
                  statusRank[prevAgg.maxStatus]
                    ? span.status?.code ?? "UNSET"
                    : prevAgg.maxStatus;
                const lastEnd = Math.max(
                  prevAgg.lastEnd,
                  new Date(span.endTime).getTime()
                );
                next.set(traceId, {
                  traceId,
                  serviceName,
                  spans,
                  maxStatus,
                  lastEnd
                });
              }

              return next;
            });

            setSelectedTraceId((prev) => prev ?? span.traceId ?? "no-trace");
          } else if (msg.type === "metric") {
            const metricEnv = msg as MetricEnvelope;
            setMetrics((prev) => {
              const next = new Map(prev);
              const prevAgg = next.get(metricEnv.name);
              const val = metricEnv.value;
              if (!prevAgg) {
                next.set(metricEnv.name, {
                  name: metricEnv.name,
                  kind: metricEnv.kind,
                  lastValue: val,
                  min: val,
                  max: val,
                  count: 1,
                  lastTimestamp: metricEnv.timestamp,
                  sampleAttributes: metricEnv.attributes
                });
              } else {
                next.set(metricEnv.name, {
                  ...prevAgg,
                  lastValue: val,
                  min: Math.min(prevAgg.min, val),
                  max: Math.max(prevAgg.max, val),
                  count: prevAgg.count + 1,
                  lastTimestamp: metricEnv.timestamp ?? prevAgg.lastTimestamp,
                  sampleAttributes: prevAgg.sampleAttributes ?? metricEnv.attributes
                });
              }
              return next;
            });
          }
        } catch (e) {
          console.error("[evidencify] erro ao parsear WS:", e);
        }
      };
    }

    connect();

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  const traceList = useMemo(() => {
    const arr = Array.from(traces.values());
    const f = filter.trim().toLowerCase();
    const filtered = !f
      ? arr
      : arr.filter((t) => {
          const idMatch = t.traceId.toLowerCase().includes(f);
          const svcMatch = t.serviceName.toLowerCase().includes(f);
          return idMatch || svcMatch;
        });

    return filtered.sort((a, b) => b.lastEnd - a.lastEnd);
  }, [traces, filter]);

  const selectedTrace = selectedTraceId
    ? traces.get(selectedTraceId) ?? null
    : null;

  const metricList = useMemo(
    () => Array.from(metrics.values()).sort((a, b) => a.name.localeCompare(b.name)),
    [metrics]
  );

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at top left, #0f172a, #020617 60%)",
        color: "#e5e7eb",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}
    >
      <header
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #1f2937",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(12px)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 999,
              background:
                "radial-gradient(circle, #22d3ee, #4f46e5)",
              boxShadow: "0 0 18px rgba(56,189,248,0.6)",
              fontSize: 14
            }}
          >
            E
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              Evidencify Dashboard
            </div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              traces + metrics em tempo real
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 999,
            border: "1px solid #1f2937",
            background: "#111827"
          }}
        >
          {status}
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "260px minmax(0, 2.3fr) minmax(0, 1.5fr)",
          gap: 8,
          padding: 8,
          minHeight: 0
        }}
      >
        {/* Traces */}
        <section
          style={{
            borderRadius: 10,
            border: "1px solid #1f2937",
            background: "rgba(15,23,42,0.95)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              borderBottom: "1px solid #1f2937",
              display: "flex",
              flexDirection: "column",
              gap: 4
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                opacity: 0.8
              }}
            >
              Traces
            </div>
            <input
              placeholder="filtrar por traceId ou serviço..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                background: "#020617",
                borderRadius: 999,
                border: "1px solid #1f2937",
                padding: "4px 8px",
                color: "#e5e7eb",
                fontSize: 11
              }}
            />
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 6
            }}
          >
            {traceList.map((t) => (
              <div
                key={t.traceId}
                onClick={() => setSelectedTraceId(t.traceId)}
                style={{
                  padding: "6px 8px",
                  marginBottom: 4,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 11,
                  border:
                    selectedTraceId === t.traceId
                      ? "1px solid #22d3ee"
                      : "1px solid transparent",
                  boxShadow:
                    selectedTraceId === t.traceId
                      ? "0 0 0 1px rgba(56,189,248,0.4)"
                      : "none",
                  background:
                    selectedTraceId === t.traceId
                      ? "radial-gradient(circle at top left, rgba(34,211,238,0.18), rgba(15,23,42,0.95))"
                      : "rgba(15,23,42,0.7)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                      }}
                    >
                      {t.traceId.slice(0, 6)}…{t.traceId.slice(-4)}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>
                      {t.serviceName}
                    </div>
                  </div>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: statusColor(t.maxStatus)
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.7,
                    marginTop: 2
                  }}
                >
                  {t.spans.length} spans ·{" "}
                  {formatTime(t.lastEnd)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section
          style={{
            borderRadius: 10,
            border: "1px solid #1f2937",
            background: "rgba(15,23,42,0.95)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              borderBottom: "1px solid #1f2937",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              opacity: 0.8
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em"
              }}
            >
              Timeline
            </div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>
              {selectedTrace
                ? `${selectedTrace.spans.length} spans · status ${selectedTrace.maxStatus}`
                : "nenhum trace selecionado"}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "6px 8px",
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 11
            }}
          >
            {selectedTrace ? (
              selectedTrace.spans.map((span) => (
                <div
                  key={span.spanId}
                  style={{
                    borderBottom: "1px solid #111827",
                    padding: "4px 2px",
                    display: "grid",
                    gridTemplateColumns:
                      "120px minmax(0,1.6fr) 90px",
                    gap: 8,
                    alignItems: "flex-start"
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        padding: "0 6px",
                        borderRadius: 999,
                        border:
                          "1px solid rgba(148,163,184,0.4)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: statusColor(span.status?.code ?? "UNSET")
                        }}
                      />
                      <span>{span.kind}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>
                      {formatTime(span.startTime)}
                    </div>
                  </div>
                  <div>
                    <div>{span.name}</div>
                    {span.attributes && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "#9ca3af",
                          maxHeight: 40,
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {JSON.stringify(span.attributes)}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      textAlign: "right",
                      color: "#e5e7eb"
                    }}
                  >
                    {formatDuration(span.durationMs)}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.7,
                  paddingTop: 8
                }}
              >
                Selecione um trace à esquerda.
              </div>
            )}
          </div>
        </section>

        {/* Metrics */}
        <section
          style={{
            borderRadius: 10,
            border: "1px solid #1f2937",
            background:
              "radial-gradient(circle at top, rgba(15,23,42,1), #020617)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              borderBottom: "1px solid #1f2937",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                opacity: 0.8
              }}
            >
              Metrics
            </div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>
              {metricList.length
                ? `${metricList.length} séries`
                : "nenhuma métrica recebida ainda"}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "6px 8px",
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 11,
              display: "grid",
              gap: 8
            }}
          >
            {metricList.map((m) => (
              <div
                key={m.name}
                style={{
                  borderRadius: 8,
                  border: "1px solid #1f2937",
                  padding: "6px 8px",
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.6))"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4
                  }}
                >
                  <div>
                    <div>{m.name}</div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#9ca3af",
                        textTransform: "uppercase"
                      }}
                    >
                      {m.kind}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13 }}>
                      {m.lastValue}
                    </div>
                    <div
                      style={{ fontSize: 9, color: "#9ca3af" }}
                    >
                      min {m.min} · max {m.max}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "#9ca3af",
                    display: "flex",
                    justifyContent: "space-between"
                  }}
                >
                  <span>count: {m.count}</span>
                  {m.lastTimestamp && (
                    <span>último: {formatTime(m.lastTimestamp)}</span>
                  )}
                </div>
                {m.sampleAttributes && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 9,
                      color: "#9ca3af",
                      maxHeight: 40,
                      overflow: "hidden"
                    }}
                  >
                    {JSON.stringify(m.sampleAttributes)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};