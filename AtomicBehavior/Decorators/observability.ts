import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Request, Response, NextFunction } from '../types';
import { createHandlerDecorator } from './base';

interface MetricsSnapshot {
  calls: number;
  failures: number;
  totalTimeMs: number;
}

const metricsRegistry = new Map<string | symbol, MetricsSnapshot>();

const getOrCreateMetrics = (key: string | symbol): MetricsSnapshot => {
  if (!metricsRegistry.has(key)) {
    metricsRegistry.set(key, { calls: 0, failures: 0, totalTimeMs: 0 });
  }
  return metricsRegistry.get(key)!;
};

export const Logs = (): MethodDecorator => {
  return createHandlerDecorator((handler, meta) => {
    const execute = async (req: Request, res: Response, next: NextFunction) => {
      const start = performance.now();
      console.info(`[Logs] ${String(meta.propertyKey)} - start`, {
        method: req.method,
        url: req.originalUrl ?? req.url,
      });

      try {
        await handler(req, res, next);
        const duration = performance.now() - start;
        console.info(`[Logs] ${String(meta.propertyKey)} - ok`, { duration });
      } catch (error) {
        const duration = performance.now() - start;
        console.error(`[Logs] ${String(meta.propertyKey)} - error`, { duration, error });
        next(error);
      }
    };

    return execute;
  });
};

export const Metrics = (): MethodDecorator => {
  return createHandlerDecorator((handler, meta) => {
    const execute = async (req: Request, res: Response, next: NextFunction) => {
      const snapshot = getOrCreateMetrics(meta.propertyKey);
      const start = performance.now();
      snapshot.calls += 1;
      try {
        await handler(req, res, next);
      } catch (error) {
        snapshot.failures += 1;
        throw error;
      } finally {
        snapshot.totalTimeMs += performance.now() - start;
      }
    };

    return execute;
  });
};

export const getMetricsSnapshot = (): Record<string, MetricsSnapshot> => {
  const result: Record<string, MetricsSnapshot> = {};
  metricsRegistry.forEach((value, key) => {
    result[String(key)] = { ...value };
  });
  return result;
};

export const TraceSpan = (spanName?: string): MethodDecorator => {
  return createHandlerDecorator((handler, meta) => {
    const execute = async (req: Request, res: Response, next: NextFunction) => {
      const spanId = randomUUID();
      const name = spanName ?? String(meta.propertyKey);
      const start = performance.now();
      res.setHeader('x-trace-span', spanId);
      res.setHeader('x-trace-span-name', name);

      try {
        await handler(req, res, next);
      } finally {
        const duration = performance.now() - start;
        res.setHeader('x-trace-span-duration', duration.toFixed(2));
      }
    };

    return execute;
  });
};

