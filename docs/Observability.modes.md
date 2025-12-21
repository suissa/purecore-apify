# Observability Modes - PureCore Apify

## 📋 Visão Geral

O PureCore Apify implementa múltiplos modos de observabilidade, evoluindo do conceito tradicional de **Black Box** e **Glass Box** para o inovador **CrystalBox**, que oferece observabilidade em tempo real com interatividade e self-healing automático.

## 🔍 Modos de Observabilidade

### 1. Black Box Mode (Tradicional)
**Header**: `Accept: application/json`

```mermaid
sequenceDiagram
    participant C as Cliente
    participant S as Servidor
    participant P as Processamento
    
    C->>S: Request
    Note over S,P: Processamento Oculto
    S->>P: Executa lógica
    P-->>S: Resultado/Erro
    S->>C: Response Final
    Note over C: Sem visibilidade do processo
```

**Características:**
- ✅ Processamento silencioso
- ✅ Resposta única ao final
- ✅ Compatibilidade total com clientes legados
- ❌ Sem visibilidade do processo interno
- ❌ Sem healing visível

### 2. Glass Box Mode (Transparente)
**Header**: `Accept: application/x-ndjson`

```mermaid
sequenceDiagram
    participant C as Cliente
    participant S as Servidor
    participant P as Processamento
    participant T as Telemetria
    
    C->>S: Request
    S->>T: Inicia Stream NDJSON
    T->>C: {"type":"status","message":"iniciando..."}
    S->>P: Executa lógica
    P->>T: Evento de progresso
    T->>C: {"type":"status","message":"processando..."}
    P->>T: Evento de healing
    T->>C: {"type":"healing","action":"retry"}
    P-->>S: Resultado
    S->>T: Finaliza stream
    T->>C: {"type":"result","data":{...}}
```

**Características:**
- ✅ Streaming de telemetria em tempo real
- ✅ Visibilidade completa do processo
- ✅ Eventos estruturados (status, healing, intent_analysis)
- ❌ Apenas observação passiva
- ❌ Sem interação durante o processo

### 3. 🔮 CrystalBox Mode (Inovação PureCore)
**Header**: `Accept: application/x-ndjson` + `X-Crystal-Mode: interactive`

```mermaid
sequenceDiagram
    participant C as Cliente
    participant S as Servidor
    participant H as Interactive Healer
    participant D as Desenvolvedor
    participant W as WhatsApp/Slack
    
    C->>S: Request (Crystal Mode)
    S->>C: 103 Early Hints (preload)
    S->>H: Inicia processamento
    H->>C: {"type":"status","message":"iniciando..."}
    
    Note over H: Erro detectado
    H->>H: Tentativa auto-healing (3x)
    H->>C: {"type":"healing","attempt":3,"failed":true}
    
    H->>W: Notifica desenvolvedor
    W->>D: 🔮 CrystalBox Alert: Healing failed
    S->>C: 102 Processing (aguardando dev)
    
    D->>S: Solução via webhook
    H->>H: Aplica solução do dev
    H->>C: {"type":"healing","dev_assisted":true}
    H->>C: {"type":"result","data":{...}}
```

**Características Únicas:**
- ✅ **Observabilidade em tempo real** (como Glass Box)
- ✅ **Self-healing automático** com tentativas inteligentes
- ✅ **Interatividade com desenvolvedor** quando healing falha
- ✅ **Nunca retorna erro** - sempre tenta se curar
- ✅ **Comunicação bidirecional** durante o processamento
- ✅ **Status codes inteligentes** (102 Processing, 103 Early Hints)

## 🚀 CrystalBox: O Futuro da Observabilidade

### Conceito Revolucionário

O **CrystalBox** é o primeiro modo de observabilidade que combina:

1. **Transparência Total** (Glass Box)
2. **Interatividade em Tempo Real**
3. **Self-Healing Automático**
4. **Colaboração Humano-IA**

### Arquitetura do CrystalBox

