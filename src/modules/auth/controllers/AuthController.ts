import { Request, Response } from "../../../types";
import { AuthService } from "../services/AuthService";
import { BadRequestError } from "../../../errors";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    const { email, password, name } = req.body;
    if (!email || !password)
      throw new BadRequestError("Email and password required");

    const result = await authService.register({ email, password, name });
    res.status(201).json(result);
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password)
      throw new BadRequestError("Email and password required");

    const result = await authService.login({ email, password });
    res.json(result);
  }
}
