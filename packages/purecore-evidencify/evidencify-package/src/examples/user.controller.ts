import type { FastifyRequest, FastifyReply } from "fastify";
import { tracer, requestCounter, latencyHistogram } from "./evidencifyClient";
import { UserService } from "./user.service";

const service = new UserService();

export class UserController {
  async getUser(req: FastifyRequest, reply: FastifyReply) {
    const start = performance.now();
    const span = tracer.startSpan("HTTP GET /users/:id", {
      kind: "SERVER",
      attributes: {
        "http.route": "/users/:id",
        "http.method": "GET"
      }
    });

    const id = Number((req.params as any).id);

    try {
      requestCounter.add(1, { route: "/users/:id", method: "GET" });

      const user = await service.getUserProfile(id);
      if (!user) {
        span.setStatus({ code: "ERROR", message: "User not found" });
        reply.code(404).send({ error: "User not found" });
        return;
      }

      span.setStatus({ code: "OK" });
      reply.send(user);
    } catch (err: any) {
      span.setStatus({ code: "ERROR", message: String(err?.message ?? err) });
      reply.code(500).send({ error: "Internal error" });
    } finally {
      const duration = performance.now() - start;
      latencyHistogram.record(duration, {
        route: "/users/:id",
        method: "GET"
      });
      span.end();
    }
  }
}
