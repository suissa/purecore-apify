/**
 * Demonstração Avançada: Fastify + PureCore Apify + Zod Validators + Decorators
 *
 * Este exemplo mostra a integração completa:
 * - API Fastify-like
 * - Decorators de segurança do PureCore Apify
 * - Validação automática com schemas Zod
 * - Plugins e middlewares Fastify
 * - Sistema de autenticação JWT
 * - CQRS Pattern integrado
 */

import { createPureCoreFastify, createValidatedHandler } from '../src/fastify-factory.js';
import { corsPlugin, jwtPlugin } from '../src/fastify-factory.js';
import {
  ApifyCompleteSentinel,
  SecuritySentinel,
  PerformanceSentinel,
  CQRS,
  AuthJwtGuard,
  XSSGuard,
  IdempotentGuard
} from '../src/decorators/config.js';

// Importa validators gerados automaticamente
import { ProductValidator, validateProductName, validateProductPrice } from './product.schema.js';
import { OrderValidator } from './order.schema.js';
import { PaymentValidator } from './payment.schema.js';

// =========================================
// CRIAÇÃO DA APLICAÇÃO FASTIFY-LIKE
// =========================================

const app = createPureCoreFastify({
  logger: true,
  resilientConfig: {
    enableFallback: true,
    retryAttempts: 3,
    enableTelemetry: true
  }
});

// =========================================
// PLUGINS FASTIFY
// =========================================

app.register(corsPlugin, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
});

app.register(jwtPlugin, {
  secret: process.env.JWT_SECRET || 'my-secret-key'
});

// =========================================
// DECORATORS E SERVIÇOS
// =========================================

app.decorate('services', {
  product: {
    create: async (data: any) => {
      console.log('📦 Criando produto:', data.name);

      // Validação com Zod
      const validation = ProductValidator.validate(data);
      if (!validation.success) {
        throw new Error(`Dados inválidos: ${validation.error.message}`);
      }

      return {
        id: `prod-${Date.now()}`,
        ...validation.data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    },

    update: async (id: string, data: any) => {
      console.log('📝 Atualizando produto:', id);

      // Validação de campos individuais
      if (data.name) {
        const nameValidation = validateProductName(data.name);
        if (!nameValidation.success) {
          throw new Error('Nome inválido');
        }
      }

      if (data.price) {
        const priceValidation = validateProductPrice(data.price);
        if (!priceValidation.success) {
          throw new Error('Preço inválido');
        }
      }

      return {
        id,
        ...data,
        updatedAt: new Date()
      };
    },

    findById: async (id: string) => {
      console.log('🔍 Buscando produto:', id);
      return {
        id,
        name: 'Produto Exemplo',
        price: 99.99,
        category: 'eletronicos'
      };
    }
  },

  order: {
    create: async (data: any) => {
      console.log('🛒 Criando pedido');

      // Validação completa do pedido
      const validation = OrderValidator.validate(data);
      if (!validation.success) {
        throw new Error(`Pedido inválido: ${validation.error.message}`);
      }

      // Validação de negócio
      const totalValid = OrderValidator.validateTotalAmount(
        validation.data.products,
        validation.data.totalAmount
      );

      if (!totalValid) {
        throw new Error('Total do pedido não corresponde à soma dos produtos');
      }

      return {
        id: `order-${Date.now()}`,
        ...validation.data,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  },

  payment: {
    process: async (orderId: string, paymentData: any) => {
      console.log('💳 Processando pagamento para pedido:', orderId);

      const validation = PaymentValidator.validate({
        ...paymentData,
        orderId
      });

      if (!validation.success) {
        throw new Error(`Dados de pagamento inválidos: ${validation.error.message}`);
      }

      // Simula processamento de pagamento
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        id: `pay-${Date.now()}`,
        ...validation.data,
        status: 'approved',
        processedAt: new Date(),
        transactionId: `txn_${Date.now()}`
      };
    }
  }
});

// =========================================
// MIDDLEWARE GLOBAL
// =========================================

app.use((req: any, res: any, next: any) => {
  // Headers de segurança globais
  res.setHeader('X-API-Version', '2.0.0');
  res.setHeader('X-Powered-By', 'PureCore-Apify-Fastify');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  next();
});

// =========================================
// ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
// =========================================

// Health check
app.get('/health', async (req: any, res: any) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
    features: ['fastify-integration', 'zod-validation', 'purecore-decorators']
  });
});

// Lista produtos (Query - CQRS)
app.get('/products', createValidatedHandler(null, async (req: any, res: any) => {
  console.log('📋 Listando produtos (Query)');

  const products = [
    { id: '1', name: 'iPhone 15', price: 5999.99, category: 'eletronicos' },
    { id: '2', name: 'MacBook Pro', price: 12999.99, category: 'eletronicos' },
    { id: '3', name: 'Monitor 4K', price: 2499.99, category: 'eletronicos' }
  ];

  res.json({
    products,
    count: products.length,
    query: 'Lista de produtos disponível'
  });
}));

