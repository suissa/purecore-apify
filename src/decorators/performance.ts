import { Request, Response, NextFunction, RequestHandler } from '../types';
import { createHandlerDecorator } from './base';

interface SmartCacheOptions {
  ttlMs?: number;
  cacheKey?: (req: Request) => string;
}

const smartCacheStore = new Map<string, { data: any; expiresAt: number }>();

export const SmartCache = (options: SmartCacheOptions = {}): MethodDecorator => {
  const ttl = options.ttlMs ?? 1000 * 10;
  const keyBuilder =
    options.cacheKey ??
    ((req: Request) => `${req.method}:${req.originalUrl ?? req.url ?? ''}`);

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      if (req.method !== 'GET') {
        return handler(req, res, next);
      }

      const key = keyBuilder(req);
      const cached = smartCacheStore.get(key);
      const now = Date.now();
      if (cached && cached.expiresAt > now) {
        return res.json(cached.data);
      }

      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        smartCacheStore.set(key, { data: body, expiresAt: Date.now() + ttl });
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

export const CQRS = (): MethodDecorator => {
  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      const isQuery = req.method === 'GET' || req.method === 'HEAD';
      res.setHeader('x-cqrs-role', isQuery ? 'query' : 'command');

      if (isQuery && req.method !== 'GET' && req.method !== 'HEAD') {
        return res.status(405).json({ error: 'Queries devem usar métodos GET/HEAD' });
      }

      if (!isQuery && (req.method === 'GET' || req.method === 'HEAD')) {
        return res.status(405).json({ error: 'Commands devem usar métodos mutáveis' });
      }

      if (isQuery && req.body && Object.keys(req.body).length) {
        return res.status(400).json({ error: 'Queries não suportam body' });
      }

      return handler(req, res, next);
    };

    return execute;
  });
};

