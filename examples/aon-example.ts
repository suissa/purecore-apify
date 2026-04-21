/**
 * Exemplo prático do padrão AON (Adaptive Observability Negotiation)
 * Demonstra como usar o sistema de observabilidade adaptativa
 */

import { Apify, withAON, analyzeIntent, performHealing, reportStatus } from '../src/index.js';

// =========================================
// CONFIGURAÇÃO DO SERVIDOR
// =========================================

const app = new Apify();

// Configura AON para desenvolvimento
app.setAONConfig({
  enabled: true,
  productionDetailLevel: 'detailed',
  healingTimeout: 10000,
  maxTelemetryEvents: 1000,
  debug: true
});

// =========================================
// ROTAS DE EXEMPLO
// =========================================

/**
 * Rota simples - funciona em ambos os modos (Black Box e Glass Box)
 */
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'standard'
  });
});

/**
 * Rota com AON explícito - demonstra telemetria em tempo real
 */
app.get('/api/v1/users/:id', withAON(async (req, res) => {
  const userId = req.params.id;
  
  // Reporta status inicial
  reportStatus(req, `Buscando usuário ${userId}...`);
  
  // Simula validação de entrada
  if (!userId || userId === 'invalid') {
    analyzeIntent(req, 'get_user', 'invalid_user_id', 'apply_validation_fix');
    
    // Tenta healing automático
    const healed = await performHealing(req, 'fix_schema_validation', 'ID de usuário inválido', {
      issue: 'invalid_user_id',
      originalValue: userId
    });
    
    if (!healed) {
      return res.status(400).json({ error: 'ID de usuário inválido' });
    }
  }
  
  // Simula busca no banco de dados
  reportStatus(req, 'Conectando ao banco de dados...');
  
  // Simula falha de conexão (30% de chance)
  if (Math.random() < 0.3) {
    reportStatus(req, 'Falha na conexão com banco. Tentando healing...');
    
    const dbHealed = await performHealing(req, 'recover_db_connection', 'Conexão com banco perdida', {
      type: 'primary',
      attempt: 1
    });
    
    if (!dbHealed) {
      return res.status(503).json({ error: 'Serviço temporariamente indisponível' });
    }
  }
  
  // Simula processamento
  reportStatus(req, 'Processando dados do usuário...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Retorna resultado
  return {
    id: userId,
    name: `Usuário ${userId}`,
    email: `user${userId}@example.com`,
    createdAt: new Date().toISOString(),
    aonProcessed: true
  };
}));

/**
 * Rota que simula operação custosa com múltiplas etapas
 */
app.post('/api/v1/process-order', withAON(async (req, res) => {
  const order = req.body;
  
  reportStatus(req, 'Iniciando processamento do pedido...');
  
  // Etapa 1: Validação
  reportStatus(req, 'Validando dados do pedido...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (!order.items || order.items.length === 0) {
    analyzeIntent(req, 'process_order', 'empty_items', 'apply_default_items');
    
    const healed = await performHealing(req, 'fix_schema_validation', 'Pedido sem itens', {
      issue: 'empty_items'
    });
    
    if (healed) {
      order.items = [{ id: 'default', name: 'Item padrão', price: 0 }];
      reportStatus(req, 'Itens padrão aplicados automaticamente');
    }
  }
  
  // Etapa 2: Cálculo de preços
  reportStatus(req, 'Calculando preços...', 1000);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simula erro de API externa (20% de chance)
  if (Math.random() < 0.2) {
    reportStatus(req, 'Erro na API de preços. Aplicando rate limit handling...');
    
    const healed = await performHealing(req, 'handle_rate_limit', 'Rate limit na API de preços', {
      service: 'pricing_api',
      retryAfter: 2000
    });
    
    if (!healed) {
      return res.status(503).json({ error: 'Serviço de preços indisponível' });
    }
  }
  
  // Etapa 3: Processamento final
  reportStatus(req, 'Finalizando processamento...');
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const total = order.items.reduce((sum: number, item: any) => sum + (item.price || 10), 0);
  
  return {
    orderId: `order_${Date.now()}`,
    status: 'processed',
    total,
    items: order.items,
    processedAt: new Date().toISOString(),
    healingApplied: true
  };
}));

/**
 * Rota que demonstra análise de intenção
 */
app.get('/api/v1/search', withAON(async (req, res) => {
  const query = req.query.q as string;
  
  if (!query) {
    analyzeIntent(req, 'search', 'missing_query', 'apply_default_search');
    
    reportStatus(req, 'Query não fornecida. Aplicando busca padrão...');
    
    return {
      results: [],
      query: 'default',
      message: 'Busca padrão aplicada - nenhum termo fornecido'
    };
  }
  
  // Simula diferentes tipos de busca baseado na query
  if (query.includes('error')) {
    analyzeIntent(req, 'search', 'error_simulation_detected', 'apply_error_handling');
    
    const healed = await performHealing(req, 'retry_with_backoff', 'Simulação de erro detectada', {
      query,
      attempt: 1
    });
    
    if (!healed) {
      return res.status(500).json({ error: 'Erro na busca' });
    }
  }
  
  reportStatus(req, `Executando busca para: "${query}"`);
  await new Promise(resolve => setTimeout(resolve, 600));
  
  return {
    results: [
      { id: 1, title: `Resultado para ${query}`, relevance: 0.95 },
      { id: 2, title: `Outro resultado para ${query}`, relevance: 0.87 }
    ],
    query,
    totalResults: 2,
    searchTime: '600ms'
  };
}));

// =========================================
// ROTA DE DEMONSTRAÇÃO DE MODOS
// =========================================

app.get('/api/v1/demo/modes', (req, res) => {
  const acceptHeader = req.headers.accept || '';
  const isGlassBox = acceptHeader.includes('application/x-ndjson');
  
  res.json({
    message: 'Demonstração dos modos AON',
    currentMode: isGlassBox ? 'Glass Box (Agent Mode)' : 'Black Box (Standard Mode)',
    instructions: {
      glassBox: 'Use Accept: application/x-ndjson para modo Glass Box',
      blackBox: 'Use Accept: application/json para modo Black Box'
    },
    examples: {
      curl_glassBox: 'curl -H "Accept: application/x-ndjson" http://localhost:3000/api/v1/users/123',
      curl_blackBox: 'curl -H "Accept: application/json" http://localhost:3000/api/v1/users/123'
    }
  });
});

// =========================================
// INICIALIZAÇÃO DO SERVIDOR
// =========================================

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log('🚀 Servidor AON Example rodando!');
  console.log(`📡 Porta: ${PORT}`);
  console.log('');
  console.log('📋 Rotas disponíveis:');
  console.log('  GET  /api/v1/health           - Health check simples');
  console.log('  GET  /api/v1/users/:id        - Busca usuário com AON');
  console.log('  POST /api/v1/process-order    - Processamento com healing');
  console.log('  GET  /api/v1/search?q=termo   - Busca com análise de intenção');
  console.log('  GET  /api/v1/demo/modes       - Demonstração de modos');
  console.log('');
  console.log('🔍 Para testar modo Glass Box (streaming):');
  console.log('  curl -H "Accept: application/x-ndjson" http://localhost:3000/api/v1/users/123');
  console.log('');
  console.log('🔍 Para testar modo Black Box (padrão):');
  console.log('  curl -H "Accept: application/json" http://localhost:3000/api/v1/users/123');
  console.log('');
  console.log('⚡ AON (Adaptive Observability Negotiation) ativo!');
});

export default app;