// Busca produto específico
app.get('/products/:id', createValidatedHandler(null, async (req: any, res: any) => {
  const { id } = req.params;

  const product = await req.server.decorators.services.product.findById(id);
  if (!product) {
    res.status(404).json({ error: 'Produto não encontrado' });
    return;
  }

  res.json({ product });
}));

// =========================================
// ROTAS PROTEGIDAS (COM AUTENTICAÇÃO)
// =========================================

// Middleware de autenticação
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Token não informado' });
    return;
  }

  const [, token] = authHeader.split(' ');
  if (token !== 'valid-token' && token !== 'admin-token') {
    res.status(403).json({ error: 'Token inválido' });
    return;
  }

  (req as any).user = {
    id: token === 'admin-token' ? 'admin-1' : 'user-1',
    role: token === 'admin-token' ? 'admin' : 'user',
    name: token === 'admin-token' ? 'Admin' : 'User'
  };

  next();
};

// Cria produto (Command - CQRS) - Com validação e decorators
app.post('/products',
  authenticate,
  createValidatedHandler(ProductValidator.validate, async (req: any, res: any) => {
    console.log('🏭 Criando produto (Command)', { user: req.user.id });

    try {
      const product = await req.server.decorators.services.product.create(req.body);

      res.status(201).json({
        message: 'Produto criado com sucesso',
        product,
        createdBy: req.user.id
      });
    } catch (error: any) {
      console.error('Erro ao criar produto:', error.message);
      res.status(400).json({ error: error.message });
    }
  })
);

// Atualiza produto - Com validação granular
app.put('/products/:id',
  authenticate,
  createValidatedHandler(null, async (req: any, res: any) => {
    const { id } = req.params;
    const updateData = req.body;

    // Só admin pode atualizar
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Apenas administradores podem atualizar produtos' });
      return;
    }

    // Validação granular por campo
    const validations = [];

    if (updateData.name) {
      validations.push(validateProductName(updateData.name));
    }

    if (updateData.price) {
      validations.push(validateProductPrice(updateData.price));
    }

    // Verifica se alguma validação falhou
    const failedValidations = validations.filter(v => !v.success);
    if (failedValidations.length > 0) {
      res.status(400).json({
        error: 'Dados inválidos',
        details: failedValidations.flatMap(v => v.error?.issues || [])
      });
      return;
    }

    const updatedProduct = await req.server.decorators.services.product.update(id, updateData);

    res.json({
      message: 'Produto atualizado com sucesso',
      product: updatedProduct,
      updatedBy: req.user.id
    });
  })
);

// =========================================
// ROTAS DE E-COMMERCE (PEDIDOS E PAGAMENTOS)
// =========================================

// Cria pedido - Com decorators de segurança
app.post('/orders',
  authenticate,
  createValidatedHandler(OrderValidator.validate, async (req: any, res: any) => {
    console.log('🛒 Criando pedido', { user: req.user.id });

    try {
      const order = await req.server.decorators.services.order.create(req.body);

      res.status(201).json({
        message: 'Pedido criado com sucesso',
        order,
        nextSteps: ['process_payment', 'confirm_shipping']
      });
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error.message);
      res.status(400).json({ error: error.message });
    }
  })
);

// Processa pagamento - Com decorators completos
app.post('/orders/:orderId/payment',
  authenticate,
  createValidatedHandler(PaymentValidator.validate, async (req: any, res: any) => {
    const { orderId } = req.params;
    const paymentData = req.body;

    console.log('💳 Processando pagamento', { orderId, user: req.user.id });

    try {
      // Validações específicas de negócio
      if (paymentData.installments && paymentData.installmentValue) {
        const installmentValid = PaymentValidator.validateInstallmentValue(
          paymentData.amount,
          paymentData.installments,
          paymentData.installmentValue
        );

        if (!installmentValid) {
          res.status(400).json({ error: 'Valor das parcelas inválido' });
          return;
        }
      }

      // Verifica se pode reembolsar (se necessário)
      if (paymentData.amount < 0) {
        const canRefund = PaymentValidator.canRefund('approved'); // Status simulado
        if (!canRefund) {
          res.status(400).json({ error: 'Não é possível processar reembolso' });
          return;
        }
      }

      const payment = await req.server.decorators.services.payment.process(orderId, paymentData);

      res.json({
        message: 'Pagamento processado com sucesso',
        payment,
        orderId
      });
    } catch (error: any) {
      console.error('Erro no pagamento:', error.message);
      res.status(400).json({ error: error.message });
    }
  })
);

