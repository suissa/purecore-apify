import type { Request, Response } from './types.js';
import { HttpError } from './errors.js';
import { reqify, asUrl, asMethod, type ReqifyRequestConfig } from '@purecore/reqify';

/**
 * Interface para configuração de fallbacks resilientes
 */
export interface ResilientConfig {
  /** Configuração para erros 404 */
  notFound?: {
    /** Tenta encontrar rotas similares via LLM */
    autoFixRoutes?: boolean;
    /** URL da API externa para fallback */
    fallbackApi?: string;
    /** Headers para a API de fallback */
    fallbackHeaders?: Record<string, string>;
  };

  /** Configuração para erros 500 */
  internalServerError?: {
    /** Tempo de retry em segundos */
    retryAfter?: number;
    /** Envia erro para HealerAgent */
    healerAgent?: boolean;
    /** Configurações do HealerAgent */
    healerConfig?: HealerConfig;
  };

  /** Configuração geral */
  general?: {
    /** Ambiente (development/production) */
    environment?: 'development' | 'production';
    /** Timeout para operações de fallback */
    timeout?: number;
  };
}

/**
 * Configuração do HealerAgent
 */
export interface HealerConfig {
  /** URL da API do LLM para análise de erros */
  llmApiUrl?: string;
  /** Chave da API do LLM */
  llmApiKey?: string;
  /** Modelo do LLM */
  llmModel?: string;
  /** URL para salvar mapeamentos aprendidos */
  storageUrl?: string;
}

/**
 * Interface para uma rota mapeada dinamicamente
 */
export interface RouteMapping {
  originalPath: string;
  correctedPath: string;
  method: string;
  confidence: number;
  createdAt: Date;
  usageCount: number;
}

/**
 * HealerAgent - Sistema de auto-correção inteligente
 */
export class HealerAgent {
  private config: HealerConfig;
  private routeMappings: Map<string, RouteMapping> = new Map();

  constructor(config: HealerConfig = {}) {
    this.config = {
      llmApiUrl: 'https://api.openai.com/v1/chat/completions',
      llmModel: 'gpt-4',
      ...config
    };
  }

  /**
   * Analisa um erro 404 e tenta encontrar uma rota similar
   */
  async findSimilarRoute(errorPath: string, method: string, availableRoutes: string[]): Promise<RouteMapping | null> {
    try {
      // Primeiro, tenta encontrar no cache de mapeamentos
      const cacheKey = `${method}:${errorPath}`;
      if (this.routeMappings.has(cacheKey)) {
        const mapping = this.routeMappings.get(cacheKey)!;
        mapping.usageCount++;
        return mapping;
      }

      // Se não tem LLM configurado, faz busca simples
      if (!this.config.llmApiKey) {
        return this.simpleRouteMatching(errorPath, method, availableRoutes);
      }

      // Usa LLM para encontrar rota similar
      const similarRoute = await this.llmRouteMatching(errorPath, method, availableRoutes);
      if (similarRoute) {
        const mapping: RouteMapping = {
          originalPath: errorPath,
          correctedPath: similarRoute.path,
          method,
          confidence: similarRoute.confidence,
          createdAt: new Date(),
          usageCount: 1
        };

        // Salva no cache
        this.routeMappings.set(cacheKey, mapping);

        // Salva persistentemente se configurado
        if (this.config.storageUrl) {
          await this.saveMapping(mapping);
        }

        return mapping;
      }

      return null;
    } catch (error) {
      console.warn('Erro no HealerAgent:', error);
      return null;
    }
  }

  /**
   * Busca simples de rotas similares (fallback quando não tem LLM)
   */
  private simpleRouteMatching(errorPath: string, method: string, availableRoutes: string[]): RouteMapping | null {
    // Remove parâmetros da URL para comparação
    const cleanErrorPath = errorPath.split('?')[0].split('/').filter(Boolean);
    let bestMatch: { path: string; score: number } | null = null;

    for (const route of availableRoutes) {
      const cleanRoute = route.split('/').filter(Boolean);
      let score = 0;
      let matches = 0;

      // Compara segmento por segmento
      for (let i = 0; i < Math.min(cleanErrorPath.length, cleanRoute.length); i++) {
        if (cleanErrorPath[i] === cleanRoute[i]) {
          matches++;
          score += 1;
        } else if (cleanRoute[i].startsWith(':')) {
          // Parâmetro dinâmico vale pontos
          score += 0.8;
        }
      }

      // Bônus por comprimento similar
      if (cleanErrorPath.length === cleanRoute.length) {
        score += 0.5;
      }

      if (bestMatch === null || score > bestMatch.score) {
        bestMatch = { path: route, score };
      }
    }

    if (bestMatch && bestMatch.score > 1) { // Threshold mínimo
      return {
        originalPath: errorPath,
        correctedPath: bestMatch.path,
        method,
        confidence: Math.min(bestMatch.score / cleanErrorPath.length, 1),
        createdAt: new Date(),
        usageCount: 1
      };
    }

    return null;
  }

