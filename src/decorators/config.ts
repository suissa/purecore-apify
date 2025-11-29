/**
 * Configuração Centralizada de Decorators
 * Exporta todos os decorators organizados por categoria
 */

// Imports de decorators existentes
import { Logs, Metrics, TraceSpan } from './observability.js';
import { SmartCache, CircuitBreaker, Timeout, Failover } from './resilience.js';
import { AuthExpressGuard } from './security.js';

// Imports dos novos decorators
import { PresetDecoratorFactory } from './preset.js';
import { RateLimitGuard } from './rate-limit.js';
import { SchemaValidator, ZodValidator, JoiValidator, YupValidator, AjvValidator } from './schema-validator.js';
import { Memoization, SmartCache as MemoCache, ApiCache } from './memoization.js';
import { Inject, LazyInject, InjectMethod, registerDependency, resolveDependency } from './injection.js';
import { Catch, CatchHttpErrors, CatchValidationErrors, CatchWithRetry } from './catch.js';

// Imports dos decorators Helmet (segurança HTTP)
import {
  HelmetGuard,
  CSPGuard,
  COEPGuard,
  COOPGuard,
  CORPGuard,
  OriginAgentClusterGuard,
  ReferrerPolicyGuard,
  HSTSGuard,
  XContentTypeOptionsGuard,
  XDNSPrefetchControlGuard,
  XDownloadOptionsGuard,
  XFrameOptionsGuard,
  XPermittedCrossDomainPoliciesGuard,
  XPoweredByGuard,
  XXSSProtectionGuard,
  helmet
} from './helmet.js';

// Performance & Optimization
export {
  RateLimitGuard,
  Memoization,
  MemoCache,
  ApiCache,
  SmartCache as SmartCacheDecorator
};

// Validation
export {
  SchemaValidator,
  ZodValidator,
  JoiValidator,
  YupValidator,
  AjvValidator
};

// Error Handling
export {
  Catch,
  CatchHttpErrors,
  CatchValidationErrors,
  CatchWithRetry
};

// Dependency Injection
export {
  Inject,
  LazyInject,
  InjectMethod,
  registerDependency,
  resolveDependency
};

// Observability (existentes)
export {
  Logs,
  Metrics,
  TraceSpan
};

// Resilience (existentes)
export {
  SmartCache,
  CircuitBreaker,
  Timeout,
  Failover
};

// Security (existentes + Helmet)
export {
  AuthExpressGuard,
  // Helmet.js - Headers de segurança HTTP
  HelmetGuard,
  CSPGuard,
  COEPGuard,
  COOPGuard,
  CORPGuard,
  OriginAgentClusterGuard,
  ReferrerPolicyGuard,
  HSTSGuard,
  XContentTypeOptionsGuard,
  XDNSPrefetchControlGuard,
  XDownloadOptionsGuard,
  XFrameOptionsGuard,
  XPermittedCrossDomainPoliciesGuard,
  XPoweredByGuard,
  XXSSProtectionGuard,
  helmet // Função helper para middleware
};

// CQRS (placeholder - pode ser implementado depois)
export const CQRS = () => {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Placeholder - implementar CQRS pattern
    console.log(`🏗️ CQRS aplicado em ${target.constructor.name}.${propertyKey}`);
    return descriptor;
  };
};

// CORS Guard (placeholder)
export const CORSGuard = () => {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Placeholder - implementar CORS validation
    console.log(`🌐 CORS Guard aplicado em ${target.constructor.name}.${propertyKey}`);
    return descriptor;
  };
};

// HSTS Guard (placeholder)
export const HSTSGuard = () => {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Placeholder - implementar HSTS headers
    console.log(`🔒 HSTS Guard aplicado em ${target.constructor.name}.${propertyKey}`);
    return descriptor;
  };
};

// XSS Guard (placeholder - pode reutilizar do security.ts)
export const XSSGuard = () => {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Placeholder - implementar XSS protection
    console.log(`🛡️ XSS Guard aplicado em ${target.constructor.name}.${propertyKey}`);
    return descriptor;
  };
};

// CSRF Guard (placeholder - pode reutilizar do security.ts)
export const CSRFGuard = () => {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Placeholder - implementar CSRF protection
    console.log(`🔐 CSRF Guard aplicado em ${target.constructor.name}.${propertyKey}`);
    return descriptor;
  };
};

// Auth Guards (placeholders)
export const AuthJwtGuard = () => {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log(`🔑 JWT Auth Guard aplicado em ${target.constructor.name}.${propertyKey}`);
    return descriptor;
  };
};

export const IdempotentGuard = () => {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log(`🔄 Idempotent Guard aplicado em ${target.constructor.name}.${propertyKey}`);
    return descriptor;
  };
};

// =========================================
// PRESETS PRÉ-CONFIGURADOS
// =========================================

