import { Request, Response, NextFunction, RequestHandler } from './types';
import * as jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import { randomUUID } from 'node:crypto';

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

export const sessionMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  
  // Lê cookies
  const cookies = cookie.parse(req.headers.cookie || '');
  let sessionId = cookies['sid'];

  // Se não tem sessão, cria
  if (!sessionId || !sessionStore.has(sessionId)) {
    sessionId = randomUUID();
    sessionStore.set(sessionId, { id: sessionId, createdAt: Date.now() });
    
    // Define cookie no response
    res.setHeader('Set-Cookie', cookie.serialize('sid', sessionId, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 // 1 dia
    }));
  }

  // Injeta no Request
  authReq.session = sessionStore.get(sessionId);
  next();
};

// --- 2. JWT Auth Middleware ---

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export const authMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const authHeader = req.headers['authorization']; // Bearer <token>

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    authReq.user = decoded; // Usuário disponível!
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};