  /**
   * Usa LLM para encontrar rota similar
   */
  private async llmRouteMatching(errorPath: string, method: string, availableRoutes: string[]): Promise<{ path: string; confidence: number } | null> {
    try {
      const prompt = `
Você é um especialista em APIs REST. Uma requisição chegou para uma rota que não existe:

Rota solicitada: ${method} ${errorPath}
Rotas disponíveis: ${availableRoutes.join(', ')}

Sua tarefa é:
1. Analisar se existe alguma rota similar ou que poderia atender esta requisição
2. Considerar variações comuns como:
   - Plural/singular (users/user)
   - Verbos alternativos (create/add, update/modify)
   - Ordem de parâmetros
   - IDs vs slugs

3. Retornar apenas a rota mais provável no formato: "ROTA|CONFIANÇA"
   Onde CONFIANÇA é um número de 0.0 a 1.0

Se não encontrar nenhuma rota adequada, retorne apenas "null"

Exemplos:
- Se a rota solicitada for GET /user/123 e existe GET /users/:id, retorne: "/users/:id|0.9"
- Se for POST /create-user e existe POST /users, retorne: "/users|0.8"
- Se não houver similar, retorne: "null"
`;

      const response = await reqify.post(this.config.llmApiUrl!, {
        model: this.config.llmModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.llmApiKey}`
        }
      });

      if (response.status >= 400) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const result = response.data.choices[0]?.message?.content?.trim();

      if (!result || result === 'null') {
        return null;
      }

      const [path, confidenceStr] = result.split('|');
      const confidence = parseFloat(confidenceStr);

      if (path && confidence > 0.5) { // Threshold de confiança
        return { path: path.trim(), confidence };
      }

      return null;
    } catch (error) {
      console.warn('Erro na análise LLM:', error);
      return null;
    }
  }

  /**
   * Salva mapeamento persistentemente
   */
  private async saveMapping(mapping: RouteMapping): Promise<void> {
    if (!this.config.storageUrl) return;

    try {
      await reqify.post(asUrl(this.config.storageUrl), mapping);
    } catch (error) {
      console.warn('Erro ao salvar mapeamento:', error);
    }
  }

  /**
   * Analisa erro 500 e tenta propor solução
   */
  async analyzeError(error: Error, req: Request): Promise<string> {
    // Análise simples do erro para sugerir soluções
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return 'Problema de conectividade. Verifique se o serviço está disponível.';
    }

    if (errorMessage.includes('database') || errorMessage.includes('mongo')) {
      return 'Erro de banco de dados. Verifique a conexão e tente novamente em 5 minutos.';
    }

    if (errorMessage.includes('validation')) {
      return 'Erro de validação nos dados enviados.';
    }

    return 'Erro interno do servidor. Nossa equipe foi notificada e está trabalhando na solução.';
  }

  /**
   * Carrega mapeamentos salvos anteriormente
   */
  async loadMappings(): Promise<void> {
    if (!this.config.storageUrl) return;

    try {
      const response = await reqify.get(asUrl(`${this.config.storageUrl}?type=route-mappings`));
      if (response.status < 400) {
        const mappings: RouteMapping[] = response.data;
        for (const mapping of mappings) {
          const key = `${mapping.method}:${mapping.originalPath}`;
          this.routeMappings.set(key, mapping);
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar mapeamentos:', error);
    }
  }

  /**
   * Retorna estatísticas do sistema de auto-correção
   */
  getStats(): { mappingsCount: number; totalUsage: number } {
    const totalUsage = Array.from(this.routeMappings.values())
      .reduce((sum, mapping) => sum + mapping.usageCount, 0);

    return {
      mappingsCount: this.routeMappings.size,
      totalUsage
    };
  }
}

/**
 * Sistema de Fallback Resiliente
 */
export class ResilientFallback {
  private config: ResilientConfig;
  private healerAgent: HealerAgent;
  private availableRoutes: string[] = [];

  constructor(config: ResilientConfig = {}) {
    this.config = {
      notFound: {
        autoFixRoutes: true,
        ...config.notFound
      },
      internalServerError: {
        retryAfter: 300, // 5 minutos
        healerAgent: true,
        ...config.internalServerError
      },
      general: {
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        timeout: 5000,
        ...config.general
      }
    };

    this.healerAgent = new HealerAgent(config.internalServerError?.healerConfig);

    // Carrega mapeamentos existentes
    this.healerAgent.loadMappings().catch(console.warn);
  }

  /**
   * Registra rotas disponíveis para análise
   */
  setAvailableRoutes(routes: string[]): void {
    this.availableRoutes = routes;
  }

  /**
   * Processa erro 404 com fallback
   */
  async handle404Fallback(err: HttpError, req: Request, res: Response): Promise<boolean> {
    if (err.statusCode !== 404 || !this.config.notFound?.autoFixRoutes) {
      return false;
    }

    const originalUrl = (req as any).originalUrl || req.url || '/';
    const method = req.method || 'GET';

    // Tenta encontrar rota similar
    const mapping = await this.healerAgent.findSimilarRoute(originalUrl, method, this.availableRoutes);

    if (mapping && mapping.confidence > 0.7) { // Alta confiança
      // Redireciona internamente para a rota correta
      (req as any).originalUrl = mapping.correctedPath;
      (req as any).url = mapping.correctedPath;

      // Adiciona header informativo
      res.setHeader('X-Auto-Corrected', 'true');
      res.setHeader('X-Original-Path', originalUrl);
      res.setHeader('X-Corrected-Path', mapping.correctedPath);
      res.setHeader('X-Correction-Confidence', mapping.confidence.toString());

      return true; // Indica que foi corrigido
    }

    // Tenta API externa se configurada
    if (this.config.notFound?.fallbackApi) {
      try {
        const fallbackResponse = await this.tryExternalFallback(req);
        if (fallbackResponse) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('X-Fallback-Source', this.config.notFound.fallbackApi);
          res.end(JSON.stringify(fallbackResponse));
          return true;
        }
      } catch (error) {
        console.warn('Erro no fallback externo:', error);
      }
    }

    return false; // Não conseguiu corrigir
  }

  /**
   * Processa erro 500 com retry e análise
   */
  async handle500Fallback(err: HttpError, req: Request, res: Response): Promise<boolean> {
    if (err.statusCode !== 500 || !this.config.internalServerError?.healerAgent) {
      return false;
    }

    // Análise do erro
    const analysis = await this.healerAgent.analyzeError(err, req);

    // Define header de retry
    const retryAfter = this.config.internalServerError.retryAfter || 300;
    res.setHeader('Retry-After', retryAfter.toString());

    // Modifica a resposta com análise e instruções
    const customResponse = {
      error: {
        message: analysis,
        statusCode: 503, // Service Unavailable (mais apropriado para retry)
        type: 'ServiceUnavailableError',
        timestamp: new Date().toISOString(),
        retryAfter,
        suggestion: `Tente novamente em ${Math.ceil(retryAfter / 60)} minutos.`
      }
    };

    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Healer-Analysis', 'true');

    res.end(JSON.stringify(customResponse, null,
      this.config.general?.environment === 'development' ? 2 : 0));

    return true;
  }

  /**
   * Tenta fazer fallback para API externa
   */
  private async tryExternalFallback(req: Request): Promise<any> {
    if (!this.config.notFound?.fallbackApi) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(),
      this.config.general?.timeout || 5000);

    try {
      const config: ReqifyRequestConfig = {
        url: asUrl(this.config.notFound.fallbackApi + req.url),
        method: asMethod(req.method || 'GET'),
        headers: this.config.notFound.fallbackHeaders
      };

      // Adiciona body se não for GET
      if (req.method !== 'GET' && req.body) {
        config.data = req.body;
      }

      const response = await reqify(config);

      if (response.status < 400) {
        return response.data;
      }
    } catch (error) {
      // Ignora erros de fallback
    } finally {
      clearTimeout(timeoutId);
    }

    return null;
  }

  /**
   * Retorna estatísticas do sistema resiliente
   */
  getStats() {
    return {
      healerAgent: this.healerAgent.getStats(),
      config: this.config,
      availableRoutesCount: this.availableRoutes.length
    };
  }
}

// Instância global (singleton)
let resilientFallbackInstance: ResilientFallback | null = null;

/**
 * Função helper para obter instância do sistema resiliente
 */
export function getResilientFallback(config?: ResilientConfig): ResilientFallback {
  if (!resilientFallbackInstance) {
    resilientFallbackInstance = new ResilientFallback(config);
  }
  return resilientFallbackInstance;
}

export default ResilientFallback;