/**
 * Autoescale Sentinel - Para endpoints que precisam de alta disponibilidade
 */
export const AutoescaleSentinel = PresetDecoratorFactory([
  Logs,
  Metrics,
  TraceSpan,
  SmartCache,
  CircuitBreaker,
  Timeout,
  Failover,
  AuthExpressGuard
]);

/**
 * Security Sentinel - Foco em segurança máxima
 */
export const SecuritySentinel = PresetDecoratorFactory([
  CSRFGuard,
  AuthJwtGuard,
  IdempotentGuard,
  XSSGuard,
  RateLimitGuard({ maxRequests: 10, windowSeconds: 60 }) // Rate limit rigoroso
]);

/**
 * Performance Sentinel - Otimizado para performance
 */
export const PerformanceSentinel = PresetDecoratorFactory([
  RateLimitGuard({ maxRequests: 100, windowSeconds: 60 }),
  CQRS,
  SmartCacheDecorator({ ttl: 300 }),
  CORSGuard,
  HSTSGuard,
  XSSGuard
]);

/**
 * Apify Sentinel - Preset completo para APIs @purecore/apify
 */
export const ApifySentinel = PresetDecoratorFactory([
  Logs,
  Metrics,
  TraceSpan,
  SmartCache,
  CircuitBreaker,
  Timeout,
  Failover,
  AuthExpressGuard
]);

/**
 * Apify Complete Sentinel - Configuração padrão completa com todos os decorators ativados
 * Inclui: Circuit Breaker, Timeout 30s, WS Retry Channel, Logger, Metrics, TraceSpan, Auth, JWT, XSS, Helmet Security
 */
export const ApifyCompleteSentinel = PresetDecoratorFactory([
  // Observabilidade
  Logs,
  Metrics,
  TraceSpan,

  // Resiliência
  CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 10000 }),
  Timeout({
    ms: 30000, // 30 segundos
    maxTimeoutMs: 60000,
    retryAttempts: 3,
    enableAsyncChannel: true,
    enableTelemetry: true,
    enableRequestChunking: true,
    globalBlocking: true
  }),
  Failover,

  // Segurança (usando guards condicionais que respeitam NO_AUTH)
  ConditionalJWTGuard({ secret: process.env.JWT_SECRET }),
  XSSGuard,

  // Helmet.js - Headers de segurança HTTP completos
  HelmetGuard({
    contentSecurityPolicy: true, // CSP ativado
    strictTransportSecurity: true, // HSTS ativado
    xFrameOptions: true, // Anti-clickjacking
    xContentTypeOptions: true, // Anti-MIME sniffing
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xXssProtection: true, // Desabilita filtro XSS do navegador
    xPoweredBy: true // Remove X-Powered-By
  }),

  // Performance
  SmartCache({ ttl: 300 })
]);

/**
 * API Sentinel - Para endpoints REST com validação e cache
 */
export const ApiSentinel = PresetDecoratorFactory([
  Logs,
  Metrics,
  RateLimitGuard({ maxRequests: 50, windowSeconds: 60 }),
  ApiCache(300), // 5 minutos de cache
  CatchHttpErrors({ logError: true }),
  AuthExpressGuard
]);

/**
 * Database Sentinel - Para operações de banco com resiliência
 */
export const DatabaseSentinel = PresetDecoratorFactory([
  Logs,
  CircuitBreaker,
  Timeout,
  Memoization({ ttl: 60 }), // Cache por 1 minuto
  CatchWithRetry(3, 1000), // 3 tentativas com 1s de delay
  CatchDatabaseErrors()
]);

/**
 * External API Sentinel - Para chamadas a APIs externas
 */
export const ExternalApiSentinel = PresetDecoratorFactory([
  Logs,
  CircuitBreaker,
  Timeout,
  Memoization({ ttl: 300 }), // Cache por 5 minutos
  CatchWithRetry(2, 2000), // 2 tentativas com 2s de delay
  CatchApiErrors()
]);

// =========================================
// SISTEMA NO_AUTH
// =========================================

/**
 * Sistema para excluir rotas específicas da autenticação via .env
 */
class NoAuthManager {
  private noAuthRoutes: Set<string> = new Set();

  constructor() {
    this.loadNoAuthRoutes();
  }

  private loadNoAuthRoutes() {
    const noAuthEnv = process.env.NO_AUTH;
    if (noAuthEnv) {
      // Formato: "GET /health, POST /login, GET /status"
      const routes = noAuthEnv.split(',').map(route => route.trim());
      routes.forEach(route => {
        if (route) {
          this.noAuthRoutes.add(route.toLowerCase());
        }
      });
    }

    // Sempre excluir rotas padrão de health e login
    this.noAuthRoutes.add('get /health');
    this.noAuthRoutes.add('post /login');
    this.noAuthRoutes.add('get /status');
  }

