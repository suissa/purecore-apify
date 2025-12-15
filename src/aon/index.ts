/**
 * Módulo AON (Adaptive Observability Negotiation)
 * Implementação completa do padrão AONP para PureCore Apify
 * 
 * @see docs/AONP.md - Especificação completa
 */

// =========================================
// EXPORTS PRINCIPAIS
// =========================================

// Middleware principal
export { aonMiddleware, withAON, analyzeIntent, performHealing, reportStatus } from './middleware.js';

// Tipos e interfaces
export type {
  AONConfig,
  AONContext,
  AONEvent,
  AONRequest,
  AONResponse,
  AONStreamWriter,
  AONHealer,
  AONSeverity,
  AONIntentAnalysisEvent,
  AONHealingEvent,
  AONStatusEvent,
  AONResultEvent,
  AONErrorEvent
} from './types.js';

// Utilitários
export { createAONEvent, isAONEvent } from './types.js';
export { createAONStreamWriter } from './stream-writer.js';
export { createAONHealer } from './healer.js';

// =========================================
// CONFIGURAÇÃO RÁPIDA
// =========================================

/**
 * Configuração AON para desenvolvimento
 * - Modo debug ativo
 * - Telemetria detalhada
 * - Timeouts maiores
 */
export const AON_DEV_CONFIG = {
  enabled: true,
  productionDetailLevel: 'detailed' as const,
  healingTimeout: 15000,
  maxTelemetryEvents: 2000,
  debug: true
};

/**
 * Configuração AON para produção
 * - Modo debug desativo
 * - Telemetria otimizada
 * - Timeouts menores
 */
export const AON_PROD_CONFIG = {
  enabled: true,
  productionDetailLevel: 'standard' as const,
  healingTimeout: 5000,
  maxTelemetryEvents: 500,
  debug: false
};

/**
 * Configuração AON mínima
 * - Apenas healing essencial
 * - Sem telemetria detalhada
 */
export const AON_MINIMAL_CONFIG = {
  enabled: true,
  productionDetailLevel: 'minimal' as const,
  healingTimeout: 3000,
  maxTelemetryEvents: 100,
  debug: false
};

// =========================================
// FACTORY FUNCTIONS
// =========================================

/**
 * Cria middleware AON com configuração automática baseada no ambiente
 */
export function createAONMiddleware(customConfig?: Partial<typeof AON_DEV_CONFIG>) {
  const env = process.env.NODE_ENV || 'development';
  
  let baseConfig;
  switch (env) {
    case 'production':
      baseConfig = AON_PROD_CONFIG;
      break;
    case 'test':
      baseConfig = AON_MINIMAL_CONFIG;
      break;
    default:
      baseConfig = AON_DEV_CONFIG;
  }

  return aonMiddleware({ ...baseConfig, ...customConfig });
}

// =========================================
// UTILITÁRIOS DE INTEGRAÇÃO
// =========================================

/**
 * Verifica se uma requisição está em modo AON Glass Box
 */
export function isGlassBoxMode(req: any): boolean {
  return req.aon?.mode === 'glassbox';
}

/**
 * Verifica se uma requisição está em modo AON Black Box
 */
export function isBlackBoxMode(req: any): boolean {
  return req.aon?.mode === 'blackbox';
}

/**
 * Obtém estatísticas AON de uma requisição
 */
export function getAONStats(req: any) {
  if (!req.aon) return null;
  
  return {
    requestId: req.aon.requestId,
    mode: req.aon.mode,
    duration: Date.now() - req.aon.startTime,
    eventCount: req.aon.events?.length || 0,
    healingStats: req.aonHealer?.getHealingStats() || null
  };
}

// =========================================
// DECORATORS PARA INTEGRAÇÃO
// =========================================

/**
 * Decorator para métodos que devem usar AON
 * Uso: @withAONSupport
 */
export function withAONSupport(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args: any[]) {
    const req = args.find(arg => arg && arg.aon);
    
    if (req && req.aonWriter) {
      req.aonWriter.status(`Executando ${target.constructor.name}.${propertyKey}`);
    }

    try {
      const result = await originalMethod.apply(this, args);
      
      if (req && req.aonWriter) {
        req.aonWriter.status(`${target.constructor.name}.${propertyKey} executado com sucesso`);
      }
      
      return result;
    } catch (error) {
      if (req && req.aonHealer) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const healed = await req.aonHealer.heal(
          'method_error_recovery',
          `Erro em ${target.constructor.name}.${propertyKey}: ${errorMessage}`,
          { method: propertyKey, class: target.constructor.name, error: errorMessage }
        );
        
        if (!healed) {
          throw error;
        }
        
        // Tenta executar novamente após healing
        return await originalMethod.apply(this, args);
      }
      
      throw error;
    }
  };

  return descriptor;
}

// =========================================
// CONSTANTES E METADADOS
// =========================================

export const AON_VERSION = '1.0.0';
export const AON_SPEC_VERSION = '1.0.0';

export const AON_MIME_TYPES = {
  NDJSON: 'application/x-ndjson',
  JSON: 'application/json'
} as const;

export const AON_HEADERS = {
  SUMMARY: 'X-AON-Summary',
  MODE: 'X-AON-Mode',
  REQUEST_ID: 'X-AON-Request-ID'
} as const;

// =========================================
// LOGGING E DEBUG
// =========================================

/**
 * Logger específico para AON
 */
export const AONLogger = {
  info: (message: string, data?: any) => {
    if (process.env.AON_DEBUG === 'true') {
      console.log(`[AON] ${message}`, data || '');
    }
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[AON] ${message}`, data || '');
  },
  
  error: (message: string, error?: any) => {
    console.error(`[AON] ${message}`, error || '');
  },
  
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development' || process.env.AON_DEBUG === 'true') {
      console.debug(`[AON DEBUG] ${message}`, data || '');
    }
  }
};

console.log(`✅ AON (Adaptive Observability Negotiation) v${AON_VERSION} carregado`);
console.log(`📋 Especificação AONP v${AON_SPEC_VERSION} implementada`);
console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);