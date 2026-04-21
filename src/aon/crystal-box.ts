/**
 * CrystalBox Mode - Observabilidade Interativa com Self-Healing
 * Evolução do AON com interatividade e colaboração desenvolvedor-IA
 */

import { ServerResponse } from "node:http";
import {
  AONStreamWriter,
  AONEvent,
  AONBaseEvent,
  createAONEvent,
} from "./types.js";
import { NDJSONStreamWriter } from "./stream-writer.js";

// =========================================
// TIPOS ESPECÍFICOS DO CRYSTALBOX
// =========================================

export interface CrystalBoxOptions {
  devNotification?: {
    whatsapp?: string;
    slack?: string;
    teams?: string;
  };
  maxHealingAttempts?: number;
  healingTimeout?: number;
  interactiveMode?: boolean;
}

export interface DevNotification {
  type: "whatsapp" | "slack" | "teams";
  to: string;
  message: string;
  requestId: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface DeveloperSolution {
  requestId: string;
  action: "retry" | "skip" | "custom";
  customCode?: string;
  parameters?: Record<string, any>;
  timestamp: number;
}

export interface CrystalBoxEvent extends AONBaseEvent {
  type:
    | "crystal_healing"
    | "dev_notification"
    | "dev_response"
    | "processing_status";
}

export interface CrystalHealingEvent extends CrystalBoxEvent {
  type: "crystal_healing";
  healing_attempt: number;
  dev_notified: boolean;
  interactive_mode: boolean;
  awaiting_dev: boolean;
}

export interface DevNotificationEvent extends CrystalBoxEvent {
  type: "dev_notification";
  notification_type: "whatsapp" | "slack" | "teams";
  dev_contact: string;
  request_id: string;
}

export interface ProcessingStatusEvent extends CrystalBoxEvent {
  type: "processing_status";
  status_code: 102 | 103;
  message: string;
  dev_notified?: boolean;
  healing_attempt?: number;
  preload_hints?: string[];
}

// =========================================
// CRYSTALBOX STREAM WRITER
// =========================================

export class CrystalBoxWriter
  extends NDJSONStreamWriter
  implements AONStreamWriter
{
  private requestId: string;
  private options: CrystalBoxOptions;
  private healingAttempts: number = 0;
  private devNotified: boolean = false;
  private awaitingDeveloper: boolean = false;

  constructor(response: ServerResponse, options: CrystalBoxOptions = {}) {
    super(response, options.maxHealingAttempts || 1000);
    this.requestId = this.generateRequestId();
    this.options = options;

    // Envia headers específicos do CrystalBox
    this.setupCrystalBoxHeaders();
  }

  private setupCrystalBoxHeaders(): void {
    this.response.setHeader("X-Crystal-Mode", "interactive");
    this.response.setHeader("X-Request-ID", this.requestId);
    this.response.setHeader("X-Healing-Enabled", "true");
    this.response.setHeader(
      "X-Dev-Notification",
      this.options.devNotification ? "enabled" : "disabled"
    );
  }

  getRequestId(): string {
    return this.requestId;
  }

  /**
   * Envia status 102 Processing durante healing
   */
  writeProcessingStatus(options: {
    message: string;
    devNotified?: boolean;
    healingAttempt?: number;
    preloadHints?: string[];
  }): void {
    // Atualiza headers de status
    this.response.setHeader("X-Processing-Status", "102");
    if (options.devNotified) {
      this.response.setHeader("X-Dev-Notified", "true");
    }
    if (options.healingAttempt) {
      this.response.setHeader(
        "X-Healing-Attempt",
        options.healingAttempt.toString()
      );
    }

    const event = createAONEvent<ProcessingStatusEvent>("processing_status", {
      status_code: 102,
      message: options.message,
      dev_notified: options.devNotified,
      healing_attempt: options.healingAttempt,
      preload_hints: options.preloadHints,
    });

    this.writeEvent(event);
  }

  /**
   * Envia Early Hints (103) para preload de recursos
   */
  writeEarlyHints(hints: {
    theme?: string;
    preloadLinks?: string[];
    offlineComponents?: string[];
  }): void {
    const preloadLinks = hints.preloadLinks || [];

    // Adiciona links baseados no tema
    if (hints.theme) {
      preloadLinks.push(
        `</css/user-theme-${hints.theme}.css>; rel=preload; as=style`
      );
    }

    // Adiciona componentes offline
    if (hints.offlineComponents) {
      preloadLinks.push(`</js/offline-components.js>; rel=preload; as=script`);
      preloadLinks.push(`</js/offline-storage.js>; rel=preload; as=script`);
    }

    // Envia headers Early Hints
    this.response.setHeader("X-Early-Hints", "103");
    this.response.setHeader("X-User-Theme", hints.theme || "default");
    this.response.setHeader(
      "X-Offline-Ready",
      hints.offlineComponents ? "true" : "false"
    );

    const event = createAONEvent<ProcessingStatusEvent>("processing_status", {
      status_code: 103,
      message: "Early hints sent for optimized loading",
      preload_hints: preloadLinks,
    });

    this.writeEvent(event);
  }

  /**
   * Registra tentativa de healing interativo
   */
  crystalHealing(
    action: string,
    description: string,
    options: {
      attempt: number;
      devNotified?: boolean;
      awaitingDev?: boolean;
    }
  ): void {
    this.healingAttempts = options.attempt;
    this.devNotified = options.devNotified || false;
    this.awaitingDeveloper = options.awaitingDev || false;

    const event = createAONEvent<CrystalHealingEvent>("crystal_healing", {
      healing_attempt: options.attempt,
      dev_notified: this.devNotified,
      interactive_mode: this.options.interactiveMode || false,
      awaiting_dev: this.awaitingDeveloper,
    });

    this.writeEvent(event);

    // Também envia evento de healing padrão
    this.healing(action, description, "medium", {
      crystal_mode: true,
      attempt: options.attempt,
      dev_notified: this.devNotified,
    });
  }

  /**
   * Registra notificação enviada ao desenvolvedor
   */
  devNotificationSent(
    type: "whatsapp" | "slack" | "teams",
    contact: string
  ): void {
    this.devNotified = true;

    const event = createAONEvent<DevNotificationEvent>("dev_notification", {
      notification_type: type,
      dev_contact: contact,
      request_id: this.requestId,
    });

    this.writeEvent(event);
  }

  private generateRequestId(): string {
    return `crystal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =========================================
// DEVELOPER NOTIFICATION SERVICE
// =========================================

export class DeveloperNotificationService {
  private pendingResponses = new Map<
    string,
    {
      resolve: (solution: DeveloperSolution) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  async sendNotification(notification: DevNotification): Promise<void> {
    switch (notification.type) {
      case "whatsapp":
        await this.sendWhatsApp(notification);
        break;
      case "slack":
        await this.sendSlack(notification);
        break;
      case "teams":
        await this.sendTeams(notification);
        break;
    }
  }

  async waitForDeveloperResponse(
    requestId: string,
    timeoutMs: number = 30000
  ): Promise<DeveloperSolution | null> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(requestId);
        resolve(null); // Timeout não é erro, apenas não há resposta
      }, timeoutMs);

      this.pendingResponses.set(requestId, {
        resolve: (solution) => {
          clearTimeout(timeout);
          this.pendingResponses.delete(requestId);
          resolve(solution);
        },
        reject: (error) => {
          clearTimeout(timeout);
          this.pendingResponses.delete(requestId);
          reject(error);
        },
        timeout,
      });
    });
  }

  receiveDeveloperResponse(solution: DeveloperSolution): void {
    const pending = this.pendingResponses.get(solution.requestId);
    if (pending) {
      pending.resolve(solution);
    }
  }

  private async sendWhatsApp(notification: DevNotification): Promise<void> {
    if (!process.env.WHATSAPP_TOKEN) {
      console.warn("WhatsApp token não configurado");
      return;
    }

    const message = this.formatWhatsAppMessage(notification);

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: notification.to,
            type: "text",
            text: { body: message },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      console.log(
        `📱 WhatsApp notification sent for ${notification.requestId}`
      );
    } catch (error) {
      console.error("Erro ao enviar WhatsApp:", error);
    }
  }

  private async sendSlack(notification: DevNotification): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) {
      console.warn("Slack webhook não configurado");
      return;
    }

    const message = this.formatSlackMessage(notification);

    try {
      const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }

      console.log(`💬 Slack notification sent for ${notification.requestId}`);
    } catch (error) {
      console.error("Erro ao enviar Slack:", error);
    }
  }

  private async sendTeams(notification: DevNotification): Promise<void> {
    if (!process.env.TEAMS_WEBHOOK_URL) {
      console.warn("Teams webhook não configurado");
      return;
    }

    const message = this.formatTeamsMessage(notification);

    try {
      const response = await fetch(process.env.TEAMS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Teams API error: ${response.statusText}`);
      }