```mermaid
graph TB
    subgraph "Cliente"
        C[Cliente/Browser]
        PWA[PWA/Offline App]
    end
    
    subgraph "CrystalBox Server"
        CM[Crystal Middleware]
        CW[Crystal Writer]
        IH[Interactive Healer]
        TD[Theme Detection]
        OS[Offline Support]
    end
    
    subgraph "Notification Services"
        WA[WhatsApp API]
        SL[Slack Webhook]
        MS[Teams Webhook]
    end
    
    subgraph "Developer"
        DEV[Desenvolvedor]
        MOB[Mobile/Desktop]
    end
    
    C -->|Accept: x-ndjson + X-Crystal-Mode| CM
    CM --> TD
    CM --> OS
    CM --> CW
    CW --> IH
    
    CW -->|103 Early Hints| C
    CW -->|NDJSON Stream| C
    CW -->|102 Processing| C
    
    IH -->|Healing Failed| WA
    IH -->|Healing Failed| SL
    IH -->|Healing Failed| MS
    
    WA --> MOB
    SL --> MOB
    MS --> MOB
    MOB --> DEV
    
    DEV -->|Solution Webhook| IH
    IH -->|Apply Solution| CW
    
    TD -->|Theme CSS| PWA
    OS -->|Offline Components| PWA
```

### Fluxo de Healing Interativo

```mermaid
flowchart TD
    A[Request Iniciado] --> B[Processamento Normal]
    B --> C{Erro Detectado?}
    C -->|Não| H[Resposta Sucesso]
    C -->|Sim| D[Tentativa Auto-Healing]
    D --> E{Healing Sucesso?}
    E -->|Sim| F[Continua Processamento]
    E -->|Não| G[Solicita Ajuda Dev]
    G --> I[Dev Recebe WhatsApp/Slack]
    I --> J[Dev Fornece Solução]
    J --> K[Aplica Correção]
    K --> L[Retoma Processamento]
    F --> H
    L --> H
```

### Estados do Interactive Healer

```mermaid
stateDiagram-v2
    [*] --> Idle: Sistema Iniciado
    
    Idle --> AutoHealing: Erro Detectado
    AutoHealing --> Success: Healing OK
    AutoHealing --> Retry: Falha (< 3 tentativas)
    AutoHealing --> NotifyDev: Falha (≥ 3 tentativas)
    
    Retry --> AutoHealing: Nova Tentativa
    
    NotifyDev --> WaitingDev: Notificação Enviada
    WaitingDev --> ApplySolution: Dev Responde
    WaitingDev --> Timeout: 30s sem resposta
    
    ApplySolution --> Success: Solução OK
    ApplySolution --> AutoHealing: Retry Solicitado
    ApplySolution --> Skip: Dev Skip
    
    Timeout --> AutoHealing: Continua Tentativas
    Success --> [*]: Processo Completo
    Skip --> [*]: Processo Pulado
    
    note right of NotifyDev
        WhatsApp/Slack/Teams
        Status: 102 Processing
    end note
    
    note right of WaitingDev
        Aguarda resposta do dev
        Timeout: 30 segundos
    end note
```

### Status Codes Inteligentes

#### 🔄 102 Processing (Healing em Andamento)
```http
HTTP/1.1 102 Processing
Content-Type: application/x-ndjson
X-Crystal-Mode: healing
X-Healing-Attempt: 3
X-Dev-Notification: sent

{"type":"healing","action":"database_recovery","attempt":3,"dev_notified":true}
```

#### 🚀 103 Early Hints (Preload Agentic UX)
```http
HTTP/1.1 103 Early Hints
Link: </css/user-theme-dark.css>; rel=preload; as=style
Link: </js/offline-components.js>; rel=preload; as=script
X-User-Theme: dark
X-Offline-Ready: true

{"type":"preload","theme":"dark","offline_components":["forms","cache","sync"]}
```

## 🎯 Agentic UX Integration

### Preload Inteligente

O CrystalBox detecta o tema do usuário em paralelo e envia **103 Early Hints** para precarregar recursos específicos:

