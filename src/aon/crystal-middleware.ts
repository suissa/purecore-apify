/**
 * CrystalBox Middleware - Middleware para modo de observabilidade interativa
 */

import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction, RequestHandler } from '../types.js';
import { AONRequest, AONResponse, AONConfig } from './types.js';
import { createCrystalBoxWriter, CrystalBoxOptions } from './crystal-box.js';
import { createInteractiveHealer, InteractiveHealerConfig } from './interactive-healer.js';

// =========================================
// TIPOS ESPECÍFICOS DO CRYSTAL MIDDLEWARE
// =========================================

export interface CrystalBoxRequest extends AONRequest {
  crystalWriter?: import('./crystal-box.js').CrystalBoxWriter;
  interactiveHealer?: import('./interactive-healer.js').InteractiveHealer;
  crystalMode?: 'interactive' | 'standard';
  userTheme?: string;
  offlineCapable?: boolean;
}

export interface CrystalBoxMiddlewareConfig extends AONConfig {
  crystalBox?: CrystalBoxOptions & InteractiveHealerConfig;
  themeDetection?: {
    enabled: boolean;
    defaultTheme: string;
    supportedThemes: string[];
  };
  offlineSupport?: {
    enabled: boolean;
    components: string[];
    cacheStrategy: 'aggressive' | 'conservative';
  };
}

// =========================================
// MIDDLEWARE PRINCIPAL
// =========================================

export function crystalBoxMiddleware(config: CrystalBoxMiddlewareConfig = {}): RequestHandler {
  const finalConfig: CrystalBoxMiddlewareConfig = {
    enabled: true,
    productionDetailLevel: 'standard',
    healingTimeout: 30000,
    maxTelemetryEvents: 1000,
    debug: process.env.NODE_ENV === 'development',
    crystalBox: {
      maxHealingAttempts: 1000,
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
      },
      ...config.crystalBox
    },
    themeDetection: {
      enabled: true,
      defaultTheme: 'light',
      supportedThemes: ['light', 'dark', 'auto'],
      ...config.themeDetection
    },
    offlineSupport: {
      enabled: true,
      components: ['forms', 'cache', 'sync', 'storage'],
      cacheStrategy: 'conservative',
      ...config.offlineSupport
    },
    ...config
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!finalConfig.enabled) {
      return next();
    }

    const crystalReq = req as CrystalBoxRequest;
    const crystalRes = res as AONResponse;

    try {
      // 1. DETECÇÃO DO MODO CRYSTAL
      const acceptHeader = req.headers.accept || '';
      const crystalModeHeader = req.headers['x-crystal-mode'];
      const isInteractiveMode = crystalModeHeader === 'interactive';
      const isGlassBoxMode = acceptHeader.includes('application/x-ndjson');

      if (!isGlassBoxMode) {
        // Modo Black Box - passa adiante
        return next();
      }

      // 2. CONFIGURAÇÃO DO MODO CRYSTAL
      crystalReq.crystalMode = isInteractiveMode ? 'interactive' : 'standard';

      // 3. DETECÇÃO DE TEMA DO USUÁRIO
      if (finalConfig.themeDetection?.enabled) {
        crystalReq.userTheme = await detectUserTheme(crystalReq, finalConfig.themeDetection);
      }

      // 4. VERIFICAÇÃO DE CAPACIDADE OFFLINE
      if (finalConfig.offlineSupport?.enabled) {
        crystalReq.offlineCapable = await checkOfflineCapability(crystalReq);
      }

      // 5. CRIAÇÃO DO CRYSTAL WRITER
      const crystalWriter = createCrystalBoxWriter(crystalRes, {
        ...finalConfig.crystalBox,
        interactiveMode: isInteractiveMode
      });

      crystalReq.crystalWriter = crystalWriter;
      crystalReq.aonWriter = crystalWriter; // Compatibilidade com AON

      // 6. ENVIO DE EARLY HINTS (103)
      if (crystalReq.userTheme || crystalReq.offlineCapable) {
        crystalWriter.writeEarlyHints({
          theme: crystalReq.userTheme,
          offlineComponents: crystalReq.offlineCapable ? finalConfig.offlineSupport?.components : undefined
        });
      }

      // 7. CRIAÇÃO DO INTERACTIVE HEALER (se modo interativo)
      if (isInteractiveMode) {
        const interactiveHealer = createInteractiveHealer(crystalWriter, finalConfig.crystalBox);
        crystalReq.interactiveHealer = interactiveHealer;
        crystalReq.aonHealer = interactiveHealer; // Compatibilidade com AON
      }

      // 8. CONFIGURAÇÃO DE RESPOSTA
      crystalRes.isAONStreaming = true;

      // 9. INTERCEPTAÇÃO DE RESPOSTA
      interceptCrystalResponse(crystalReq, crystalRes);

      // 10. LOG DE DEBUG
      if (finalConfig.debug) {
        console.log(`🔮 [CrystalBox] Request ${crystalWriter.getRequestId()} initialized`);
        console.log(`   Mode: ${crystalReq.crystalMode}`);
        console.log(`   Theme: ${crystalReq.userTheme || 'default'}`);
        console.log(`   Offline: ${crystalReq.offlineCapable ? 'enabled' : 'disabled'}`);
      }

      next();

    } catch (error) {
      console.error('[CrystalBox] Erro na inicialização:', error);
      // Em caso de erro, continua sem CrystalBox
      next();
    }
  };
}

// =========================================
// FUNÇÕES AUXILIARES
// =========================================

