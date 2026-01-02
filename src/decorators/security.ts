import * as cookie from "cookie";
import { jwtVerify } from "@purecore/one-jwt-4-all";
import { Request, Response, NextFunction, RequestHandler } from "../types";
import { createHandlerDecorator } from "./base";

interface AuthRequest extends Request {
  user?: unknown;
}

export const AuthExpressGuard = (): MethodDecorator => {
  return createHandlerDecorator((handler) => {
    const execute = async (req: Request, res: Response, next: NextFunction) => {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      return handler(req, res, next);
    };

    return execute;
  });
};

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.replace(/[<>"]/g, "");
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      sanitized[key] = sanitizeValue(val);
    });
    return sanitized;
  }
  return value;
};

export const XSSGuard = (): MethodDecorator => {
  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      req.body = sanitizeValue(req.body) as any;
      req.query = sanitizeValue(req.query) as any;
      req.params = sanitizeValue(req.params) as any;
      return handler(req, res, next);
    };

    return execute;
  });
};

interface AuthJWTGuardOptions {
  headerName?: string;
  secret?: string;
}

export const AuthJWTGuard = (
  options: AuthJWTGuardOptions = {}
): MethodDecorator => {
  const header = options.headerName ?? "authorization";
  const secret = options.secret ?? process.env.JWT_SECRET ?? "fallback-secret";

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      const tokenHeader = req.headers[header] as string | undefined;
      if (!tokenHeader) {
        return res.status(401).json({ error: "Token não informado" });
      }
      const [, token] = tokenHeader.split(" ");
      try {
        const { payload } = await jwtVerify(token ?? tokenHeader, secret);
        (req as AuthRequest).user = payload;
      } catch (_err) {
        return res.status(403).json({ error: "Token inválido" });
      }
      return handler(req, res, next);
    };

    return execute;
  });
};

const idemStore = new Map<string, unknown>();

export const IdempotentGuard = (): MethodDecorator => {
  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      const key = (
        req.headers["x-idempotency-key"] as string | undefined
      )?.trim();
      if (!key) {
        return res
          .status(400)
          .json({ error: "Cabeçalho x-idempotency-key é obrigatório" });
      }

      if (idemStore.has(key)) {
        return res.json(idemStore.get(key));
      }

      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        idemStore.set(key, body);
        return originalJson(body);
      };

      try {
        await handler(req, res, next);
      } finally {
        res.json = originalJson;
      }
    };

    return execute;
  });
};

interface CSRFGuardOptions {
  headerName?: string;
  cookieName?: string;
}

export const CSRFGuard = (options: CSRFGuardOptions = {}): MethodDecorator => {
  const headerName = options.headerName ?? "x-csrf-token";
  const cookieName = options.cookieName ?? "csrf-token";
  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      const headerToken = req.headers[headerName] as string | undefined;
      const cookies = cookie.parse(req.headers.cookie ?? "");
      const cookieToken = cookies[cookieName];

      if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        return res.status(403).json({ error: "Falha na validação CSRF" });
      }

      return handler(req, res, next);
    };

    return execute;
  });
};
