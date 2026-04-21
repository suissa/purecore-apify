import Fastify from "fastify";
import { userRoutes } from "./user.route";

async function main() {
  const app = Fastify({ logger: true });

  await userRoutes(app);

  const port = Number(process.env.PORT || 4000);
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`[example] API listening on http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
