# AON - Adaptive Observability Negotiation

Este documento demonstra como usar o padrão AON (Adaptive Observability Negotiation) implementado no PureCore Apify.

## 📋 Visão Geral

O AON permite que APIs RESTful operem em dois modos distintos baseado na negociação de conteúdo HTTP:

- **Black Box Mode** (Padrão): Comportamento tradicional - executa toda a lógica e retorna apenas o resultado final
- **Glass Box Mode** (Agente): Transmite telemetria em tempo real via streaming NDJSON, incluindo healing automático

## 🚀 Execução Rápida

```bash
# 1. Execute o exemplo
npm run dev:aon
# ou
tsx examples/aon-example.ts

# 2. Teste os endpoints
curl -H "Accept: application/json" http://localhost:3000/api/v1/users/123        # Black Box
curl -H "Accept: application/x-ndjson" http://localhost:3000/api/v1/users/123   # Glass Box
```

## 🔧 Configuração

### Configuração Básica

```typescript
import { Apify, createAONMiddleware } from '@purecore-br/4pi';

const app = new Apify();

// Configuração automática baseada no ambiente
app.use(createAONMiddleware());

// Ou configuração manual
app.setAONConfig({
  enabled: true,
  productionDetailLevel: 'standard',
  healingTimeout: 5000,
  maxTelemetryEvents: 500,
  debug: false
});
```

### Configurações Predefinidas

```typescript
import { AON_DEV_CONFIG, AON_PROD_CONFIG, AON_MINIMAL_CONFIG } from '@purecore-br/4pi';

// Desenvolvimento - telemetria detalhada
app.setAONConfig(AON_DEV_CONFIG);

// Produção - otimizado
app.setAONConfig(AON_PROD_CONFIG);

// Mínimo - apenas healing essencial
app.setAONConfig(AON_MINIMAL_CONFIG);
```

## 📡 Uso em Rotas

### Rota com AON Explícito

```typescript
import { withAON, reportStatus, performHealing, analyzeIntent } from '@purecore-br/4pi';

app.get('/api/users/:id', withAON(async (req, res) => {
  const userId = req.params.id;
  
  // Reporta progresso
  reportStatus(req, `Buscando usuário ${userId}...`);
  
  // Validação com healing
  if (!userId) {
    analyzeIntent(req, 'get_user', 'missing_id', 'apply_default_id');
    
    const healed = await performHealing(req, 'fix_schema_validation', 'ID não fornecido');
    if (!healed) {
      return res.status(400).json({ error: 'ID obrigatório' });
    }
  }
  
  // Simula operação custosa
  reportStatus(req, 'Conectando ao banco...', 1000);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { id: userId, name: `User ${userId}` };
}));
```

### Rota com Healing Automático

```typescript
app.post('/api/orders', withAON(async (req, res) => {
  reportStatus(req, 'Processando pedido...');
  
  // Simula falha de conexão
  if (Math.random() < 0.3) {
    const healed = await performHealing(req, 'recover_db_connection', 'Conexão perdida', {
      type: 'primary',
      attempt: 1
    });
    
    if (!healed) {
      return res.status(503).json({ error: 'Serviço indisponível' });
    }
  }
  
  return { orderId: 'order_123', status: 'created' };
}));
```

## 🔍 Modos de Operação

### Black Box Mode (application/json)

```bash
curl -H "Accept: application/json" http://localhost:3000/api/v1/users/123
```

**Resposta:**
```json
{
  "id": "123",
  "name": "User 123",
  "email": "user123@example.com"
}
```

### Glass Box Mode (application/x-ndjson)

```bash
curl -H "Accept: application/x-ndjson" http://localhost:3000/api/v1/users/123
```

**Resposta (streaming NDJSON):**
```json
{"type":"status","timestamp":1703123456789,"message":"AON stream initialized - Glass Box mode active"}
{"type":"status","timestamp":1703123456790,"message":"Buscando usuário 123..."}
{"type":"status","timestamp":1703123456800,"message":"Conectando ao banco de dados..."}
{"type":"healing","timestamp":1703123456850,"severity":"medium","action":"recover_db_connection","description":"Conexão com banco perdida"}
{"type":"status","timestamp":1703123457800,"message":"Processando dados do usuário..."}
{"type":"result","timestamp":1703123458800,"data":{"id":"123","name":"User 123","email":"user123@example.com"}}
```

