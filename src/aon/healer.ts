/**
 * Sistema de Healing (Auto-cura) para AON
 * Implementa heurísticas de recuperação automática conforme especificação AONP
 */

import { AONHealer, AONSeverity, AONStreamWriter } from './types.js';

export interface HealingAction {
  name: string;
  description: string;
  handler: (metadata?: Record<string, any>) => Promise<boolean>;
  maxRetries?: number;
  timeout?: number;
}

export interface HealingStats {
  totalAttempts: number;
  successfulHealing: number;
  failedHealing: number;
  actionStats: Record<string, {
    attempts: number;
    successes: number;
    failures: number;
    lastAttempt: number;
  }>;
}

export class AONHealerImpl implements AONHealer {
  private writer: AONStreamWriter;
  private actions: Map<string, HealingAction> = new Map();
  private stats: HealingStats;
  private config: {
    maxRetries: number;
    timeout: number;
    debug: boolean;
  };

  constructor(writer: AONStreamWriter, config?: Partial<AONHealerImpl['config']>) {
    this.writer = writer;
    this.config = {
      maxRetries: 3,
      timeout: 5000,
      debug: false,
      ...config
    };
    
    this.stats = {
      totalAttempts: 0,
      successfulHealing: 0,
      failedHealing: 0,
      actionStats: {}
    };

    // Registra ações de healing padrão
    this.registerDefaultActions();
  }

  private registerDefaultActions(): void {
    // Ação: Refresh Token
    this.registerAction({
      name: 'refresh_token',
      description: 'Renova token de autenticação expirado',
      handler: async (metadata) => {
        await this.simulateDelay(1000);
        
        // Simula renovação de token
        const success = Math.random() > 0.2; // 80% de sucesso
        
        if (success && metadata?.provider) {
          this.writer.status(`Token renovado com sucesso via ${metadata.provider}`);
        }
        
        return success;
      },
      maxRetries: 2,
      timeout: 3000
    });

    // Ação: Retry with Backoff
    this.registerAction({
      name: 'retry_with_backoff',
      description: 'Reexecuta operação com backoff exponencial',
      handler: async (metadata) => {
        const attempt = metadata?.attempt || 1;
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        
        this.writer.status(`Aguardando ${delay}ms antes de retry (tentativa ${attempt})`);
        await this.simulateDelay(delay);
        
        // Simula sucesso crescente com tentativas
        const successRate = Math.min(0.3 + (attempt * 0.2), 0.9);
        return Math.random() < successRate;
      },
      maxRetries: 4,
      timeout: 10000
    });

    // Ação: Schema Validation Fix
    this.registerAction({
      name: 'fix_schema_validation',
      description: 'Aplica correções automáticas em dados de entrada',
      handler: async (metadata) => {
        await this.simulateDelay(500);
        
        // Simula correção de schema
        const fixableIssues = ['missing_field', 'wrong_type', 'invalid_format'];
        const issue = metadata?.issue;
        
        if (fixableIssues.includes(issue)) {
          this.writer.status(`Schema corrigido: ${issue} → aplicando transformação automática`);
          return true;
        }
        
        return false;
      },
      maxRetries: 1,
      timeout: 2000
    });

    // Ação: Database Connection Recovery
    this.registerAction({
      name: 'recover_db_connection',
      description: 'Reestabelece conexão com banco de dados',
      handler: async (metadata) => {
        const connectionType = metadata?.type || 'primary';
        
        this.writer.status(`Reestabelecendo conexão ${connectionType}...`);
        await this.simulateDelay(2000);
        
        // Simula recuperação de conexão
        const success = Math.random() > 0.3; // 70% de sucesso
        
        if (success) {
          this.writer.status(`Conexão ${connectionType} reestabelecida com sucesso`);
        }
        
        return success;
      },
      maxRetries: 3,
      timeout: 8000
    });

    // Ação: Rate Limit Handling
    this.registerAction({
      name: 'handle_rate_limit',
      description: 'Gerencia limite de taxa de API externa',
      handler: async (metadata) => {
        const retryAfter = metadata?.retryAfter || 1000;
        const service = metadata?.service || 'external_api';
        
        this.writer.status(`Rate limit atingido em ${service}. Aguardando ${retryAfter}ms...`);
        await this.simulateDelay(retryAfter);
        
        return true; // Rate limit sempre pode ser "curado" esperando
      },
      maxRetries: 1,
      timeout: 30000
    });
  }

  registerAction(action: HealingAction): void {
    this.actions.set(action.name, action);
    
    if (this.config.debug) {
      console.log(`[AON Healer] Ação registrada: ${action.name}`);
    }
  }