```typescript
// Detecção automática de tema
const userTheme = await detectUserTheme(req.user.id);

// Early Hints para preload
res.writeEarlyHints({
  link: [
    `</css/user-theme-${userTheme}.css>; rel=preload; as=style`,
    `</js/offline-components.js>; rel=preload; as=script`,
    `</data/user-preferences.json>; rel=preload; as=fetch`
  ]
});
```

### Offline-First Architecture

```typescript
// Hook de Offline-First
export function useOfflineFirst<T>(key: string, syncFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Sempre salva localmente ANTES de enviar
  const saveAction = useCallback(async (action: any) => {
    const timestamp = Date.now();
    const localAction = { ...action, timestamp, synced: false };
    
    // 1. Salva local PRIMEIRO
    await localDB.save(key, localAction);
    
    // 2. Tenta sincronizar se online
    if (isOnline) {
      try {
        await syncFn();
        await localDB.markSynced(key, timestamp);
      } catch (error) {
        // Fica na fila para sync posterior
        console.log('Ação salva offline, será sincronizada depois');
      }
    }
  }, [key, syncFn, isOnline]);
  
  return { data, saveAction, isOnline };
}
```

## 🔧 Implementação Técnica

### CrystalBox Middleware

```typescript
export function crystalBoxMiddleware(options: CrystalBoxOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const isCrystalMode = req.headers['x-crystal-mode'] === 'interactive';
    
    if (isCrystalMode) {
      // Configura modo interativo
      const crystalWriter = new CrystalBoxWriter(res, {
        devNotification: options.devNotification,
        maxHealingAttempts: options.maxHealingAttempts || 5,
        healingTimeout: options.healingTimeout || 30000
      });
      
      req.crystalWriter = crystalWriter;
      req.interactiveHealer = new InteractiveHealer(crystalWriter);
    }
    
    next();
  };
}
```

### Interactive Healer

```typescript
class InteractiveHealer extends AONHealer {
  private devNotificationSent = false;
  private healingAttempts = 0;
  
  async heal(action: string, description: string, metadata?: any): Promise<boolean> {
    this.healingAttempts++;
    
    // Tenta healing automático primeiro
    const autoHealed = await super.heal(action, description, metadata);
    
    if (autoHealed) {
      return true;
    }
    
    // Se falhou e ainda não notificou dev
    if (!this.devNotificationSent && this.healingAttempts >= 3) {
      await this.requestDeveloperHelp(action, description, metadata);
      this.devNotificationSent = true;
      
      // Envia 102 Processing enquanto aguarda
      this.writer.writeProcessingStatus({
        message: 'Aguardando intervenção do desenvolvedor...',
        devNotified: true,
        healingAttempt: this.healingAttempts
      });
      
      // Aguarda resposta do dev (com timeout)
      const devSolution = await this.waitForDeveloperResponse(30000);
      
      if (devSolution) {
        return await this.applyDeveloperSolution(devSolution);
      }
    }
    
    return false;
  }
  
  private async requestDeveloperHelp(action: string, description: string, metadata: any) {
    const message = `🚨 CrystalBox Healing Failed
    
Action: ${action}
Description: ${description}
Attempts: ${this.healingAttempts}
Metadata: ${JSON.stringify(metadata, null, 2)}

Request ID: ${this.writer.getRequestId()}
Time: ${new Date().toISOString()}

Reply with solution or 'retry' to attempt again.`;

    // Envia via WhatsApp/Slack/Teams
    await this.notificationService.send({
      type: 'whatsapp',
      to: process.env.DEV_WHATSAPP,
      message,
      requestId: this.writer.getRequestId()
    });
  }
}
```

### Developer Notification Service

```typescript
class DeveloperNotificationService {
  async send(notification: DevNotification): Promise<void> {
    switch (notification.type) {
      case 'whatsapp':
        await this.sendWhatsApp(notification);
        break;
      case 'slack':
        await this.sendSlack(notification);
        break;
      case 'teams':
        await this.sendTeams(notification);
        break;
    }
  }
  
  private async sendWhatsApp(notification: DevNotification) {
    // Integração com WhatsApp Business API
    await fetch('https://graph.facebook.com/v18.0/YOUR_PHONE_ID/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: notification.to,
        type: 'text',
        text: {
          body: `🔮 CrystalBox Alert\n\n${notification.message}\n\nReply: HEAL:${notification.requestId}:solution`
        }
      })
    });
  }
}
```