async function detectUserTheme(req: CrystalBoxRequest, config: NonNullable<CrystalBoxMiddlewareConfig['themeDetection']>): Promise<string> {
  try {
    // 1. Verifica header explícito
    const themeHeader = req.headers['x-user-theme'] as string;
    if (themeHeader && config.supportedThemes.includes(themeHeader)) {
      return themeHeader;
    }

    // 2. Verifica preferência do usuário (se autenticado)
    const user = (req as any).user;
    if (user?.preferences?.theme && config.supportedThemes.includes(user.preferences.theme)) {
      return user.preferences.theme;
    }

    // 3. Verifica cookie de tema
    const cookies = parseCookies(req.headers.cookie || '');
    if (cookies.theme && config.supportedThemes.includes(cookies.theme)) {
      return cookies.theme;
    }

    // 4. Detecta baseado no User-Agent (heurística)
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('Dark') || userAgent.includes('dark')) {
      return 'dark';
    }

    // 5. Verifica horário (auto theme)
    const hour = new Date().getHours();
    if (config.supportedThemes.includes('auto')) {
      return (hour >= 18 || hour <= 6) ? 'dark' : 'light';
    }

    return config.defaultTheme;

  } catch (error) {
    console.warn('[CrystalBox] Erro na detecção de tema:', error);
    return config.defaultTheme;
  }
}

async function checkOfflineCapability(req: CrystalBoxRequest): Promise<boolean> {
  try {
    // 1. Verifica header de capacidade offline
    const offlineHeader = req.headers['x-offline-capable'];
    if (offlineHeader === 'true') {
      return true;
    }

    // 2. Verifica se é um PWA
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('PWA') || userAgent.includes('ServiceWorker')) {
      return true;
    }

    // 3. Verifica se suporta Service Workers (heurística básica)
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('application/manifest+json')) {
      return true;
    }

    // 4. Verifica preferência do usuário
    const user = (req as any).user;
    if (user?.preferences?.offlineMode === true) {
      return true;
    }

    return false;

  } catch (error) {
    console.warn('[CrystalBox] Erro na verificação offline:', error);
    return false;
  }
}

function interceptCrystalResponse(req: CrystalBoxRequest, res: AONResponse): void {
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;

  // Intercepta res.json()
  res.json = function(data: any) {
    finalizeCrystalResponse(req, res, data);
    return this;
  };

  // Intercepta res.send()
  res.send = function(data: any) {
    if (typeof data === 'object') {
      finalizeCrystalResponse(req, res, data);
    }
    return this;
  };

  // Intercepta res.end() como fallback
  res.end = function(chunk?: any, encoding?: any) {
    if (!res.headersSent && req.crystalWriter) {
      finalizeCrystalResponse(req, res, chunk);
    }
    return originalEnd.call(this, chunk, encoding);
  };
}

function finalizeCrystalResponse(req: CrystalBoxRequest, res: AONResponse, data?: any): void {
  try {
    if (req.crystalWriter && req.crystalWriter.isActive()) {
      // Adiciona estatísticas de healing se disponível
      if (req.interactiveHealer) {
        const healingStats = req.interactiveHealer.getHealingStats();
        const finalData = {
          ...data,
          crystalBox: {
            mode: req.crystalMode,
            theme: req.userTheme,
            offlineCapable: req.offlineCapable,
            healingStats
          }
        };
        
        req.crystalWriter.end(finalData);
      } else {
        req.crystalWriter.end(data);
      }
    }

  } catch (error) {
    console.error('[CrystalBox] Erro na finalização:', error);
    if (req.crystalWriter) {
      req.crystalWriter.error('Error finalizing CrystalBox response', 'FINALIZATION_ERROR');
    }
  }
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

// =========================================
// HELPERS PARA ROTAS
// =========================================

/**
 * Helper para rotas que querem usar CrystalBox explicitamente
 */
export function withCrystalBox(handler: (req: CrystalBoxRequest, res: AONResponse) => Promise<any>): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const crystalReq = req as CrystalBoxRequest;
    const crystalRes = res as AONResponse;

    try {
      // Se não tem contexto CrystalBox, cria um básico
      if (!crystalReq.crystalWriter) {
        console.warn('[CrystalBox] Handler usado sem middleware CrystalBox. Criando contexto básico.');
        
        // Fallback para modo padrão
        return next();
      }

      const result = await handler(crystalReq, crystalRes);
      
      // Se o handler retornou algo e não enviou resposta ainda
      if (result !== undefined && !res.headersSent) {
        crystalRes.json(result);
      }

    } catch (error) {
      next(error);
    }
  };
}

/**
 * Helper para enviar Early Hints manualmente
 */
export function sendEarlyHints(req: CrystalBoxRequest, hints: {
  theme?: string;
  preloadLinks?: string[];
  offlineComponents?: string[];
}): void {
  if (req.crystalWriter) {
    req.crystalWriter.writeEarlyHints(hints);
  }
}

/**
 * Helper para solicitar healing interativo
 */
export async function requestInteractiveHealing(
  req: CrystalBoxRequest, 
  action: string, 
  description: string, 
  metadata?: Record<string, any>
): Promise<boolean> {
  if (req.interactiveHealer) {
    return await req.interactiveHealer.heal(action, description, metadata);
  }
  return false;
}

/**
 * Helper para verificar se está em modo CrystalBox
 */
export function isCrystalBoxMode(req: Request): req is CrystalBoxRequest {
  return 'crystalWriter' in req && req.crystalWriter !== undefined;
}

/**
 * Helper para verificar se está em modo interativo
 */
export function isInteractiveMode(req: Request): boolean {
  return isCrystalBoxMode(req) && req.crystalMode === 'interactive';
}