      console.log(`🔔 Teams notification sent for ${notification.requestId}`);
    } catch (error) {
      console.error("Erro ao enviar Teams:", error);
    }
  }

  private formatWhatsAppMessage(notification: DevNotification): string {
    const priority = this.getPriorityEmoji(notification.priority);

    return `❄️👁️ *CrystalBox Alert* ${priority}

${notification.message}

*Request ID:* ${notification.requestId}
*Time:* ${new Date().toISOString()}

Reply with:
• HEAL:${notification.requestId}:retry - Try again
• HEAL:${notification.requestId}:skip - Skip this step  
• HEAL:${notification.requestId}:custom:YOUR_SOLUTION - Custom fix`;
  }

  private formatSlackMessage(notification: DevNotification) {
    return {
      text: `❄️👁️ CrystalBox Alert - ${notification.priority.toUpperCase()}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `🔮 CrystalBox Healing Required`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: notification.message,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Request ID:*\n${notification.requestId}`,
            },
            {
              type: "mrkdwn",
              text: `*Priority:*\n${notification.priority.toUpperCase()}`,
            },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Retry" },
              value: `retry_${notification.requestId}`,
              action_id: "crystal_retry",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Skip" },
              value: `skip_${notification.requestId}`,
              action_id: "crystal_skip",
            },
          ],
        },
      ],
    };
  }

  private formatTeamsMessage(notification: DevNotification) {
    return {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: "CrystalBox Healing Required",
      themeColor: this.getPriorityColor(notification.priority),
      sections: [
        {
          activityTitle: "❄️👁️ CrystalBox Alert",
          activitySubtitle: `Priority: ${notification.priority.toUpperCase()}`,
          text: notification.message,
          facts: [
            { name: "Request ID", value: notification.requestId },
            { name: "Time", value: new Date().toISOString() },
          ],
        },
      ],
      potentialAction: [
        {
          "@type": "ActionCard",
          name: "Healing Actions",
          inputs: [
            {
              "@type": "TextInput",
              id: "solution",
              title: "Solution",
              placeholder: 'Enter healing solution or "retry"/"skip"',
            },
          ],
          actions: [
            {
              "@type": "HttpPOST",
              name: "Apply Solution",
              target: `${process.env.API_BASE_URL}/crystal/heal/${notification.requestId}`,
            },
          ],
        },
      ],
    };
  }

  private getPriorityEmoji(priority: string): string {
    switch (priority) {
      case "critical":
        return "🚨";
      case "high":
        return "⚠️";
      case "medium":
        return "🔶";
      case "low":
        return "ℹ️";
      default:
        return "❄️👁️";
    }
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case "critical":
        return "FF0000";
      case "high":
        return "FF8C00";
      case "medium":
        return "FFD700";
      case "low":
        return "00CED1";
      default:
        return "9370DB";
    }
  }
}

// =========================================
// FACTORY FUNCTIONS
// =========================================

export function createCrystalBoxWriter(
  response: ServerResponse,
  options?: CrystalBoxOptions
): CrystalBoxWriter {
  return new CrystalBoxWriter(response, options);
}

export function createDeveloperNotificationService(): DeveloperNotificationService {
  return new DeveloperNotificationService();
}

// Singleton para o serviço de notificação
export const developerNotificationService =
  createDeveloperNotificationService();
