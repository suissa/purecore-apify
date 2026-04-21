import { tracer } from "./evidencifyClient";
import { UserRepository } from "./user.repository";

const repo = new UserRepository();

export class UserService {
  async getUserProfile(id: number) {
    const span = tracer.startSpan("UserService.getUserProfile", {
      kind: "INTERNAL",
      attributes: { "app.layer": "service", "user.id": id }
    });

    try {
      const user = await repo.findById(id);
      if (!user) {
        span.setStatus({ code: "ERROR", message: "User not found" });
        return null;
      }
      span.setStatus({ code: "OK" });
      return user;
    } catch (err: any) {
      span.setStatus({ code: "ERROR", message: String(err?.message ?? err) });
      throw err;
    } finally {
      span.end();
    }
  }
}
