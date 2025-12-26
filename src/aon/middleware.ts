/**
 * Middleware AON (Adaptive Observability Negotiation)
 * Implementa negociação de observabilidade conforme especificação AONP
 */

import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction, RequestHandler } from '../types.js';
import { 
  AONConfig, 
  AONContext, 
  AONRequest, 
  AONResponse, 
  AONEvent,
  createAONEvent
} from './types.js';
import { createAONStreamWriter } from './stream-writer.js';
import { createAONHealer } from './healer.js';

// =========================================
// CONFIGURAÇÃO PADRÃO
// =========================================

const DEFAULT_AON_CONFIG: AONConfig = {
  enabled: true,
  productionDetailLevel: 'standard',
  healingTimeout: 10000,
  maxTelemetryEvents: 1000,
  debug: process.env.NODE_ENV === 'development'
};

// =========================================
// MIDDLEWARE PRINCIPAL
// =========================================

/**
 * Middleware AON - Deve ser registrado ANTES das rotas
 */
export function aonMiddleware(config: Partial<AONConfig> = {}): RequestHandler {
  const finalConfig = { ...DEFAULT_AON_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    // Verifica se AON está habilitado
    if (!finalConfig.enabled) {
      return next();
    }

    const aonReq = req as AONRequest;
    const aonRes = res as AONResponse;

    try {
      // 1. NEGOCIAÇÃO DE CONTEÚDO (Content Negotiation)
      const acceptHeader = req.headers.accept || '';
      const isAgentMode = acceptHeader.includes('application/x-ndjson');

      // 2. INICIALIZAÇÃO DO CONTEXTO AON
      const context: AONContext = {
        requestId: generateRequestId(),
        startTime: Date.now(),
        mode: isAgentMode ? 'glassbox' : 'blackbox',
        events: [],
        config: finalConfig,
        metadata: {
          userAgent: req.headers['user-agent'],
          method: req.method,
          url: req.url,
          ip: getClientIP(req)
        }
      };

      aonReq.aon = context;

      // 3. CONFIGURAÇÃO BASEADA NO MODO
      if (isAgentMode) {
        // MODO GLASS BOX (Agent Mode)
        setupGlassBoxMode(aonReq, aonRes, context);
      } else {
        // MODO BLACK BOX (Standard Mode)
        setupBlackBoxMode(aonReq, aonRes, context);
      }

      // 4. LOGGING INICIAL
      if (finalConfig.debug) {
        console.log(`[AON] Requisição ${context.requestId} iniciada em modo ${context.mode}`);
      }

      // 5. INTERCEPTA RESPOSTA PARA FINALIZAÇÃO
      interceptResponse(aonReq, aonRes, context);

      // 6. CONTINUA PARA PRÓXIMO MIDDLEWARE/ROTA
      next();

    } catch (error) {
      console.error('[AON] Erro na inicialização:', error);
      
      // Em caso de erro, continua sem AON
      next();
    }
  };
}

// =========================================
// CONFIGURAÇÃO DE MODOS
// =========================================

function setupGlassBoxMode(req: AONRequest, res: AONResponse, context: AONContext): void {
  // Cria stream writer para NDJSON
  const writer = createAONStreamWriter(res as any, context.config.maxTelemetryEvents);
  req.aonWriter = writer;
  
  // Cria healer para auto-cura
  const healer = createAONHealer(writer, {
    maxRetries: 3,
    timeout: context.config.healingTimeout,
    debug: context.config.debug
  });
  req.aonHealer = healer;
  
  // Marca resposta como streaming
  res.isAONStreaming = true;
  
  // Envia evento inicial
  writer.status('AON Glass Box mode initialized - streaming telemetry active');
}

function setupBlackBoxMode(req: AONRequest, res: AONResponse, context: AONContext): void {
  // Buffer para eventos (serão enviados no final ou em header)
  res.aonEventBuffer = [];
  
  // Cria writer mock que armazena eventos no buffer
  req.aonWriter = createBufferedWriter(res.aonEventBuffer);
  
  // Cria healer que funciona silenciosamente
  if (req.aonWriter) {
    req.aonHealer = createAONHealer(req.aonWriter, {
      maxRetries: 3,
      timeout: context.config.healingTimeout,
      debug: false // Sempre silencioso em blackbox
    });
  }
  
  // Marca resposta como não-streaming
  res.isAONStreaming = false;
}

// =========================================
// INTERCEPTAÇÃO DE RESPOSTA
// =========================================

