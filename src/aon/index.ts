/**
 * Módulo AON (Adaptive Observability Negotiation)
 * Implementação completa do padrão AONP para PureCore Apify
 * Inclui CrystalBox Mode - Observabilidade Interativa
 * 
 * @see docs/AONP.md - Especificação AON
 * @see docs/Observability.modes.md - Modos de Observabilidade
 */

import { aonMiddleware } from './middleware.js';

// =========================================
// EXPORTS PRINCIPAIS
// =========================================

// Middleware principal AON
export { aonMiddleware, withAON, analyzeIntent, performHealing, reportStatus } from './middleware.js';

// CrystalBox Mode - Observabilidade Interativa
export { 
  crystalBoxMiddleware, 
  withCrystalBox, 
  sendEarlyHints, 
  requestInteractiveHealing,
  isCrystalBoxMode,
  isInteractiveMode
} from './crystal-middleware.js';

export { 
  createCrystalBoxWriter, 
  createDeveloperNotificationService,
  developerNotificationService,
  CrystalBoxWriter,
  DeveloperNotificationService
} from './crystal-box.js';

export { 
  createInteractiveHealer,
  InteractiveHealer
} from './interactive-healer.js';

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

/**
 * Configuração CrystalBox para desenvolvimento
 * - Modo interativo ativo
 * - Notificações de desenvolvedor habilitadas
 * - Detecção de tema e offline
 */
export const CRYSTALBOX_DEV_CONFIG = {
  ...AON_DEV_CONFIG,
  crystalBox: {
    maxAutoAttempts: 3,
    devNotificationThreshold: 2,
    healingTimeout: 30000,
    devResponseTimeout: 30000,
    enableWhatsApp: true,
    enableSlack: true,
    enableTeams: false,
    devContacts: {
      whatsapp: process.env.DEV_WHATSAPP,
      slack: process.env.DEV_SLACK,
      teams: process.env.DEV_TEAMS
    }
  },
  themeDetection: {
    enabled: true,
    defaultTheme: 'dark',
    supportedThemes: ['light', 'dark', 'auto']
  },
  offlineSupport: {
    enabled: true,
    components: ['forms', 'cache', 'sync', 'storage'],
    cacheStrategy: 'aggressive' as const
  }
};

/**
 * Configuração CrystalBox para produção
 * - Modo interativo conservador
 * - Notificações apenas para erros críticos
 */
export const CRYSTALBOX_PROD_CONFIG = {
  ...AON_PROD_CONFIG,
  crystalBox: {
    maxAutoAttempts: 5,
    devNotificationThreshold: 4,
    healingTimeout: 20000,
    devResponseTimeout: 60000,
    enableWhatsApp: true,
    enableSlack: false,
    enableTeams: false,
    devContacts: {
      whatsapp: process.env.PROD_DEV_WHATSAPP
    }
  },
  themeDetection: {
    enabled: true,
    defaultTheme: 'light',
    supportedThemes: ['light', 'dark']
  },
  offlineSupport: {
    enabled: true,
    components: ['cache', 'sync'],
    cacheStrategy: 'conservative' as const
  }
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

/**
 * Cria middleware CrystalBox com configuração automática baseada no ambiente
 */
export function createCrystalBoxMiddleware(customConfig?: any) {
  const env = process.env.NODE_ENV || 'development';
  
  let baseConfig;
  switch (env) {
    case 'production':
      baseConfig = CRYSTALBOX_PROD_CONFIG;
      break;
    case 'test':
      baseConfig = AON_MINIMAL_CONFIG;
      break;
    default:
      baseConfig = CRYSTALBOX_DEV_CONFIG;
  }

  // Importa dinamicamente para evitar problemas de dependência circular
  return import('./crystal-middleware.js').then(module => 
    module.crystalBoxMiddleware({ ...baseConfig, ...customConfig })
  );
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
export const CRYSTALBOX_VERSION = '1.0.0';

export const AON_MIME_TYPES = {
  NDJSON: 'application/x-ndjson',
  JSON: 'application/json'
} as const;

export const AON_HEADERS = {
  SUMMARY: 'X-AON-Summary',
  MODE: 'X-AON-Mode',
  REQUEST_ID: 'X-AON-Request-ID',
  // CrystalBox headers
  CRYSTAL_MODE: 'X-Crystal-Mode',
  USER_THEME: 'X-User-Theme',
  OFFLINE_CAPABLE: 'X-Offline-Capable',
  DEV_NOTIFIED: 'X-Dev-Notified',
  HEALING_ATTEMPT: 'X-Healing-Attempt',
  PROCESSING_STATUS: 'X-Processing-Status',
  EARLY_HINTS: 'X-Early-Hints'
} as const;

export const CRYSTALBOX_MODES = {
  INTERACTIVE: 'interactive',
  STANDARD: 'standard'
} as const;

export const STATUS_CODES = {
  PROCESSING: 102,
  EARLY_HINTS: 103
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
console.log(`🔮 CrystalBox Mode v${CRYSTALBOX_VERSION} disponível`);
console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
console.log(`📡 Modos: Black Box | Glass Box | CrystalBox`);