  async heal(actionName: string, description: string, metadata?: Record<string, any>): Promise<boolean> {
    const action = this.actions.get(actionName);
    
    if (!action) {
      this.writer.healing(
        actionName,
        `Ação de healing não encontrada: ${actionName}`,
        'critical'
      );
      return false;
    }

    // Atualiza estatísticas
    this.updateStats(actionName, 'attempt');
    
    const severity = this.determineSeverity(actionName, metadata);
    
    // Envia evento de healing
    this.writer.healing(
      actionName,
      description || action.description,
      severity,
      metadata
    );

    try {
      // Executa healing com timeout
      const maxRetries = action.maxRetries || this.config.maxRetries;
      const timeout = action.timeout || this.config.timeout;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const healingPromise = action.handler({ ...metadata, attempt });
          const timeoutPromise = new Promise<boolean>((_, reject) => {
            setTimeout(() => reject(new Error('Healing timeout')), timeout);
          });
          
          const success = await Promise.race([healingPromise, timeoutPromise]);
          
          if (success) {
            this.updateStats(actionName, 'success');
            
            this.writer.healing(
              actionName,
              `Healing bem-sucedido na tentativa ${attempt}`,
              'low',
              { attempt, success: true }
            );
            
            return true;
          }
          
          if (attempt < maxRetries) {
            this.writer.status(`Healing falhou (tentativa ${attempt}/${maxRetries}). Tentando novamente...`);
            await this.simulateDelay(500 * attempt); // Backoff simples
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (attempt < maxRetries) {
            this.writer.healing(
              actionName,
              `Erro na tentativa ${attempt}: ${errorMessage}. Tentando novamente...`,
              'medium',
              { attempt, error: errorMessage }
            );
          } else {
            this.writer.healing(
              actionName,
              `Healing falhou após ${maxRetries} tentativas: ${errorMessage}`,
              'critical',
              { attempt, error: errorMessage, finalFailure: true }
            );
          }
        }
      }
      
      // Todas as tentativas falharam
      this.updateStats(actionName, 'failure');
      return false;
      
    } catch (error) {
      this.updateStats(actionName, 'failure');
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.writer.healing(
        actionName,
        `Erro crítico no healing: ${errorMessage}`,
        'critical',
        { error: errorMessage }
      );
      
      return false;
    }
  }

  registerHealingAttempt(action: string, severity: AONSeverity): void {
    this.updateStats(action, 'attempt');
    
    if (this.config.debug) {
      console.log(`[AON Healer] Tentativa registrada: ${action} (${severity})`);
    }
  }

  getHealingStats(): Record<string, any> {
    return {
      ...this.stats,
      successRate: this.stats.totalAttempts > 0 
        ? (this.stats.successfulHealing / this.stats.totalAttempts) * 100 
        : 0,
      availableActions: Array.from(this.actions.keys()),
      config: this.config
    };
  }

  // =========================================
  // MÉTODOS PRIVADOS
  // =========================================

  private updateStats(actionName: string, type: 'attempt' | 'success' | 'failure'): void {
    if (!this.stats.actionStats[actionName]) {
      this.stats.actionStats[actionName] = {
        attempts: 0,
        successes: 0,
        failures: 0,
        lastAttempt: 0
      };
    }

    const actionStats = this.stats.actionStats[actionName];
    actionStats.lastAttempt = Date.now();

    switch (type) {
      case 'attempt':
        this.stats.totalAttempts++;
        actionStats.attempts++;
        break;
      case 'success':
        this.stats.successfulHealing++;
        actionStats.successes++;
        break;
      case 'failure':
        this.stats.failedHealing++;
        actionStats.failures++;
        break;
    }
  }

  private determineSeverity(actionName: string, metadata?: Record<string, any>): AONSeverity {
    // Heurísticas para determinar severidade
    const criticalActions = ['recover_db_connection', 'fix_critical_error'];
    const highActions = ['refresh_token', 'handle_auth_failure'];
    const mediumActions = ['retry_with_backoff', 'fix_schema_validation'];
    
    if (criticalActions.includes(actionName)) return 'critical';
    if (highActions.includes(actionName)) return 'high';
    if (mediumActions.includes(actionName)) return 'medium';
    
    // Baseado em metadata
    if (metadata?.severity) return metadata.severity;
    if (metadata?.attempt && metadata.attempt > 2) return 'high';
    
    return 'medium';
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory para criar healers
 */
export function createAONHealer(writer: AONStreamWriter, config?: any): AONHealer {
  return new AONHealerImpl(writer, config);
}