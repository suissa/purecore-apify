import { Request, Response } from "../../../types";
import { OrderService } from "../services/OrderService";
import { AuthRequest } from "../../../middlewares";
import { BadRequestError } from "../../../errors";

const orderService = new OrderService();

export class OrderController {
  async create(req: Request, res: Response) {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new BadRequestError("User not authenticated");

    const { items } = req.body;
    const order = await orderService.create(authReq.user.id, items);

    res.status(201).json(order);
  }

  async list(req: Request, res: Response) {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new BadRequestError("User not authenticated");

    const orders = await orderService.listByUser(authReq.user.id);
    res.json(orders);
  }
}
