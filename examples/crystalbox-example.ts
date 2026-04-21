/**
 * Exemplo do CrystalBox Mode - Observabilidade Interativa
 * Demonstra healing interativo com notificação de desenvolvedor
 */

import { FourPi, crystalBoxMiddleware, withCrystalBox, requestInteractiveHealing, sendEarlyHints } from '../src/index.js';

// =========================================
// CONFIGURAÇÃO DO SERVIDOR
// =========================================

const app = new FourPi();

// Configura CrystalBox middleware
app.use(crystalBoxMiddleware({
  enabled: true,
  debug: true,
  crystalBox: {
    maxAutoAttempts: 3,
    devNotificationThreshold: 2,
    healingTimeout: 30000,
    devResponseTimeout: 30000,
    enableWhatsApp: true,
    enableSlack: true,
    devContacts: {
      whatsapp: process.env.DEV_WHATSAPP || '+5511999999999',
      slack: process.env.DEV_SLACK || '#dev-alerts'
    }
  },
  themeDetection: {
    enabled: true,
    defaultTheme: 'dark',
    supportedThemes: ['light', 'dark', 'auto']
  },
  offlineSupport: {
    enabled: true,
    components: ['forms', 'cache', 'sync', 'storage'],
    cacheStrategy: 'aggressive'
  }
}));

// =========================================
// ROTAS DE DEMONSTRAÇÃO
// =========================================

/**
 * Rota de demonstração do CrystalBox
 */
app.get('/api/v1/crystal/demo', (req, res) => {
  const acceptHeader = req.headers.accept || '';
  const crystalMode = req.headers['x-crystal-mode'];
  
  res.json({
    message: 'CrystalBox Mode Demo',
    currentMode: crystalMode === 'interactive' ? 'CrystalBox Interactive' : 
                 acceptHeader.includes('application/x-ndjson') ? 'Glass Box' : 'Black Box',
    instructions: {
      crystalBox: 'Use Accept: application/x-ndjson + X-Crystal-Mode: interactive',
      glassBox: 'Use Accept: application/x-ndjson',
      blackBox: 'Use Accept: application/json'
    },
    examples: {
      crystalBox: 'curl -H "Accept: application/x-ndjson" -H "X-Crystal-Mode: interactive" http://localhost:3000/api/v1/crystal/users/123',
      glassBox: 'curl -H "Accept: application/x-ndjson" http://localhost:3000/api/v1/crystal/users/123',
      blackBox: 'curl -H "Accept: application/json" http://localhost:3000/api/v1/crystal/users/123'
    }
  });
});

/**
 * Rota com CrystalBox - Demonstra healing interativo
 */
