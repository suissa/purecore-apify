import type { AnyEnvelope } from "./types";

const DEFAULT_INGEST = process.env.EVIDENCIFY_INGEST_URL || "http://localhost:9520/ingest";

export async function emitEnvelope(env: AnyEnvelope): Promise<void> {
  const url = DEFAULT_INGEST;
  try {
    // Node 18+ tem fetch global, Bun também; em browser também funciona
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(env)
    });
  } catch (err) {
    // Telemetria nunca deve quebrar a aplicação
    console.error("[evidencify] erro ao enviar envelope:", err);
  }
}
