/**
 * Demonstração simples do padrão AON (Adaptive Observability Negotiation)
 * Versão JavaScript pura para testar sem problemas de compilação TypeScript
 */

const http = require('http');
const url = require('url');

// =========================================
// IMPLEMENTAÇÃO SIMPLES DO AON
// =========================================

class SimpleAONWriter {
  constructor(response, maxEvents = 1000) {
    this.response = response;
    this.active = true;
    this.eventCount = 0;
    this.maxEvents = maxEvents;
    
    // Configura headers para streaming NDJSON
    this.setupStreamingHeaders();
    this.sendAcknowledgement();
  }

  setupStreamingHeaders() {
    this.response.statusCode = 200;
    this.response.setHeader('Content-Type', 'application/x-ndjson');
    this.response.setHeader('Transfer-Encoding', 'chunked');
    this.response.setHeader('Cache-Control', 'no-cache');
    this.response.setHeader('Connection', 'keep-alive');
    this.response.setHeader('X-Accel-Buffering', 'no');
    this.response.setHeader('X-Content-Type-Options', 'nosniff');
  }

  sendAcknowledgement() {
    const ackEvent = {
      type: 'status',
      timestamp: Date.now(),
      message: 'AON stream initialized - Glass Box mode active'
    };
    this.writeRawEvent(ackEvent);
  }

  writeEvent(event) {
    if (!this.active || this.eventCount >= this.maxEvents) return;
    
    this.writeRawEvent({
      ...event,
      timestamp: event.timestamp || Date.now()
    });
    this.eventCount++;
  }

  writeRawEvent(event) {
    try {
      const jsonLine = JSON.stringify(event) + '\n';
      this.response.write(jsonLine);
    } catch (error) {
      console.error('[AON] Erro ao serializar evento:', error);
    }
  }

  status(message, estimatedDelayMs) {
    this.writeEvent({
      type: 'status',
      message,
      ...(estimatedDelayMs && { estimated_delay_ms: estimatedDelayMs })
    });
  }

  healing(action, description, severity = 'medium', metadata) {
    this.writeEvent({
      type: 'healing',
      severity,
      action,
      description,
      ...(metadata && { metadata })
    });
  }

  intentAnalysis(originalIntent, detectedIssue, decision) {
    this.writeEvent({
      type: 'intent_analysis',
      original_intent: originalIntent,
      detected_issue: detectedIssue,
      decision: decision
    });
  }

  end(result) {
    if (!this.active) return;
    
    const resultEvent = {
      type: 'result',
      timestamp: Date.now(),
      data: result || { success: true }
    };
    
    this.writeRawEvent(resultEvent);
    this.response.end();
    this.active = false;
  }

