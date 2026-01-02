import { performance, PerformanceObserver } from 'node:perf_hooks';
import { EventEmitter } from 'node:events';

/**
 * Monitor de Performance usando APIs nativas do Node.js 18+
 * Coleta métricas detalhadas sem overhead significativo
 */

export interface PerformanceMetrics {
  httpRequests: {
    total: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  eventLoop: {
    lag: number;
    utilization: number;
  };
  gc: {
    collections: number;
    duration: number;
    reclaimedBytes: number;
  };
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];
  private intervalId?: NodeJS.Timeout;
  private startTime = Date.now();

  constructor() {
    super();
    this.setupObservers();
    this.startMonitoring();
  }

  /**
   * Marca o início de uma operação
   */
  markStart(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * Marca o fim de uma operação e calcula a duração
   */
  markEnd(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    const duration = measure?.duration || 0;

    this.recordMetric(name, duration);
    return duration;
  }

  /**
   * Registra uma métrica customizada
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);

    // Mantém apenas os últimos 1000 valores para evitar vazamento de memória
    if (values.length > 1000) {
      values.shift();
    }
  }

  /**
   * Obtém estatísticas de uma métrica
   */
  getMetricStats(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count,
      avg: sum / count,
      min: sorted[0],
      max: sorted[count - 1],
      p95: sorted[Math.floor(count * 0.95)] || 0,
      p99: sorted[Math.floor(count * 0.99)] || 0
    };
  }

  /**
   * Obtém todas as métricas atuais
   */
  getAllMetrics(): PerformanceMetrics {
    const httpStats = this.getMetricStats('http-request');
    const errorStats = this.getMetricStats('http-error');
    
    return {
      httpRequests: {
        total: httpStats.count,
        averageResponseTime: httpStats.avg,
        p95ResponseTime: httpStats.p95,
        p99ResponseTime: httpStats.p99,
        errorRate: errorStats.count / Math.max(httpStats.count, 1)
      },
      memory: this.getMemoryMetrics(),
      eventLoop: this.getEventLoopMetrics(),
      gc: this.getGCMetrics()
    };
  }

  /**
   * Middleware para monitorar requisições HTTP
   */
  httpMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const requestId = `req-${startTime}-${Math.random()}`;
      
      this.markStart(requestId);

      // Intercepta o fim da resposta
      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        const duration = this.markEnd(requestId);
        
        this.recordMetric('http-request', duration);
        
        if (res.statusCode >= 400) {
          this.recordMetric('http-error', 1);
        }

        this.emit('http-request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          timestamp: Date.now()
        });

        return originalEnd.apply(res, args);
      };

      next();
    };
  }

  private setupObservers(): void {
    // Observer para HTTP requests
    const httpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          this.emit('performance-measure', entry);
        }
      }
    });
    httpObserver.observe({ entryTypes: ['measure'] });
    this.observers.push(httpObserver);

    // Observer para GC (se disponível)
    try {
      const gcObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('gc-duration', entry.duration);
          this.emit('gc-event', entry);
        }
      });
      gcObserver.observe({ entryTypes: ['gc'] });
      this.observers.push(gcObserver);
    } catch (error) {
      // GC observer não disponível em todas as versões
      console.warn('GC observer não disponível:', error);
    }
  }

  private startMonitoring(): void {
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // Coleta a cada 5 segundos

    this.intervalId.unref(); // Permite que o processo termine
  }

  private collectSystemMetrics(): void {
    // Métricas de memória
    const memUsage = process.memoryUsage();
    this.recordMetric('memory-heap-used', memUsage.heapUsed);
    this.recordMetric('memory-heap-total', memUsage.heapTotal);
    this.recordMetric('memory-rss', memUsage.rss);

    // Event Loop Lag
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms
      this.recordMetric('event-loop-lag', lag);
    });

    // CPU Usage (aproximado)
    const cpuUsage = process.cpuUsage();
    this.recordMetric('cpu-user', cpuUsage.user);
    this.recordMetric('cpu-system', cpuUsage.system);

    this.emit('system-metrics', {
      memory: memUsage,
      uptime: Date.now() - this.startTime,
      timestamp: Date.now()
    });
  }

  private getMemoryMetrics() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    };
  }

  private getEventLoopMetrics() {
    const lagStats = this.getMetricStats('event-loop-lag');
    return {
      lag: lagStats.avg,
      utilization: Math.min(lagStats.avg / 10, 1) // Aproximação simples
    };
  }

  private getGCMetrics() {
    const gcStats = this.getMetricStats('gc-duration');
    return {
      collections: gcStats.count,
      duration: gcStats.avg,
      reclaimedBytes: 0 // Não disponível facilmente
    };
  }

  /**
   * Gera relatório de performance
   */
  generateReport(): string {
    const metrics = this.getAllMetrics();
    const uptime = Date.now() - this.startTime;

    return `
=== Performance Report ===
Uptime: ${Math.floor(uptime / 1000)}s

HTTP Requests:
  Total: ${metrics.httpRequests.total}
  Avg Response Time: ${metrics.httpRequests.averageResponseTime.toFixed(2)}ms
  P95 Response Time: ${metrics.httpRequests.p95ResponseTime.toFixed(2)}ms
  P99 Response Time: ${metrics.httpRequests.p99ResponseTime.toFixed(2)}ms
  Error Rate: ${(metrics.httpRequests.errorRate * 100).toFixed(2)}%

Memory:
  Heap Used: ${(metrics.memory.heapUsed / 1024 / 1024).toFixed(2)}MB
  Heap Total: ${(metrics.memory.heapTotal / 1024 / 1024).toFixed(2)}MB
  RSS: ${(metrics.memory.rss / 1024 / 1024).toFixed(2)}MB

Event Loop:
  Lag: ${metrics.eventLoop.lag.toFixed(2)}ms
  Utilization: ${(metrics.eventLoop.utilization * 100).toFixed(2)}%

Garbage Collection:
  Collections: ${metrics.gc.collections}
  Avg Duration: ${metrics.gc.duration.toFixed(2)}ms
`;
  }

  /**
   * Limpa recursos e para o monitoramento
   */
  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    for (const observer of this.observers) {
      observer.disconnect();
    }

    this.metrics.clear();
    this.removeAllListeners();
  }
}

// Singleton global
let globalMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Decorator para monitorar performance de métodos
 */
export function Monitor(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      monitor.markStart(name);
      
      try {
        const result = await originalMethod.apply(this, args);
        monitor.markEnd(name);
        return result;
      } catch (error) {
        monitor.markEnd(name);
        monitor.recordMetric(`${name}-error`, 1);
        throw error;
      }
    };

    return descriptor;
  };
}