## 🛠️ Eventos AON

### Tipos de Eventos

1. **status** - Progresso e heartbeat
2. **intent_analysis** - Análise de intenção do usuário
3. **healing** - Ações de auto-cura
4. **result** - Resultado final (terminal)
5. **error** - Erro fatal (terminal)

### Exemplo de Eventos

```typescript
// Status
reportStatus(req, 'Processando...', 1000);

// Análise de intenção
analyzeIntent(req, 'create_user', 'invalid_email', 'apply_email_fix');

// Healing
await performHealing(req, 'refresh_token', 'Token expirado', {
  provider: 'Auth0',
  attempt: 1
});
```

## 🔧 Healing Actions Disponíveis

### Actions Padrão

- `refresh_token` - Renova tokens de autenticação
- `retry_with_backoff` - Retry com backoff exponencial
- `fix_schema_validation` - Correções automáticas de schema
- `recover_db_connection` - Reestabelece conexões de banco
- `handle_rate_limit` - Gerencia rate limits de APIs

### Custom Healing Actions

```typescript
import { createAONHealer } from '@purecore-br/4pi';

const healer = createAONHealer(writer);

healer.registerAction({
  name: 'custom_healing',
  description: 'Ação customizada de healing',
  handler: async (metadata) => {
    // Lógica de healing customizada
    return true; // sucesso
  },
  maxRetries: 3,
  timeout: 5000
});
```

## 📊 Monitoramento e Debug

### Headers de Debug

Em modo desenvolvimento, o AON adiciona headers informativos:

```
X-AON-Summary: {"totalEvents":5,"duration":1200,"healingAttempts":1}
X-AON-Mode: glassbox
X-AON-Request-ID: aon_1703123456789_abc123
```

### Estatísticas de Healing

```typescript
app.get('/api/stats', (req, res) => {
  const stats = req.aonHealer?.getHealingStats();
  res.json(stats);
});
```

## 🧪 Testes

### Arquivo de Testes HTTP

Use o arquivo `examples/test-aon.http` com extensões REST Client:

```http
### Teste Glass Box Mode
GET http://localhost:3000/api/v1/users/123
Accept: application/x-ndjson

### Teste Black Box Mode
GET http://localhost:3000/api/v1/users/123
Accept: application/json
```

### Testes Automatizados

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './aon-example';

describe('AON Tests', () => {
  it('should work in Black Box mode', async () => {
    const response = await request(app)
      .get('/api/v1/users/123')
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.body.id).toBe('123');
  });
  
  it('should stream in Glass Box mode', async () => {
    const response = await request(app)
      .get('/api/v1/users/123')
      .set('Accept', 'application/x-ndjson');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/x-ndjson');
  });
});
```

## 🔒 Segurança

### Sanitização de Eventos

O AON automaticamente sanitiza eventos para evitar vazamento de dados sensíveis:

- Credenciais são mascaradas
- Tokens são truncados
- Connection strings são omitidas

### Controle de Acesso

```typescript
app.setAONConfig({
  enabled: true,
  productionDetailLevel: process.env.NODE_ENV === 'production' ? 'minimal' : 'detailed'
});
```

## 📈 Performance

### Otimizações

- Streaming assíncrono para não bloquear I/O
- Buffer limitado para evitar memory leaks
- Timeout configurável para healing actions
- Rate limiting de eventos de telemetria

### Métricas

```typescript
const stats = getAONStats(req);
console.log(`Request ${stats.requestId} took ${stats.duration}ms with ${stats.eventCount} events`);
```

## 🚀 Produção

### Configuração Recomendada

```typescript
app.setAONConfig({
  enabled: true,
  productionDetailLevel: 'standard',
  healingTimeout: 3000,
  maxTelemetryEvents: 100,
  debug: false
});
```

### Monitoramento

- Use ferramentas como Grafana para visualizar métricas AON
- Configure alertas para falhas de healing
- Monitore taxa de sucesso de healing actions

## 📚 Referências

- [Especificação AONP](../docs/AONP.md) - Documentação completa do padrão
- [RFC 7231](https://tools.ietf.org/html/rfc7231) - Content Negotiation HTTP
- [NDJSON Spec](http://ndjson.org/) - Newline Delimited JSON