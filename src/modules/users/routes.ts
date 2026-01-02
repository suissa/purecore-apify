import { Router } from "../../router";
import { Request, Response } from "../../types";
import { NotFoundError, BadRequestError, ValidationError } from "../../errors";
import { validationError, error } from "../../middlewares";

const usersRouter = new Router();

// Lista todos os usuários
usersRouter.get("/", (req: Request, res: Response) => {
  res.json({
    total: 0,
    data: [],
    message: "Lista de usuários",
  });
});

// Busca usuário por ID
usersRouter.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  // Validação do ID
  if (!id || id.length < 1) {
    throw new ValidationError("ID do usuário é obrigatório", "id", id);
  }

  // Simula busca em banco
  const userId = parseInt(id);
  if (isNaN(userId) || userId <= 0) {
    throw new BadRequestError("ID deve ser um número positivo");
  }

  // Simula usuário não encontrado
  if (userId > 100) {
    throw new NotFoundError(`Usuário com ID ${id} não encontrado`);
  }

  res.json({
    id: userId,
    name: `Usuário ${userId}`,
    email: `user${userId}@example.com`,
  });
});

// Cria usuário
usersRouter.post("/", (req: Request, res: Response) => {
  const userData = req.body;

  // Validação básica
  if (!userData) {
    throw new BadRequestError("Dados do usuário são obrigatórios");
  }

  if (!userData.name || typeof userData.name !== "string") {
    throw validationError(
      "Nome é obrigatório e deve ser uma string",
      "name",
      userData.name
    );
  }

  if (!userData.email || typeof userData.email !== "string") {
    throw validationError(
      "Email é obrigatório e deve ser uma string",
      "email",
      userData.email
    );
  }

  // Validação de email simples
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userData.email)) {
    throw validationError(
      "Email deve ter formato válido",
      "email",
      userData.email
    );
  }

  // Simula erro de duplicata
  if (userData.email === "existing@example.com") {
    throw error(409, "Email já cadastrado");
  }

  res.status(201).json({
    id: Date.now(),
    ...userData,
    createdAt: new Date(),
  });
});

// Atualiza usuário
usersRouter.put("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const userData = req.body;
  res.json({
    id,
    ...userData,
    updatedAt: new Date(),
  });
});

// Remove usuário
usersRouter.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  res.status(204).send("");
});

export { usersRouter };