  error(error, code) {
    if (!this.active) return;
    
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorCode = code || 'UNKNOWN_ERROR';
    
    const errorEvent = {
      type: 'error',
      timestamp: Date.now(),
      code: errorCode,
      message: errorMessage,
      trace_id: `aon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.writeRawEvent(errorEvent);
    this.response.end();
    this.active = false;
  }

  isActive() {
    return this.active && !this.response.destroyed;
  }
}

// =========================================
// SIMULADOR DE HEALING
// =========================================

class SimpleHealer {
  constructor(writer) {
    this.writer = writer;
    this.stats = {
      totalAttempts: 0,
      successfulHealing: 0,
      failedHealing: 0
    };
  }

  async heal(action, description, metadata = {}) {
    this.stats.totalAttempts++;
    
    this.writer.healing(action, description, 'medium', metadata);
    
    // Simula delay de healing
    await this.delay(500 + Math.random() * 1000);
    
    // Simula sucesso baseado no tipo de ação
    let successRate = 0.8; // 80% padrão
    
    if (action === 'refresh_token') successRate = 0.9;
    if (action === 'retry_with_backoff') successRate = 0.7;
    if (action === 'recover_db_connection') successRate = 0.6;
    
    const success = Math.random() < successRate;
    
    if (success) {
      this.stats.successfulHealing++;
      this.writer.healing(action, `${description} - Healing bem-sucedido`, 'low', { 
        ...metadata, 
        success: true 
      });
    } else {
      this.stats.failedHealing++;
      this.writer.healing(action, `${description} - Healing falhou`, 'high', { 
        ...metadata, 
        success: false 
      });
    }
    
    return success;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalAttempts > 0 
        ? (this.stats.successfulHealing / this.stats.totalAttempts) * 100 
        : 0
    };
  }
}

// =========================================
// SERVIDOR DE DEMONSTRAÇÃO
// =========================================

function isGlassBoxMode(req) {
  const acceptHeader = req.headers.accept || '';
  return acceptHeader.includes('application/x-ndjson');
}

async function handleUserRequest(req, res, userId) {
  const isGlassBox = isGlassBoxMode(req);
  
  if (isGlassBox) {
    // MODO GLASS BOX - Streaming com telemetria
    const writer = new SimpleAONWriter(res);
    const healer = new SimpleHealer(writer);
    
    try {
      writer.status(`Buscando usuário ${userId}...`);
      
      // Simula validação
      if (!userId || userId === 'invalid') {
        writer.intentAnalysis('get_user', 'invalid_user_id', 'apply_validation_fix');
        
        const healed = await healer.heal('fix_schema_validation', 'ID de usuário inválido', {
          issue: 'invalid_user_id',
          originalValue: userId
        });
        
        if (!healed) {
          return writer.error('ID de usuário inválido', 'VALIDATION_ERROR');
        }
      }
      
      // Simula busca no banco
      writer.status('Conectando ao banco de dados...');
      await healer.delay(800);
      
      // Simula falha de conexão (30% de chance)
      if (Math.random() < 0.3) {
        writer.status('Falha na conexão com banco. Tentando healing...');
        
        const dbHealed = await healer.heal('recover_db_connection', 'Conexão com banco perdida', {
          type: 'primary',
          attempt: 1
        });
        
        if (!dbHealed) {
          return writer.error('Serviço temporariamente indisponível', 'DB_UNAVAILABLE');
        }
      }
      
      // Simula processamento
      writer.status('Processando dados do usuário...');
      await healer.delay(600);
      
      // Retorna resultado
      writer.end({
        id: userId,
        name: `Usuário ${userId}`,
        email: `user${userId}@example.com`,
        createdAt: new Date().toISOString(),
        aonProcessed: true,
        healingStats: healer.getStats()
      });
      
    } catch (error) {
      writer.error(error.message, 'INTERNAL_ERROR');
    }
    
  } else {
    // MODO BLACK BOX - Resposta tradicional
    res.setHeader('Content-Type', 'application/json');
    
    // Simula processamento silencioso
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
    
    // Simula falha ocasional
    if (Math.random() < 0.1) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'Serviço temporariamente indisponível' }));
      return;
    }
    
    res.end(JSON.stringify({
      id: userId,
      name: `Usuário ${userId}`,
      email: `user${userId}@example.com`,
      createdAt: new Date().toISOString(),
      mode: 'blackbox'
    }));
  }
}

async function handleProcessOrder(req, res) {
  const isGlassBox = isGlassBoxMode(req);
  
  if (isGlassBox) {
    const writer = new SimpleAONWriter(res);
    const healer = new SimpleHealer(writer);
    
    try {
      writer.status('Iniciando processamento do pedido...');
      
      // Lê body da requisição
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const order = JSON.parse(body || '{}');
          
          // Etapa 1: Validação
          writer.status('Validando dados do pedido...');
          await healer.delay(300);
          
          if (!order.items || order.items.length === 0) {
            writer.intentAnalysis('process_order', 'empty_items', 'apply_default_items');
            
            const healed = await healer.heal('fix_schema_validation', 'Pedido sem itens', {
              issue: 'empty_items'
            });
            
            if (healed) {
              order.items = [{ id: 'default', name: 'Item padrão', price: 10 }];
              writer.status('Itens padrão aplicados automaticamente');
            }
          }
          
          // Etapa 2: Cálculo de preços
          writer.status('Calculando preços...', 800);
          await healer.delay(800);
          
          // Simula erro de API externa (20% de chance)
          if (Math.random() < 0.2) {
            writer.status('Erro na API de preços. Aplicando rate limit handling...');
            
            const healed = await healer.heal('handle_rate_limit', 'Rate limit na API de preços', {
              service: 'pricing_api',
              retryAfter: 1000
            });
            
            if (!healed) {
              return writer.error('Serviço de preços indisponível', 'PRICING_UNAVAILABLE');
            }
          }
          
          // Etapa 3: Processamento final
          writer.status('Finalizando processamento...');
          await healer.delay(500);
          
          const total = (order.items || []).reduce((sum, item) => sum + (item.price || 10), 0);
          
          writer.end({
            orderId: `order_${Date.now()}`,
            status: 'processed',
            total,
            items: order.items || [],
            processedAt: new Date().toISOString(),
            healingStats: healer.getStats()
          });
          
        } catch (parseError) {
          writer.error('JSON malformado no corpo da requisição', 'PARSE_ERROR');
        }
      });
      
    } catch (error) {
      writer.error(error.message, 'INTERNAL_ERROR');
    }
    
  } else {
    // Modo Black Box
    res.setHeader('Content-Type', 'application/json');
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const order = JSON.parse(body || '{}');
        
        // Processamento silencioso
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const total = (order.items || []).reduce((sum, item) => sum + (item.price || 10), 0);
        
        res.end(JSON.stringify({
          orderId: `order_${Date.now()}`,
          status: 'processed',
          total,
          items: order.items || [],
          processedAt: new Date().toISOString(),
          mode: 'blackbox'
        }));
        
      } catch (parseError) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'JSON malformado' }));
      }
    });
  }
}

function handleDemo(req, res) {
  const acceptHeader = req.headers.accept || '';
  const isGlassBox = acceptHeader.includes('application/x-ndjson');
  
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    message: 'Demonstração AON - Adaptive Observability Negotiation',
    currentMode: isGlassBox ? 'Glass Box (Agent Mode)' : 'Black Box (Standard Mode)',
    specification: 'AONP v1.0.0',
    instructions: {
      glassBox: 'Use Accept: application/x-ndjson para modo Glass Box',
      blackBox: 'Use Accept: application/json para modo Black Box'
    },
    examples: {
      curl_glassBox: 'curl -H "Accept: application/x-ndjson" http://localhost:3000/api/v1/users/123',
      curl_blackBox: 'curl -H "Accept: application/json" http://localhost:3000/api/v1/users/123',
      curl_order: 'curl -X POST -H "Accept: application/x-ndjson" -H "Content-Type: application/json" -d \'{"items":[{"id":"1","name":"Produto","price":29.99}]}\' http://localhost:3000/api/v1/process-order'
    },
    routes: [
      'GET /api/v1/users/:id - Busca usuário com healing automático',
      'POST /api/v1/process-order - Processamento com múltiplas etapas',
      'GET /api/v1/demo - Esta página de demonstração'
    ]
  }, null, 2));
}

// =========================================
// SERVIDOR HTTP
// =========================================

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

  if (method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    // Roteamento simples
    if (method === 'GET' && pathname === '/api/v1/demo') {
      handleDemo(req, res);
    } else if (method === 'GET' && pathname.startsWith('/api/v1/users/')) {
      const userId = pathname.split('/').pop();
      await handleUserRequest(req, res, userId);
    } else if (method === 'POST' && pathname === '/api/v1/process-order') {
      await handleProcessOrder(req, res);
    } else {
      // 404
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'Not Found',
        message: `Cannot ${method} ${pathname}`,
        availableRoutes: [
          'GET /api/v1/demo',
          'GET /api/v1/users/:id',
          'POST /api/v1/process-order'
        ]
      }));
    }
  } catch (error) {
    console.error('Erro no servidor:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

// =========================================
// INICIALIZAÇÃO
// =========================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('🚀 Servidor AON Demo rodando!');
  console.log(`📡 Porta: ${PORT}`);
  console.log('');
  console.log('📋 Rotas disponíveis:');
  console.log('  GET  /api/v1/demo              - Demonstração e instruções');
  console.log('  GET  /api/v1/users/:id         - Busca usuário com AON');
  console.log('  POST /api/v1/process-order     - Processamento com healing');
  console.log('');
  console.log('🔍 Testes rápidos:');
  console.log('');
  console.log('# Modo Black Box (tradicional):');
  console.log(`  curl -H "Accept: application/json" http://localhost:${PORT}/api/v1/users/123`);
  console.log('');
  console.log('# Modo Glass Box (streaming com telemetria):');
  console.log(`  curl -H "Accept: application/x-ndjson" http://localhost:${PORT}/api/v1/users/123`);
  console.log('');
  console.log('# Processamento de pedido:');
  console.log(`  curl -X POST -H "Accept: application/x-ndjson" -H "Content-Type: application/json" \\`);
  console.log(`       -d '{"items":[{"id":"1","name":"Produto","price":29.99}]}' \\`);
  console.log(`       http://localhost:${PORT}/api/v1/process-order`);
  console.log('');
  console.log('⚡ AON (Adaptive Observability Negotiation) v1.0.0 ativo!');
  console.log('📋 Especificação AONP implementada conforme docs/AONP.md');
});

module.exports = { server };