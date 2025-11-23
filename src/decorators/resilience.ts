import { NextFunction, Request, RequestHandler, Response } from '../types';
import { createHandlerDecorator } from './base';

type ResilientHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
}

export const CircuitBreaker = (options: CircuitBreakerOptions = {}): MethodDecorator => {
  const config = {
    failureThreshold: options.failureThreshold ?? 5,
    resetTimeoutMs: options.resetTimeoutMs ?? 10000,
  };

  return createHandlerDecorator((handler) => {
    let failures = 0;
    let nextAttempt = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    const execute: ResilientHandler = async (req, res, next) => {
      const now = Date.now();
      if (state === 'open') {
        if (now >= nextAttempt) {
          state = 'half-open';
        } else {
          return res
            .status(503)
            .json({ error: 'Circuit breaker aberto, tente novamente mais tarde.' });
        }
      }

      try {
        await handler(req, res, next);
        failures = 0;
        state = 'closed';
      } catch (error) {
        failures += 1;
        if (failures >= config.failureThreshold) {
          state = 'open';
          nextAttempt = Date.now() + config.resetTimeoutMs;
        }
        next(error);
      }
    };

    return execute;
  });
};

interface TimeoutOptions {
  ms?: number;
}

export const Timeout = (options: TimeoutOptions = {}): MethodDecorator => {
  const timeoutMs = options.ms ?? 5000;
  return createHandlerDecorator((handler) => {
    const execute: ResilientHandler = async (req, res, next) => {
      let timer: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms excedido`)), timeoutMs);
      });

      try {
        await Promise.race([handler(req, res, next), timeoutPromise]);
      } catch (error) {
        if (!res.headersSent) {
          res.status(504).json({ error: 'Timeout executando handler' });
        }
        if (error instanceof Error && error.message.includes('Timeout')) {
          return;
        }
        next(error);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    return execute;
  });
};

interface FailoverOptions {
  fallback?: RequestHandler;
}

export const Failover = (options: FailoverOptions = {}): MethodDecorator => {
  const fallbackResponse: RequestHandler =
    options.fallback ??
    ((_req, res) => {
      res.status(503).json({ error: 'Serviço temporariamente indisponível' });
    });

  return createHandlerDecorator((handler) => {
    const execute: ResilientHandler = async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        console.warn('[Failover] acionado, chamando fallback:', error);
        try {
          await Promise.resolve(fallbackResponse(req, res, next));
        } catch (fallbackError) {
          next(fallbackError);
        }
      }
    };

    return execute;
  });
};

