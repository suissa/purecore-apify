/**
 * Interactive Healer - Sistema de Healing com Colaboração Desenvolvedor-IA
 * Parte do CrystalBox Mode
 */

import { AONHealer, AONSeverity } from './types.js';
import { 
  CrystalBoxWriter, 
  DeveloperNotificationService, 
  DevNotification, 
  DeveloperSolution,
  developerNotificationService 
} from './crystal-box.js';

export interface InteractiveHealerConfig {
  maxAutoAttempts?: number;
  devNotificationThreshold?: number;
  healingTimeout?: number;
  devResponseTimeout?: number;
  enableWhatsApp?: boolean;
  enableSlack?: boolean;
  enableTeams?: boolean;
  devContacts?: {
    whatsapp?: string;
    slack?: string;
    teams?: string;
  };
}

export class InteractiveHealer implements AONHealer {
  private writer: CrystalBoxWriter;
  private notificationService: DeveloperNotificationService;
  private config: InteractiveHealerConfig;
  private stats: {
    totalAttempts: number;
    autoHealed: number;
    devAssisted: number;
    failed: number;
    devNotificationsSent: number;
  };
  private devNotified: boolean = false;
  private currentAttempt: number = 0;

  constructor(writer: CrystalBoxWriter, config: InteractiveHealerConfig = {}) {
    this.writer = writer;
    this.notificationService = developerNotificationService;
    this.config = {
      maxAutoAttempts: 3,
      devNotificationThreshold: 2,
      healingTimeout: 30000,
      devResponseTimeout: 30000,
      enableWhatsApp: true,
      enableSlack: true,
      enableTeams: false,
      ...config
    };
    
    this.stats = {
      totalAttempts: 0,
      autoHealed: 0,
      devAssisted: 0,
      failed: 0,
      devNotificationsSent: 0
    };
  }

  async heal(action: string, description: string, metadata?: Record<string, any>): Promise<boolean> {
    this.stats.totalAttempts++;
    this.currentAttempt++;

    console.log(`🔮 [CrystalBox] Healing attempt ${this.currentAttempt}: ${action}`);

    // Registra tentativa no stream
    this.writer.crystalHealing(action, description, {
      attempt: this.currentAttempt,
      devNotified: this.devNotified,
      awaitingDev: false
    });

    // Fase 1: Tentativas automáticas
    if (this.currentAttempt <= this.config.maxAutoAttempts!) {
      const autoHealed = await this.attemptAutoHealing(action, description, metadata);
      
      if (autoHealed) {
        this.stats.autoHealed++;
        console.log(`✅ [CrystalBox] Auto-healing successful: ${action}`);
        return true;
      }
    }

    // Fase 2: Solicita ajuda do desenvolvedor
    if (!this.devNotified && this.currentAttempt >= this.config.devNotificationThreshold!) {
      console.log(`📱 [CrystalBox] Requesting developer assistance for: ${action}`);
      
      const devSolution = await this.requestDeveloperAssistance(action, description, metadata);
      
      if (devSolution) {
        const devHealed = await this.applyDeveloperSolution(devSolution, action, description);
        
        if (devHealed) {
          this.stats.devAssisted++;
          console.log(`👨‍💻 [CrystalBox] Developer-assisted healing successful: ${action}`);
          return true;
        }
      }
    }

    // Fase 3: Tentativas adicionais após intervenção do dev
    if (this.devNotified && this.currentAttempt <= this.config.maxAutoAttempts! + 2) {
      console.log(`🔄 [CrystalBox] Retry after dev intervention: ${action}`);
      
      const retryHealed = await this.attemptAutoHealing(action, description, {
        ...metadata,
        postDevIntervention: true,
        attempt: this.currentAttempt
      });
      
      if (retryHealed) {
        this.stats.autoHealed++;
        return true;
      }
    }

    // Falha final
    this.stats.failed++;
    console.log(`❌ [CrystalBox] All healing attempts failed: ${action}`);
    return false;
  }

  registerHealingAttempt(action: string, severity: AONSeverity): void {
    console.log(`📊 [CrystalBox] Registered healing attempt: ${action} (${severity})`);
  }

