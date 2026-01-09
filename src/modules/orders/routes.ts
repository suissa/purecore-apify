import { Router } from "../../router";
import { OrderController } from "./controllers/OrderController";
import { authMiddleware } from "../../middlewares";

const orderRouter = new Router();
const controller = new OrderController();

// All order routes are protected
orderRouter.get("/", authMiddleware, (req, res) => controller.list(req, res));
orderRouter.post("/", authMiddleware, (req, res) =>
  controller.create(req, res)
);

export default orderRouter;
