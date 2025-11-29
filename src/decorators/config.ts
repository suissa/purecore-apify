/**
 * Configuração Centralizada de Decorators
 * Exporta todos os decorators organizados por categoria
 */

// Imports de decorators existentes
import { Logs, Metrics, TraceSpan } from './observability.js';
import { CircuitBreaker, Timeout, Failover } from './resilience.js';
import { AuthExpressGuard, XSSGuard as XSSGuardSecurity, CSRFGuard as CSRFGuardSecurity, AuthJWTGuard, IdempotentGuard as IdempotentGuardSecurity } from './security.js';
import { CQRS as CQRSPerformance } from './performance.js';

// Imports dos novos decorators
import { PresetDecoratorFactory } from './preset.js';
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
  HSTSGuard as HSTSGuardHelmet,
  XContentTypeOptionsGuard,
  XDNSPrefetchControlGuard,
  XDownloadOptionsGuard,
  XFrameOptionsGuard,
  XPermittedCrossDomainPoliciesGuard,
  XPoweredByGuard,
  XXSSProtectionGuard,
  helmet
} from './helmet.js';

// Imports de tipos e JWT
import { Request, Response, NextFunction, RequestHandler } from '../types';
import { createHandlerDecorator } from './base';
import * as jwt from 'jsonwebtoken';

// =========================================
// INTERFACES E TIPOS
// =========================================

interface AuthRequest extends Request {
  user?: unknown;
}

interface AuthJWTGuardOptions {
  headerName?: string;
  secret?: string;
}

interface CORSOptions {
  origin?: string | string[] | ((origin: string | undefined) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  optionsSuccessStatus?: number;
}

// =========================================
// IMPLEMENTAÇÕES DE DECORATORS
// =========================================

// CQRS - Reutiliza implementação do performance.ts
export const CQRS = CQRSPerformance;

// CORS Guard - Implementação completa de CORS
export const CORSGuard = (options: CORSOptions = {}): MethodDecorator => {
  const {
    origin = '*',
    methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400, // 24 hours
    optionsSuccessStatus = 204
  } = options;

  return createHandlerDecorator((handler) => {
    const execute = async (req: Request, res: Response, next: NextFunction) => {
      // Set CORS headers
      const requestOrigin = req.headers.origin;

      // Handle origin
      if (origin === '*') {
        res.setHeader('Access-Control-Allow-Origin', '*');
      } else if (typeof origin === 'string') {
        if (origin === requestOrigin) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        }
      } else if (Array.isArray(origin)) {
        if (requestOrigin && origin.includes(requestOrigin)) {
          res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        }
      } else if (typeof origin === 'function') {
        if (origin(requestOrigin)) {
          res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
        }
      }

      // Set other CORS headers
      if (credentials && res.getHeader('Access-Control-Allow-Origin') !== '*') {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));

      if (exposedHeaders.length > 0) {
        res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
      }

      res.setHeader('Access-Control-Max-Age', maxAge.toString());

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(optionsSuccessStatus).end();
        return;
      }

      return handler(req, res, next);
    };

    return execute;
  });
};

// HSTS Guard - Reutiliza implementação do helmet.ts
export const HSTSGuard = HSTSGuardHelmet;

// XSS Guard - Reutiliza implementação do security.ts
export const XSSGuard = XSSGuardSecurity;

// CSRF Guard - Reutiliza implementação do security.ts
export const CSRFGuard = CSRFGuardSecurity;

// Auth Guards - Reutiliza implementação do security.ts
export const AuthJwtGuard = AuthJWTGuard;

// Idempotent Guard - Reutiliza implementação do security.ts
export const IdempotentGuard = IdempotentGuardSecurity;

// =========================================
// EXPORTS ORGANIZADOS POR CATEGORIA
// =========================================

// Performance & Optimization
export {
  Memoization,
  MemoCache,
  ApiCache
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
  XContentTypeOptionsGuard,
  XDNSPrefetchControlGuard,
  XDownloadOptionsGuard,
  XFrameOptionsGuard,
  XPermittedCrossDomainPoliciesGuard,
  XPoweredByGuard,
  XXSSProtectionGuard,
  helmet // Função helper para middleware
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
  MemoCache({ ttl: 300 }),
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
  XSSGuard
]);

/**
 * Performance Sentinel - Otimizado para performance
 */
export const PerformanceSentinel = PresetDecoratorFactory([
  CQRS,
  MemoCache({ ttl: 300 }),
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
  MemoCache({ ttl: 300 }),
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
  AuthJwtGuard({ secret: process.env.JWT_SECRET }),
  XSSGuard,

  // Helmet.js - Headers de segurança HTTP completos
  HelmetGuard({
    contentSecurityPolicy: true,
    strictTransportSecurity: true,
    xFrameOptions: true,
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xXssProtection: true,
    xPoweredBy: true
  }),

  // Performance
  MemoCache({ ttl: 300 })
]);

/**
 * API Sentinel - Para endpoints REST com validação e cache
 */
export const ApiSentinel = PresetDecoratorFactory([
  Logs,
  Metrics,
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
  CatchWithRetry(3, 1000) // 3 tentativas com 1s de delay
]);

/**
 * External API Sentinel - Para chamadas a APIs externas
 */
export const ExternalApiSentinel = PresetDecoratorFactory([
  Logs,
  CircuitBreaker,
  Timeout,
  Memoization({ ttl: 300 }), // Cache por 5 minutos
  CatchWithRetry(2, 2000) // 2 tentativas com 2s de delay
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
  private wsConnections = new Map<string, any>();
  private retryQueues = new Map<string, any[]>();
  private processingChannels = new Map<string, boolean>();

  /**
   * Registra uma conexão WebSocket para uma rota específica
   */
  registerConnection(routeKey: string, ws: any) {
    this.wsConnections.set(routeKey, ws);
    console.log(`🔗 WS Retry Channel registrado para ${routeKey}`);

    if (ws.on) {
      ws.on('message', (data: any) => {
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
    if (ws && ws.readyState === 1) { // OPEN state
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
  return createHandlerDecorator((handler) => {
    const execute = async (req: Request, res: Response, next: NextFunction) => {
      // Verifica se a rota deve ser excluída da autenticação
      const routePath = (req as any).route?.path || req.originalUrl || req.url || '';
      if (noAuthManager.shouldSkipAuth(req.method || '', routePath)) {
        // Pula autenticação para rotas excluídas
        console.log(`🔓 Auth skipped for ${req.method} ${routePath} (NO_AUTH)`);
        return handler(req, res, next);
      }

      // Aplica autenticação normal
      if (!(req as AuthRequest).user) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
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


