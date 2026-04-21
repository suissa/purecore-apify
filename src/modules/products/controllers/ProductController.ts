import { Request, Response } from "../../../types";
import { ProductService } from "../services/ProductService";
import { BadRequestError } from "../../../errors";

const productService = new ProductService();

export class ProductController {
  async list(req: Request, res: Response) {
    const products = await productService.list();
    res.json(products);
  }

  async get(req: Request, res: Response) {
    const { id } = req.params;
    const product = await productService.getById(id);
    res.json(product);
  }

  async create(req: Request, res: Response) {
    // Simple validation
    if (!req.body.name || !req.body.price) {
      throw new BadRequestError("Name and Price are required");
    }
    const product = await productService.create(req.body);
    res.status(201).json(product);
  }
}
