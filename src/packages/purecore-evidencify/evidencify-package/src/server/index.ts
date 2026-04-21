import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type { AnyEnvelope } from "../core/types";

const PORT = Number(process.env.EVIDENCIFY_PORT || 9520);

async function main() {
  const app = Fastify({ logger: false });

  await app.register(websocket);

  const subscribers = new Set<any>();

  app.post("/ingest", async (req, reply) => {
    const body = (req.body ?? {}) as AnyEnvelope | AnyEnvelope[];
    const messages = Array.isArray(body) ? body : [body];

    for (const msg of messages) {
      for (const ws of subscribers) {
        try {
          ws.send(JSON.stringify(msg));
        } catch {}
      }
    }

    return reply.status(202).send({ ok: true, count: messages.length });
  });

  app.get("/stream", { websocket: true }, (connection) => {
    subscribers.add(connection.socket);
    connection.socket.on("close", () => {
      subscribers.delete(connection.socket);
    });
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`[evidencify] collector listening on http://localhost:${PORT}`);
  console.log(`[evidencify] ingest: POST http://localhost:${PORT}/ingest`);
  console.log(`[evidencify] stream: ws://localhost:${PORT}/stream`);
}

main().catch((err) => {
  console.error("[evidencify] collector error:", err);
  process.exit(1);
});
