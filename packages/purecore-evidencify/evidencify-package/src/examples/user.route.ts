import type { FastifyInstance } from "fastify";
import { UserController } from "./user.controller";

const controller = new UserController();

export async function userRoutes(app: FastifyInstance) {
  app.get("/users/:id", (req, reply) => controller.getUser(req, reply));
}