## 📊 Comparação dos Modos

```mermaid
graph LR
    subgraph "Black Box Mode"
        BB1[Cliente] --> BB2[Servidor] --> BB3[Resposta]
        BB2 -.-> BB4[Processamento Oculto]
        BB4 -.-> BB2
    end
    
    subgraph "Glass Box Mode"
        GB1[Cliente] --> GB2[Servidor] --> GB3[Stream NDJSON]
        GB2 --> GB4[Telemetria Visível]
        GB4 --> GB3
        GB3 --> GB5[Resposta Final]
    end
    
    subgraph "CrystalBox Mode"
        CB1[Cliente] --> CB2[Servidor] --> CB3[Stream Interativo]
        CB2 --> CB4[Interactive Healer]
        CB4 --> CB5[Dev Notification]
        CB5 --> CB6[WhatsApp/Slack]
        CB6 --> CB7[Desenvolvedor]
        CB7 --> CB4
        CB4 --> CB3
        CB3 --> CB8[Never Fails]
    end
    
    style BB4 fill:#333,color:#fff
    style GB4 fill:#4CAF50,color:#fff
    style CB4 fill:#9C27B0,color:#fff
    style CB5 fill:#FF9800,color:#fff
    style CB8 fill:#2196F3,color:#fff
```

| Característica | Black Box | Glass Box | **CrystalBox** |
|----------------|-----------|-----------|----------------|
| Observabilidade | ❌ | ✅ | ✅ |
| Streaming | ❌ | ✅ | ✅ |
| Self-Healing | ❌ | ✅ | ✅ |
| Interatividade | ❌ | ❌ | **✅** |
| Dev Collaboration | ❌ | ❌ | **✅** |
| Never Fails | ❌ | ❌ | **✅** |
| Offline Support | ❌ | ❌ | **✅** |
| Preload Intelligence | ❌ | ❌ | **✅** |

## 🌟 Benefícios do CrystalBox

### Para Desenvolvedores
- **Zero Downtime**: Sistema nunca falha completamente
- **Colaboração em Tempo Real**: Recebe notificações e pode intervir
- **Aprendizado Contínuo**: Sistema aprende com intervenções
- **Debug Avançado**: Visibilidade total + capacidade de intervenção

### Para Usuários
- **Experiência Fluida**: Nunca vê erros, apenas "processando"
- **Performance Otimizada**: Preload inteligente de recursos
- **Offline-First**: Funciona mesmo sem internet
- **Personalização Automática**: Interface adaptada ao perfil

### Para Sistemas de IA
- **Healing Inteligente**: Aprende com padrões de falha
- **Contexto Rico**: Telemetria detalhada para tomada de decisão
- **Colaboração Humano-IA**: Combina automação com expertise humana
- **Evolução Contínua**: Sistema melhora a cada interação

## 🚀 Roadmap

### Fase 1: Core Implementation ✅
- [x] AON (Glass Box) básico
- [x] Self-healing automático
- [x] Streaming NDJSON

### Fase 2: CrystalBox Foundation 🚧
- [ ] Interactive healing
- [ ] Developer notification system
- [ ] 102/103 status codes
- [ ] WhatsApp/Slack integration

### Fase 3: Agentic UX Integration 📋
- [ ] Theme detection e preload
- [ ] Offline-first components
- [ ] Local storage management
- [ ] Sync queue system

### Fase 4: AI Enhancement 🔮
- [ ] Pattern learning from dev interventions
- [ ] Predictive healing
- [ ] Automated solution suggestions
- [ ] Cross-system healing knowledge

---

**🔮 CrystalBox representa o futuro da observabilidade: não apenas ver o que acontece, mas participar ativamente da solução em tempo real.**