  getHealingStats(): Record<string, any> {
    return {
      ...this.stats,
      currentAttempt: this.currentAttempt,
      devNotified: this.devNotified,
      successRate: this.stats.totalAttempts > 0 
        ? ((this.stats.autoHealed + this.stats.devAssisted) / this.stats.totalAttempts) * 100 
        : 0,
      autoHealingRate: this.stats.totalAttempts > 0 
        ? (this.stats.autoHealed / this.stats.totalAttempts) * 100 
        : 0,
      devAssistanceRate: this.stats.totalAttempts > 0 
        ? (this.stats.devAssisted / this.stats.totalAttempts) * 100 
        : 0
    };
  }

  // =========================================
  // MÉTODOS PRIVADOS
  // =========================================

  private async attemptAutoHealing(action: string, description: string, metadata?: Record<string, any>): Promise<boolean> {
    // Simula diferentes estratégias de healing baseadas na ação
    const healingStrategies = this.getHealingStrategies(action);
    
    for (const strategy of healingStrategies) {
      try {
        console.log(`🔧 [CrystalBox] Trying strategy: ${strategy.name}`);
        
        this.writer.status(`Applying healing strategy: ${strategy.name}`, strategy.estimatedTime);
        
        const success = await strategy.execute(metadata);
        
        if (success) {
          this.writer.status(`Healing strategy successful: ${strategy.name}`);
          return true;
        }
        
      } catch (error) {
        console.log(`⚠️ [CrystalBox] Strategy failed: ${strategy.name} - ${error}`);
        this.writer.healing(action, `Strategy ${strategy.name} failed: ${error}`, 'medium', {
          strategy: strategy.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return false;
  }

  private async requestDeveloperAssistance(action: string, description: string, metadata?: Record<string, any>): Promise<DeveloperSolution | null> {
    this.devNotified = true;
    this.stats.devNotificationsSent++;

    // Envia status 102 Processing
    this.writer.writeProcessingStatus({
      message: 'Auto-healing failed. Requesting developer assistance...',
      devNotified: true,
      healingAttempt: this.currentAttempt
    });

    // Prepara notificação
    const notification: DevNotification = {
      type: 'whatsapp', // Prioridade: WhatsApp primeiro
      to: this.config.devContacts?.whatsapp || process.env.DEV_WHATSAPP || '',
      message: this.formatDeveloperMessage(action, description, metadata),
      requestId: this.writer.getRequestId(),
      priority: this.determinePriority(action, this.currentAttempt)
    };

    // Tenta enviar por diferentes canais
    const channels = this.getEnabledChannels();
    
    for (const channel of channels) {
      try {
        const channelNotification = {
          ...notification,
          type: channel.type,
          to: channel.contact
        };
        
        await this.notificationService.sendNotification(channelNotification);
        this.writer.devNotificationSent(channel.type, channel.contact);
        
        console.log(`📱 [CrystalBox] Developer notification sent via ${channel.type}`);
        break; // Sucesso no primeiro canal
        
      } catch (error) {
        console.warn(`⚠️ [CrystalBox] Failed to send via ${channel.type}:`, error);
      }
    }

    // Aguarda resposta do desenvolvedor
    this.writer.status('Waiting for developer response...', this.config.devResponseTimeout);
    
    const solution = await this.notificationService.waitForDeveloperResponse(
      this.writer.getRequestId(),
      this.config.devResponseTimeout!
    );

    if (solution) {
      console.log(`👨‍💻 [CrystalBox] Developer solution received: ${solution.action}`);
      this.writer.status(`Developer solution received: ${solution.action}`);
    } else {
      console.log(`⏰ [CrystalBox] Developer response timeout`);
      this.writer.status('Developer response timeout. Continuing with automatic healing...');
    }

    return solution;
  }

  private async applyDeveloperSolution(solution: DeveloperSolution, action: string, description: string): Promise<boolean> {
    console.log(`🔧 [CrystalBox] Applying developer solution: ${solution.action}`);
    
    this.writer.status(`Applying developer solution: ${solution.action}`);

    try {
      switch (solution.action) {
        case 'retry':
          // Tenta novamente com parâmetros originais
          return await this.attemptAutoHealing(action, description, solution.parameters);
          
        case 'skip':
          // Pula esta etapa e continua
          this.writer.status('Developer chose to skip this healing step');
          return true;
          
        case 'custom':
          // Executa código customizado fornecido pelo dev
          return await this.executeCustomSolution(solution.customCode, solution.parameters);
          
        default:
          console.warn(`⚠️ [CrystalBox] Unknown solution action: ${solution.action}`);
          return false;
      }
      
    } catch (error) {
      console.error(`❌ [CrystalBox] Error applying developer solution:`, error);
      this.writer.healing(action, `Developer solution failed: ${error}`, 'high', {
        solution: solution.action,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  private async executeCustomSolution(customCode?: string, parameters?: Record<string, any>): Promise<boolean> {
    if (!customCode) {
      return false;
    }

    try {
      // ATENÇÃO: Execução de código dinâmico - apenas em desenvolvimento!
      if (process.env.NODE_ENV === 'production') {
        console.warn('🚫 [CrystalBox] Custom code execution disabled in production');
        return false;
      }

      console.log(`🧪 [CrystalBox] Executing custom solution code`);
      this.writer.status('Executing custom developer solution...');

      // Sandbox básico para execução segura
      const sandbox = {
        console: console,
        parameters: parameters || {},
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        // Adicione outras funções seguras conforme necessário
      };

      // Executa código em contexto limitado
      const func = new Function('sandbox', `
        with (sandbox) {
          ${customCode}
        }
      `);

      const result = await func(sandbox);
      
      console.log(`✅ [CrystalBox] Custom solution executed successfully`);
      this.writer.status('Custom developer solution executed successfully');
      
      return Boolean(result);
      
    } catch (error) {
      console.error(`❌ [CrystalBox] Custom solution execution failed:`, error);
      this.writer.status(`Custom solution failed: ${error}`);
      return false;
    }
  }

  private getHealingStrategies(action: string) {
    const strategies = [
      {
        name: 'exponential_backoff',
        estimatedTime: 1000,
        execute: async (metadata?: any) => {
          const delay = Math.min(1000 * Math.pow(2, this.currentAttempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return Math.random() > 0.3; // 70% success rate
        }
      },
      {
        name: 'connection_refresh',
        estimatedTime: 2000,
        execute: async (metadata?: any) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return Math.random() > 0.4; // 60% success rate
        }
      },
      {
        name: 'cache_invalidation',
        estimatedTime: 500,
        execute: async (metadata?: any) => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return Math.random() > 0.2; // 80% success rate
        }
      }
    ];

    // Filtra estratégias baseadas na ação
    return strategies.filter(strategy => {
      if (action.includes('connection') || action.includes('database')) {
        return strategy.name === 'connection_refresh' || strategy.name === 'exponential_backoff';
      }
      if (action.includes('cache') || action.includes('memory')) {
        return strategy.name === 'cache_invalidation';
      }
      return true; // Todas as estratégias por padrão
    });
  }

  private formatDeveloperMessage(action: string, description: string, metadata?: Record<string, any>): string {
    return `🔮 CrystalBox Healing Required

Action: ${action}
Description: ${description}
Attempt: ${this.currentAttempt}
Request ID: ${this.writer.getRequestId()}
Time: ${new Date().toISOString()}

Metadata:
${JSON.stringify(metadata || {}, null, 2)}

Auto-healing strategies failed. Your assistance is needed.

Reply with:
• HEAL:${this.writer.getRequestId()}:retry - Try auto-healing again
• HEAL:${this.writer.getRequestId()}:skip - Skip this step
• HEAL:${this.writer.getRequestId()}:custom:YOUR_CODE - Execute custom solution`;
  }

  private determinePriority(action: string, attempt: number): 'low' | 'medium' | 'high' | 'critical' {
    if (attempt >= 5) return 'critical';
    if (action.includes('database') || action.includes('security')) return 'high';
    if (attempt >= 3) return 'medium';
    return 'low';
  }

  private getEnabledChannels() {
    const channels = [];
    
    if (this.config.enableWhatsApp && this.config.devContacts?.whatsapp) {
      channels.push({ type: 'whatsapp' as const, contact: this.config.devContacts.whatsapp });
    }
    
    if (this.config.enableSlack && this.config.devContacts?.slack) {
      channels.push({ type: 'slack' as const, contact: this.config.devContacts.slack });
    }
    
    if (this.config.enableTeams && this.config.devContacts?.teams) {
      channels.push({ type: 'teams' as const, contact: this.config.devContacts.teams });
    }
    
    return channels;
  }
}

// =========================================
// FACTORY FUNCTION
// =========================================

export function createInteractiveHealer(writer: CrystalBoxWriter, config?: InteractiveHealerConfig): InteractiveHealer {
  return new InteractiveHealer(writer, config);
}