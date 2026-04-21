import { Request, Response, NextFunction, RequestHandler } from "./types";
import { jwtVerify } from "@purecore/one-jwt-4-all";
import * as cookie from "cookie";
import { randomUUID } from "node:crypto";

// Importa AON (Adaptive Observability Negotiation)
import { aonMiddleware, createAONMiddleware, AONRequest } from "./aon/index.js";

// --- 0. Transparent Body Parser Middleware ---
// Aplica automaticamente parsing de body em todas as rotas não-GET

export const jsonBodyParser: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Só faz parsing para métodos que podem ter body
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "DELETE"
  ) {
    return next();
  }

  const contentType = req.headers["content-type"] || "";
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);

  // Limite de 10MB por padrão
  const maxBodySize = parseInt(process.env.MAX_BODY_SIZE || "10485760");

  if (contentLength > maxBodySize) {
    res.status(413).json({
      error: "Payload muito grande",
      maxAllowed: maxBodySize,
      received: contentLength,
    });
    return;
  }

  let body = "";

  try {
    for await (const chunk of req) {
      body += chunk.toString();

      // Proteção contra payloads muito grandes durante streaming
      if (body.length > maxBodySize) {
        res.status(413).json({
          error: "Payload muito grande durante processamento",
          maxAllowed: maxBodySize,
        });
        return;
      }
    }

    // Parse baseado no Content-Type
    if (contentType.includes("application/json")) {
      req.body = body ? JSON.parse(body) : {};
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(body);
      req.body = Object.fromEntries(params);
    } else if (contentType.includes("text/plain")) {
      req.body = body;
    } else if (contentType.includes("multipart/form-data")) {
      // Para multipart, mantém como string por enquanto
      // Pode ser extendido futuramente com bibliotecas como multer
      req.body = { raw: body, contentType };
    } else {
      // Default: tenta JSON, se falhar mantém como string
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch {
        req.body = body;
      }
    }

    next();
  } catch (error) {
    if (error instanceof SyntaxError) {
      res.status(400).json({
        error: "JSON malformado no corpo da requisição",
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: "Erro interno no processamento do body",
      });
    }
  }
};
import {
  HttpError,
  isHttpError,
  ValidationError,
  DatabaseError,
  ExternalApiError,
  createHttpErrorFromStatus,
} from "./errors";
import { getResilientFallback, ResilientConfig } from "./healer";

// --- Interfaces para extender o Request ---

export interface UserPayload {
  id: string;
  email: string;
  role?: string;
  [key: string]: any;
}

export interface SessionData {
  id: string;
  createdAt: number;
  [key: string]: any;
}

// Tipo de Request Autenticado (para usar nos controllers)
export interface AuthRequest extends Request {
  user?: UserPayload;
  session?: SessionData;
}

// --- 1. Session Middleware ---
// Simples, baseado em cookie 'sid' e store em memória (trocável por Redis)

const sessionStore = new Map<string, SessionData>();

export const sessionMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authReq = req as AuthRequest;

  // Lê cookies
  const cookies = cookie.parse(req.headers.cookie || "");
  let sessionId = cookies["sid"];

  // Se não tem sessão, cria
  if (!sessionId || !sessionStore.has(sessionId)) {
    sessionId = randomUUID();
    sessionStore.set(sessionId, { id: sessionId, createdAt: Date.now() });

    // Define cookie no response
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("sid", sessionId, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24, // 1 dia
      })
    );
  }

  // Injeta no Request
  authReq.session = sessionStore.get(sessionId);
  next();
};

// --- 2. JWT Auth Middleware ---

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export const authMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authReq = req as AuthRequest;
  const authHeader = req.headers["authorization"]; // Bearer <token>

  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Formato de token inválido" });
  }

  const token = parts[1];

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    authReq.user = payload as UserPayload; // Usuário disponível!
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token inválido ou expirado" });
  }
};

// --- 3. Error Handler Middleware (Deve ser o último middleware) ---

export interface ErrorResponse {
  error: {
    message: string;
    statusCode: number;
    type: string;
    timestamp: string;
    path?: string;
    method?: string;
    field?: string;
    value?: any;
    stack?: string;
  };
  meta?: {
    requestId?: string;
    environment?: string;
  };
}

/**
 * Middleware de tratamento de erro robusto e resiliente
 * Deve ser registrado como ÚLTIMO middleware: app.use(errorHandler)
 */