function interceptResponse(req: AONRequest, res: AONResponse, context: AONContext): void {
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;

  // Intercepta res.json()
  res.json = function(data: any) {
    finalizeAONResponse(req, res, context, data);
    return originalJson.call(this, data);
  };

  // Intercepta res.send()
  res.send = function(data: any) {
    if (typeof data === 'object') {
      finalizeAONResponse(req, res, context, data);
    }
    return originalSend.call(this, data);
  };

  // Intercepta res.end() como fallback
  const originalResEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    if (!res.headersSent && !res.isAONStreaming) {
      finalizeAONResponse(req, res, context, chunk);
    }
    return originalResEnd.call(this, chunk, encoding);
  };
}

function finalizeAONResponse(req: AONRequest, res: AONResponse, context: AONContext, data?: any): void {
  try {
    const duration = Date.now() - context.startTime;
    
    if (res.isAONStreaming && req.aonWriter) {
      // MODO GLASS BOX - Finaliza stream
      req.aonWriter.end(data);
      
    } else if (res.aonEventBuffer) {
      // MODO BLACK BOX - Adiciona eventos em header (se configurado)
      if (context.config.debug && res.aonEventBuffer.length > 0) {
        const summary = {
          totalEvents: res.aonEventBuffer.length,
          duration,
          healingAttempts: req.aonHealer?.getHealingStats().totalAttempts || 0
        };
        
        res.setHeader('X-AON-Summary', JSON.stringify(summary));
      }
    }

    if (context.config.debug) {
      console.log(`[AON] Requisição ${context.requestId} finalizada em ${duration}ms`);
    }

  } catch (error) {
    console.error('[AON] Erro na finalização:', error);
  }
}

// =========================================
// UTILITÁRIOS
// =========================================

function generateRequestId(): string {
  return `aon_${Date.now()}_${randomUUID().split('-')[0]}`;
}

function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

function createBufferedWriter(buffer: AONEvent[]): import('./types.js').AONStreamWriter {
  return {
    writeEvent: (event: AONEvent) => buffer.push(event),
    end: () => {},
    error: () => {},
    isActive: () => true,
    status: (message: string, estimatedDelayMs?: number) => {
      buffer.push(createAONEvent('status', { message, ...(estimatedDelayMs && { estimated_delay_ms: estimatedDelayMs }) }));
    },
    healing: (action: string, description: string, severity: any = 'medium', metadata?: any) => {
      buffer.push(createAONEvent('healing', { action, description, severity, metadata }));
    },
    intentAnalysis: (originalIntent: string, detectedIssue: string, decision: string) => {
      buffer.push(createAONEvent('intent_analysis', { 
        original_intent: originalIntent, 
        detected_issue: detectedIssue, 
        decision 
      }));
    }
  };
}

// =========================================
// HELPERS PARA ROTAS
// =========================================

/**
 * Helper para rotas que querem usar AON explicitamente
 */
export function withAON(handler: (req: AONRequest, res: AONResponse) => Promise<any>): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const aonReq = req as AONRequest;
    const aonRes = res as AONResponse;

    try {
      // Se não tem contexto AON, cria um básico
      if (!aonReq.aon) {
        console.warn('[AON] Handler AON usado sem middleware AON. Criando contexto básico.');
        
        const context: AONContext = {
          requestId: generateRequestId(),
          startTime: Date.now(),
          mode: 'blackbox',
          events: [],
          config: DEFAULT_AON_CONFIG,
          metadata: {}
        };
        
        aonReq.aon = context;
        setupBlackBoxMode(aonReq, aonRes, context);
      }

      const result = await handler(aonReq, aonRes);
      
      // Se o handler retornou algo e não enviou resposta ainda
      if (result !== undefined && !res.headersSent) {
        res.json(result);
      }

    } catch (error) {
      next(error);
    }
  };
}

/**
 * Helper para análise de intenção
 */
export function analyzeIntent(req: AONRequest, originalIntent: string, detectedIssue: string, decision: string): void {
  if (req.aonWriter) {
    req.aonWriter.intentAnalysis(originalIntent, detectedIssue, decision);
  }
}

/**
 * Helper para healing
 */
export async function performHealing(req: AONRequest, action: string, description: string, metadata?: Record<string, any>): Promise<boolean> {
  if (req.aonHealer) {
    return await req.aonHealer.heal(action, description, metadata);
  }
  return false;
}

/**
 * Helper para status
 */
export function reportStatus(req: AONRequest, message: string, estimatedDelayMs?: number): void {
  if (req.aonWriter) {
    req.aonWriter.status(message, estimatedDelayMs);
  }
}