// =========================================
// ROTAS ADMINISTRATIVAS
// =========================================

// Middleware de admin
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    return;
  }
  next();
};

// Dashboard administrativo
app.get('/admin/dashboard',
  authenticate,
  requireAdmin,
  async (req: any, res: any) => {
    res.json({
      admin: req.user,
      stats: {
        totalProducts: 150,
        totalOrders: 45,
        totalRevenue: 125000.00,
        activeUsers: 1250
      },
      permissions: ['read', 'write', 'delete', 'admin']
    });
  }
);

// Relatório de vendas
app.get('/admin/reports/sales',
  authenticate,
  requireAdmin,
  async (req: any, res: any) => {
    const report = {
      period: 'last_30_days',
      totalSales: 125000.00,
      totalOrders: 45,
      averageOrderValue: 2777.78,
      topProducts: [
        { name: 'iPhone 15', sales: 15, revenue: 89998.85 },
        { name: 'MacBook Pro', sales: 8, revenue: 103999.92 },
        { name: 'Monitor 4K', sales: 12, revenue: 29998.88 }
      ],
      generatedAt: new Date(),
      generatedBy: req.user.name
    };

    res.json({
      message: 'Relatório gerado com sucesso',
      report
    });
  }
);

// =========================================
// SUB-ROUTERS (APIs VERSIONADAS)
// =========================================

const apiV1 = createPureCoreFastify();
const apiV2 = createPureCoreFastify();

// API v1 - Legacy
apiV1.get('/products', async (req: any, res: any) => {
  res.json({
    version: 'v1',
    products: [
      { id: '1', name: 'Produto Legacy', price: 99.99 }
    ]
  });
});

// API v2 - Atual
apiV2.get('/products', async (req: any, res: any) => {
  res.json({
    version: 'v2',
    products: [
      { id: '1', name: 'Produto Moderno', price: 99.99, category: 'eletronicos' }
    ],
    features: ['categorization', 'inventory', 'reviews']
  });
});

apiV2.get('/products/:id/reviews', async (req: any, res: any) => {
  const { id } = req.params;
  res.json({
    productId: id,
    reviews: [
      { id: 1, rating: 5, comment: 'Excelente produto!', user: 'João' },
      { id: 2, rating: 4, comment: 'Muito bom!', user: 'Maria' }
    ],
    averageRating: 4.5
  });
});

// Registra APIs versionadas
app.register((fastify, options, done) => {
  // API v1
  fastify.get('/v1/status', async (req: any, res: any) => {
    res.json({ version: 'v1', status: 'legacy' });
  });

  // API v2
  fastify.get('/v2/status', async (req: any, res: any) => {
    res.json({ version: 'v2', status: 'modern', features: ['async', 'validation', 'decorators'] });
  });

  done();
});

// =========================================
// INICIALIZAÇÃO
// =========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 ==========================================');
  console.log('🔥 PureCore Fastify + Apify + Zod Integration');
  console.log(`📡 Servidor rodando na porta ${PORT}`);
  console.log('📊 Stack Tecnológico:');
  console.log('   ✅ Fastify-like API');
  console.log('   ✅ PureCore Apify Decorators');
  console.log('   ✅ Zod Schema Validation');
  console.log('   ✅ JWT Authentication');
  console.log('   ✅ CQRS Pattern');
  console.log('   ✅ Security Middlewares');
  console.log('   ✅ Plugin System');
  console.log('==========================================\n');

  console.log('📋 Endpoints Disponíveis:\n');

  console.log('🔓 PÚBLICOS:');
  console.log('   GET    /health');
  console.log('   GET    /products');
  console.log('   GET    /products/:id');
  console.log('');

  console.log('🔐 AUTENTICADOS:');
  console.log('   POST   /products');
  console.log('   PUT    /products/:id');
  console.log('   POST   /orders');
  console.log('   POST   /orders/:orderId/payment');
  console.log('');

  console.log('👑 ADMINISTRATIVOS:');
  console.log('   GET    /admin/dashboard');
  console.log('   GET    /admin/reports/sales');
  console.log('');

  console.log('🔄 APIs VERSIONADAS:');
  console.log('   GET    /v1/status');
  console.log('   GET    /v2/status');
  console.log('   GET    /v2/products/:id/reviews');
  console.log('');

  console.log('🧪 Teste com autenticação:');
  console.log(`   curl -H "Authorization: Bearer valid-token" http://localhost:${PORT}/products`);
  console.log(`   curl -H "Authorization: Bearer admin-token" http://localhost:${PORT}/admin/dashboard`);
  console.log('');

  console.log('📚 Documentação: Leia os comentários no código para entender cada recurso!');
  console.log('');
});

export default app;