app.get('/api/v1/crystal/users/:id', withCrystalBox(async (req, res) => {
  const userId = req.params.id;
  
  // Envia Early Hints para otimização
  sendEarlyHints(req, {
    theme: req.userTheme,
    preloadLinks: [
      `</css/user-profile.css>; rel=preload; as=style`,
      `</js/user-components.js>; rel=preload; as=script`
    ],
    offlineComponents: req.offlineCapable ? ['user-cache', 'sync-queue'] : undefined
  });

  // Simula processamento com possível falha
  if (req.crystalWriter) {
    req.crystalWriter.status(`Iniciando busca do usuário ${userId}...`);
  }

  // Simula validação que pode falhar
  if (userId === 'invalid' || userId === 'error') {
    const healed = await requestInteractiveHealing(req, 'validate_user_id', 'ID de usuário inválido detectado', {
      userId,
      validationRule: 'must_be_numeric_or_uuid',
      suggestedFix: 'convert_to_valid_format'
    });
    
    if (!healed) {
      return res.status(400).json({ error: 'ID de usuário inválido após tentativas de healing' });
    }
  }

  // Simula conexão com banco que pode falhar
  if (req.crystalWriter) {
    req.crystalWriter.status('Conectando ao banco de dados...');
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simula falha de conexão (40% de chance)
  if (Math.random() < 0.4) {
    const healed = await requestInteractiveHealing(req, 'database_connection_recovery', 'Falha na conexão com banco de dados', {
      database: 'users_db',
      connectionPool: 'primary',
      lastSuccessfulConnection: new Date(Date.now() - 30000).toISOString(),
      errorCode: 'ECONNREFUSED'
    });
    
    if (!healed) {
      return res.status(503).json({ error: 'Banco de dados indisponível após tentativas de healing' });
    }
  }

  // Simula processamento de dados
  if (req.crystalWriter) {
    req.crystalWriter.status('Processando dados do usuário...');
  }
  
  await new Promise(resolve => setTimeout(resolve, 800));

  // Simula erro de API externa (30% de chance)
  if (Math.random() < 0.3) {
    const healed = await requestInteractiveHealing(req, 'external_api_recovery', 'Falha na API de enriquecimento de dados', {
      apiEndpoint: 'https://api.userdata.com/enrich',
      httpStatus: 429,
      rateLimitReset: Date.now() + 60000,
      retryAfter: 60
    });
    
    if (!healed) {
      // Continua sem enriquecimento
      if (req.crystalWriter) {
        req.crystalWriter.status('Continuando sem enriquecimento de dados...');
      }
    }
  }

  // Retorna resultado
  return {
    id: userId,
    name: `Usuário ${userId}`,
    email: `user${userId}@example.com`,
    theme: req.userTheme || 'default',
    offlineCapable: req.offlineCapable || false,
    createdAt: new Date().toISOString(),
    crystalBoxProcessed: true,
    mode: req.crystalMode || 'standard'
  };
}));

/**
 * Rota que simula processamento complexo com múltiplas falhas
 */
app.post('/api/v1/crystal/complex-operation', withCrystalBox(async (req, res) => {
  const operation = req.body;
  
  if (req.crystalWriter) {
    req.crystalWriter.status('Iniciando operação complexa...');
  }

  // Etapa 1: Validação de entrada
  if (req.crystalWriter) {
    req.crystalWriter.status('Validando entrada...', 500);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (!operation.type) {
    const healed = await requestInteractiveHealing(req, 'input_validation', 'Tipo de operação não especificado', {
      missingField: 'type',
      availableTypes: ['create', 'update', 'delete', 'sync'],
      suggestedDefault: 'create'
    });
    
    if (healed) {
      operation.type = 'create'; // Aplica correção
    }
  }

  // Etapa 2: Verificação de permissões
  if (req.crystalWriter) {
    req.crystalWriter.status('Verificando permissões...', 800);
  }
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Simula falha de autorização (25% de chance)
  if (Math.random() < 0.25) {
    const healed = await requestInteractiveHealing(req, 'authorization_recovery', 'Token de autorização expirado', {
      tokenType: 'JWT',
      expiresAt: new Date(Date.now() - 3600000).toISOString(),
      refreshTokenAvailable: true,
      userRole: 'admin'
    });
    
    if (!healed) {
      return res.status(401).json({ error: 'Não autorizado após tentativas de healing' });
    }
  }

  // Etapa 3: Processamento principal
  if (req.crystalWriter) {
    req.crystalWriter.status('Executando operação principal...', 2000);
  }
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simula falha de processamento (35% de chance)
  if (Math.random() < 0.35) {
    const healed = await requestInteractiveHealing(req, 'processing_recovery', 'Falha no processamento principal', {
      operationType: operation.type,
      stage: 'main_processing',
      errorType: 'timeout',
      resourcesUsed: {
        cpu: '85%',
        memory: '92%',
        disk: '78%'
      }
    });
    
    if (!healed) {
      return res.status(500).json({ error: 'Falha no processamento após tentativas de healing' });
    }
  }

  // Etapa 4: Finalização
  if (req.crystalWriter) {
    req.crystalWriter.status('Finalizando operação...');
  }
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    operationId: `op_${Date.now()}`,
    type: operation.type,
    status: 'completed',
    processedAt: new Date().toISOString(),
    crystalBoxMode: req.crystalMode,
    healingApplied: true,
    theme: req.userTheme,
    offlineReady: req.offlineCapable
  };
}));

/**
 * Endpoint para receber respostas de desenvolvedores (webhook)
 */
app.post('/api/v1/crystal/heal/:requestId', (req, res) => {
  const { requestId } = req.params;
  const solution = req.body;
  
  console.log(`❄️👁️ [CrystalBox] Recebida solução do desenvolvedor para ${requestId}:`, solution);
  
  // Processa a solução do desenvolvedor
  const { developerNotificationService } = require('../src/aon/crystal-box.js');
  
  developerNotificationService.receiveDeveloperResponse({
    requestId,
    action: solution.action || 'retry',
    customCode: solution.customCode,
    parameters: solution.parameters,
    timestamp: Date.now()
  });
  
  res.json({
    message: 'Solução recebida e aplicada',
    requestId,
    action: solution.action,
    timestamp: new Date().toISOString()
  });
});

/**
 * Endpoint para estatísticas do CrystalBox
 */
app.get('/api/v1/crystal/stats', (req, res) => {
  // Aqui você poderia coletar estatísticas reais do sistema
  res.json({
    crystalBoxVersion: '1.0.0',
    totalRequests: Math.floor(Math.random() * 10000),
    healingAttempts: Math.floor(Math.random() * 1000),
    devNotifications: Math.floor(Math.random() * 50),
    successRate: (85 + Math.random() * 10).toFixed(2) + '%',
    averageHealingTime: Math.floor(Math.random() * 5000) + 'ms',
    supportedModes: ['Black Box', 'Glass Box', 'CrystalBox Interactive'],
    features: {
      interactiveHealing: true,
      devNotifications: true,
      themeDetection: true,
      offlineSupport: true,
      earlyHints: true
    }
  });
});

// =========================================
// INICIALIZAÇÃO DO SERVIDOR
// =========================================

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log('❄️👁️ Servidor CrystalBox Example rodando!');
  console.log(`📡 Porta: ${PORT}`);
  console.log('');
  console.log('📋 Rotas CrystalBox disponíveis:');
  console.log('  GET  /api/v1/crystal/demo                    - Demonstração de modos');
  console.log('  GET  /api/v1/crystal/users/:id              - Busca usuário com healing');
  console.log('  POST /api/v1/crystal/complex-operation      - Operação complexa');
  console.log('  POST /api/v1/crystal/heal/:requestId        - Webhook para dev responses');
  console.log('  GET  /api/v1/crystal/stats                  - Estatísticas do sistema');
  console.log('');
  console.log('🔍 Testes CrystalBox:');
  console.log('');
  console.log('# Modo CrystalBox Interactive:');
  console.log(`  curl -H "Accept: application/x-ndjson" -H "X-Crystal-Mode: interactive" \\`);
  console.log(`       http://localhost:${PORT}/api/v1/crystal/users/123`);
  console.log('');
  console.log('# Modo Glass Box (AON padrão):');
  console.log(`  curl -H "Accept: application/x-ndjson" \\`);
  console.log(`       http://localhost:${PORT}/api/v1/crystal/users/123`);
  console.log('');
  console.log('# Teste com falha (força healing):');
  console.log(`  curl -H "Accept: application/x-ndjson" -H "X-Crystal-Mode: interactive" \\`);
  console.log(`       http://localhost:${PORT}/api/v1/crystal/users/error`);
  console.log('');
  console.log('# Operação complexa:');
  console.log(`  curl -X POST -H "Accept: application/x-ndjson" -H "X-Crystal-Mode: interactive" \\`);
  console.log(`       -H "Content-Type: application/json" \\`);
  console.log(`       -d '{"type":"create","data":{"name":"Test"}}' \\`);
  console.log(`       http://localhost:${PORT}/api/v1/crystal/complex-operation`);
  console.log('');
  console.log('❄️👁️ CrystalBox Mode: Observabilidade Interativa com Self-Healing!');
  console.log('📱 Configure DEV_WHATSAPP e DEV_SLACK para receber notificações');
});

export default app;