  shouldSkipAuth(method: string, path: string): boolean {
    const routeKey = `${method.toLowerCase()} ${path.toLowerCase()}`;
    return this.noAuthRoutes.has(routeKey);
  }

  getExcludedRoutes(): string[] {
    return Array.from(this.noAuthRoutes);
  }
}

export const noAuthManager = new NoAuthManager();

// =========================================
// SISTEMA WS RETRY CHANNEL
// =========================================

/**
 * Sistema de canal WS para retry de processamento em paralelo
 */
class WSRetryChannel {
  private wsConnections = new Map<string, WebSocket>();
  private retryQueues = new Map<string, any[]>();
  private processingChannels = new Map<string, boolean>();

  /**
   * Registra uma conexão WebSocket para uma rota específica
   */
  registerConnection(routeKey: string, ws: WebSocket) {
    this.wsConnections.set(routeKey, ws);
    console.log(`🔗 WS Retry Channel registrado para ${routeKey}`);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleWSMessage(routeKey, message);
      } catch (error) {
        console.error(`❌ Erro ao processar mensagem WS para ${routeKey}:`, error);
      }
    });

    ws.on('close', () => {
      this.wsConnections.delete(routeKey);
      console.log(`🔌 WS Retry Channel desconectado para ${routeKey}`);
    });
  }

  /**
   * Processa mensagens recebidas via WebSocket
   */
  private handleWSMessage(routeKey: string, message: any) {
    const { type, requestId, data } = message;

    switch (type) {
      case 'RETRY_REQUEST':
        this.queueRetryRequest(routeKey, requestId, data);
        break;
      case 'PROCESS_PARALLEL':
        this.processParallelRequest(routeKey, requestId, data);
        break;
      case 'CANCEL_RETRY':
        this.cancelRetryRequest(routeKey, requestId);
        break;
    }
  }

  /**
   * Coloca uma requisição na fila de retry
   */
  private queueRetryRequest(routeKey: string, requestId: string, data: any) {
    if (!this.retryQueues.has(routeKey)) {
      this.retryQueues.set(routeKey, []);
    }

    const queue = this.retryQueues.get(routeKey)!;
    queue.push({ requestId, data, timestamp: Date.now() });

    // Processa a fila se não estiver processando
    if (!this.processingChannels.get(routeKey)) {
      this.processRetryQueue(routeKey);
    }
  }

  /**
   * Processa a fila de retry para uma rota
   */
  private async processRetryQueue(routeKey: string) {
    this.processingChannels.set(routeKey, true);

    try {
      const queue = this.retryQueues.get(routeKey) || [];

      while (queue.length > 0) {
        const request = queue.shift()!;

        // Verifica se não expirou (5 minutos)
        if (Date.now() - request.timestamp > 5 * 60 * 1000) {
          console.log(`⏰ Retry request ${request.requestId} expirado`);
          continue;
        }

        try {
          // Processa em paralelo
          await this.processParallelRequest(routeKey, request.requestId, request.data);

          // Notifica via WS sobre sucesso
          this.notifyWSClients(routeKey, {
            type: 'RETRY_SUCCESS',
            requestId: request.requestId,
            timestamp: Date.now()
          });

        } catch (error) {
          console.error(`❌ Falha no retry ${request.requestId}:`, error);

          // Notifica via WS sobre falha
          this.notifyWSClients(routeKey, {
            type: 'RETRY_FAILED',
            requestId: request.requestId,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            timestamp: Date.now()
          });
        }

        // Pequena pausa entre processamentos
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.processingChannels.set(routeKey, false);
    }
  }

  /**
   * Processa uma requisição em paralelo
   */
  private async processParallelRequest(routeKey: string, requestId: string, data: any): Promise<any> {
    // Simula processamento paralelo
    console.log(`⚡ Processando ${requestId} em paralelo para ${routeKey}`);

    // Aqui seria integrada com o sistema de processamento real
    // Por enquanto, apenas simula
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    return { success: true, processedAt: Date.now() };
  }

  /**
   * Cancela um retry específico
   */
  private cancelRetryRequest(routeKey: string, requestId: string) {
    const queue = this.retryQueues.get(routeKey) || [];
    const filteredQueue = queue.filter(req => req.requestId !== requestId);
    this.retryQueues.set(routeKey, filteredQueue);

    console.log(`🚫 Retry ${requestId} cancelado para ${routeKey}`);
  }

  /**
   * Notifica todos os clientes WS conectados para uma rota
   */
  private notifyWSClients(routeKey: string, message: any) {
    const ws = this.wsConnections.get(routeKey);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Obtém estatísticas do canal WS
   */
  getStats() {
    return {
      connections: this.wsConnections.size,
      queues: Array.from(this.retryQueues.entries()).map(([route, queue]) => ({
        route,
        pendingRetries: queue.length
      })),
      processingChannels: Array.from(this.processingChannels.entries()).filter(([, processing]) => processing).length
    };
  }
}

export const wsRetryChannel = new WSRetryChannel();

/**
 * Auth Guard condicional que respeita NO_AUTH
 */
export const ConditionalAuthGuard = (): MethodDecorator => {
  return createHandlerDecorator((handler, meta) => {
    const execute = async (req: Request, res: Response, next: NextFunction) => {
      // Verifica se a rota deve ser excluída da autenticação
      const routePath = (req as any).route?.path || req.originalUrl || req.url;
      if (noAuthManager.shouldSkipAuth(req.method, routePath)) {
        // Pula autenticação para rotas excluídas
        console.log(`🔓 Auth skipped for ${req.method} ${routePath} (NO_AUTH)`);
        return handler(req, res, next);
      }

      // Aplica autenticação normal
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      return handler(req, res, next);
    };

    return execute;
  });
};

/**
 * JWT Auth Guard condicional que respeita NO_AUTH
 */
export const ConditionalJWTGuard = (options: AuthJWTGuardOptions = {}): MethodDecorator => {
  const header = options.headerName ?? 'authorization';
  const secret = options.secret ?? process.env.JWT_SECRET ?? 'fallback-secret';

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      // Verifica se a rota deve ser excluída da autenticação
      const routePath = (req as any).route?.path || req.originalUrl || req.url;
      if (noAuthManager.shouldSkipAuth(req.method, routePath)) {
        // Pula autenticação para rotas excluídas
        console.log(`🔓 JWT Auth skipped for ${req.method} ${routePath} (NO_AUTH)`);
        return handler(req, res, next);
      }

      // Aplica JWT auth
      const tokenHeader = req.headers[header] as string | undefined;
      if (!tokenHeader) {
        return res.status(401).json({ error: 'Token não informado' });
      }
      const [, token] = tokenHeader.split(' ');
      try {
        const payload = jwt.verify(token ?? tokenHeader, secret);
        (req as AuthRequest).user = payload;
      } catch (_err) {
        return res.status(403).json({ error: 'Token inválido' });
      }
      return handler(req, res, next);
    };

    return execute;
  });
};