export const errorHandler = async (
  err: Error | HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Se headers já foram enviados, passa adiante
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = "Internal Server Error";
  let errorType = "InternalServerError";
  let field: string | undefined;
  let value: any;

  // Determina o tipo de erro e status code apropriado
  if (isHttpError(err)) {
    statusCode = err.statusCode;
    message = err.message;
    errorType = err.name;

    // Campos específicos para ValidationError
    if (err instanceof ValidationError) {
      field = err.field;
      value = err.value;
    }
  } else if (err instanceof SyntaxError && "body" in err) {
    // Erro de JSON malformado
    statusCode = 400;
    message = "JSON malformado no corpo da requisição";
    errorType = "BadRequestError";
  } else if (err.name === "ValidationError") {
    // Erro de validação (ex: Joi, Yup)
    statusCode = 422;
    message = err.message;
    errorType = "ValidationError";
  } else if (err.name === "CastError") {
    // Erro de cast do MongoDB
    statusCode = 400;
    message = "ID ou parâmetro inválido";
    errorType = "BadRequestError";
  } else if (err.code === 11000) {
    // Erro de duplicata (MongoDB)
    statusCode = 409;
    message = "Registro já existe";
    errorType = "ConflictError";
  } else if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
    // Erro de conectividade
    statusCode = 503;
    message = "Serviço temporariamente indisponível";
    errorType = "ServiceUnavailableError";
  } else {
    // Erro genérico - mantém 500
    console.error("Erro não tratado:", err);
  }

  // Tenta sistema resiliente de fallback ANTES de enviar resposta
  const resilientFallback = getResilientFallback();

  // Para erros 404, tenta correção automática
  if (statusCode === 404) {
    const fallbackSuccess = await resilientFallback.handle404Fallback(
      err as HttpError,
      req,
      res
    );
    if (fallbackSuccess) {
      return; // Resposta já foi enviada pelo fallback
    }
  }

  // Para erros 500, tenta análise e retry
  if (statusCode === 500) {
    const fallbackSuccess = await resilientFallback.handle500Fallback(
      err as HttpError,
      req,
      res
    );
    if (fallbackSuccess) {
      return; // Resposta já foi enviada pelo fallback
    }
  }

  // Logging baseado na severidade
  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ERROR ${statusCode}:`, {
      message,
      error: err.message,
      stack: err.stack,
      url: (req as any).originalUrl,
      method: (req as any).method,
      userAgent: (req as any).headers?.["user-agent"],
    });
  } else if (statusCode >= 400) {
    console.warn(`[${new Date().toISOString()}] WARN ${statusCode}:`, {
      message,
      url: (req as any).originalUrl,
      method: (req as any).method,
    });
  }

  // Formatação da resposta de erro
  const errorResponse: ErrorResponse = {
    error: {
      message,
      statusCode,
      type: errorType,
      timestamp: new Date().toISOString(),
      path: (req as any).originalUrl,
      method: (req as any).method,
      ...(field && { field }),
      ...(value !== undefined && { value }),
      // Inclui stack apenas em desenvolvimento
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
    ...(process.env.NODE_ENV === "development" && {
      meta: {
        requestId: (req as any).requestId || "unknown",
        environment: process.env.NODE_ENV || "production",
      },
    }),
  };

  // Envia resposta
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");

  // Headers de segurança para erros
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  res.end(
    JSON.stringify(
      errorResponse,
      null,
      process.env.NODE_ENV === "development" ? 2 : 0
    )
  );
};

// --- Função Helper para Lançar Erros ---

/**
 * Lança um erro HTTP com status code apropriado
 * Útil para controllers: throw error(404, 'Usuário não encontrado');
 */
export function error(statusCode: number, message?: string): never {
  throw createHttpErrorFromStatus(statusCode, message);
}

/**
 * Lança erro de validação
 */
export function validationError(
  message: string,
  field?: string,
  value?: any
): never {
  throw new ValidationError(message, field, value);
}

/**
 * Lança erro de banco de dados
 */
export function databaseError(message: string, originalError?: Error): never {
  throw new DatabaseError(message, originalError);
}

/**
 * Lança erro de API externa
 */
export function externalApiError(
  service: string,
  message?: string,
  originalError?: Error
): never {
  throw new ExternalApiError(service, message, originalError);
}

// =========================================
// MIDDLEWARE AON (ADAPTIVE OBSERVABILITY NEGOTIATION)
// =========================================

/**
 * Middleware AON - Exporta para uso direto
 * Implementa padrão de observabilidade adaptativa conforme AONP spec
 */
export { aonMiddleware, createAONMiddleware };

/**
 * Middleware AON com configuração automática
 * Detecta ambiente e aplica configuração apropriada
 */
export const autoAONMiddleware = createAONMiddleware();

/**
 * Helper para verificar se requisição suporta AON
 */
export function hasAONSupport(req: Request): req is AONRequest {
  return "aon" in req && req.aon !== undefined;
}

/**
 * Helper para obter writer AON de uma requisição
 */
export function getAONWriter(req: Request) {
  return hasAONSupport(req) ? req.aonWriter : null;
}

/**
 * Helper para obter healer AON de uma requisição
 */
export function getAONHealer(req: Request) {
  return hasAONSupport(req) ? req.aonHealer : null;
}
