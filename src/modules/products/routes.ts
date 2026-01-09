import { Router } from "../../router";
import { ProductController } from "./controllers/ProductController";
import { authMiddleware } from "../../middlewares";

const productRouter = new Router();
const controller = new ProductController();

productRouter.get("/", (req, res) => controller.list(req, res));
productRouter.get("/:id", (req, res) => controller.get(req, res));

// Protected routes (Create)
// We could force admin role here, but keeping it simple as 'authenticated'
productRouter.post("/", authMiddleware, (req, res) =>
  controller.create(req, res)
);

export default productRouter;