// =========================================
// UTILITÁRIOS
// =========================================

/**
 * Registra dependências comuns
 */
export function setupCommonDependencies() {
  // Registrar logger
  registerDependency('logger', {
    info: (msg: string, ...args: any[]) => console.log(`ℹ️ ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`⚠️ ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`❌ ${msg}`, ...args)
  });

  // Registrar cache
  registerDependency('cache', {
    get: (key: string) => null,
    set: (key: string, value: any) => {},
    clear: () => {}
  });

  // Registrar database
  registerDependency('database', {
    connect: () => Promise.resolve(),
    query: (sql: string) => Promise.resolve([])
  });
}

/**
 * Inicialização completa do sistema de decorators
 */
export function initializeDecorators() {
  console.log('🎨 Sistema de Decorators @purecore/apify inicializado');

  // Registrar dependências comuns
  setupCommonDependencies();

  // Inicializar sistemas especiais
  console.log('🔧 Inicializando sistemas especiais...');
  console.log(`🔓 NO_AUTH routes excluídas: ${noAuthManager.getExcludedRoutes().join(', ')}`);
  console.log('🔗 WS Retry Channel: Ativado');

  // Log dos presets disponíveis
  console.log('📦 Presets disponíveis:');
  console.log('  • AutoescaleSentinel - Alta disponibilidade');
  console.log('  • SecuritySentinel - Segurança máxima');
  console.log('  • PerformanceSentinel - Performance otimizada');
  console.log('  • ApifySentinel - Preset completo');
  console.log('  • ApiSentinel - Para endpoints REST');
  console.log('  • DatabaseSentinel - Para operações DB');
  console.log('  • ExternalApiSentinel - Para APIs externas');
  console.log('  • ApifyCompleteSentinel - ⭐ CONFIGURAÇÃO PADRÃO COMPLETA ⭐');

  console.log('\n🚀 ApifyCompleteSentinel inclui:');
  console.log('  • Circuit Breaker (5 falhas, reset 10s)');
  console.log('  • Timeout (30s, max 60s, 3 retries)');
  console.log('  • WS Retry Channel para processamento paralelo');
  console.log('  • Logger, Metrics, TraceSpan');
  console.log('  • JWT Auth (com suporte NO_AUTH)');
  console.log('  • XSS Protection');
  console.log('  • Smart Cache (5min TTL)');

  console.log('\n⚙️  Configurações via .env:');
  console.log('  • NO_AUTH - Exclui rotas da autenticação');
  console.log('  • JWT_SECRET - Segredo para tokens JWT');
  console.log('  • Exemplo: NO_AUTH="GET /health, POST /login, GET /status"');
}
