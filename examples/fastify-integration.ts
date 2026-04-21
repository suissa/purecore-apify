/**
 * Demonstração: Integração PureCore Fastify com Decorators e Validators
 *
 * Este exemplo mostra como usar a factory Fastify-like do PureCore FourPi
 * integrada com decorators de segurança, validação Zod e plugins Fastify
 */

import { createPureCoreFastify, corsPlugin, jwtPlugin, createValidatedHandler, withDecorators } from '../src/fastify-factory.js';
import { FourPiCompleteSentinel, SecuritySentinel } from '../src/decorators/config.js';
import { ProductValidator, validateProductName, validateProductPrice } from './product.schema.js';
import { OrderValidator } from './order.schema.js';

// =========================================
// CRIAÇÃO DA INSTÂNCIA FASTIFY-LIKE
// =========================================

const app = createPureCoreFastify({
  logger: true,
  resilientConfig: {
    enableFallback: true,
    retryAttempts: 3
  }
});

// =========================================
// REGISTRO DE PLUGINS FASTIFY
// =========================================

app.register(corsPlugin, {
  origin: 'http://localhost:3000'
});

app.register(jwtPlugin, {
  secret: 'my-secret-key'
});

// =========================================
// DECORATORS FASTIFY
// =========================================

app.decorate('productService', {
  create: async (data: any) => {
    // Simulação de criação de produto
    return { id: 'prod-123', ...data, createdAt: new Date() };
  },
  findById: async (id: string) => {
    // Simulação de busca
    return { id, name: 'Produto Teste', price: 99.99 };
  }
});

// =========================================
// HOOKS FASTIFY
// =========================================

app.addHook('onRequest', async (req: any, res: any) => {
  console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Adiciona timestamp ao request
  req.requestTime = Date.now();
});

app.addHook('onResponse', async (req: any, res: any) => {
  const duration = Date.now() - req.requestTime;
  console.log(`📤 [${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
});

app.addHook('onError', async (req: any, res: any, error: any) => {
  console.error(`❌ [${new Date().toISOString()}] Erro:`, error.message);
});

// =========================================
// ROTAS COM VALIDAÇÃO ZOD INTEGRADA
// =========================================

// GET /health - Rota simples
app.get('/health', async (req: any, res: any) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /products - Lista produtos
app.get('/products', async (req: any, res: any) => {
  const products = [
    { id: '1', name: 'Produto 1', price: 100 },
    { id: '2', name: 'Produto 2', price: 200 }
  ];

  res.json({
    products,
    count: products.length
  });
});

// GET /products/:id - Busca produto por ID
app.get('/products/:id', createValidatedHandler(null, async (req: any, res: any) => {
  const { id } = req.params;

  // Simula busca no serviço decorado
  const product = await req.server.decorators.productService.findById(id);

  if (!product) {
    res.status(404).json({ error: 'Produto não encontrado' });
    return;
  }

  res.json({ product });
}));

// POST /products - Cria produto com validação
app.post('/products', createValidatedHandler(ProductValidator.validate, async (req: any, res: any) => {
  try {
    // Validação já foi feita pelo createValidatedHandler
    const productData = req.body;

    // Simula criação
    const newProduct = await req.server.decorators.productService.create(productData);

    res.status(201).json({
      message: 'Produto criado com sucesso',
      product: newProduct
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// PUT /products/:id - Atualiza produto
app.put('/products/:id', createValidatedHandler(ProductValidator.validate, async (req: any, res: any) => {
  const { id } = req.params;
  const updateData = req.body;

  // Validações específicas por campo
  const nameValidation = validateProductName(updateData.name);
  if (!nameValidation.success) {
    res.status(400).json({
      error: 'Nome inválido',
      details: nameValidation.error.issues
    });
    return;
  }

  const priceValidation = validateProductPrice(updateData.price);
  if (!priceValidation.success) {
    res.status(400).json({
      error: 'Preço inválido',
      details: priceValidation.error.issues
    });
    return;
  }

  // Simula atualização
  const updatedProduct = {
    id,
    ...updateData,
    updatedAt: new Date()
  };

  res.json({
    message: 'Produto atualizado com sucesso',
    product: updatedProduct
  });
}));

// DELETE /products/:id - Remove produto
app.delete('/products/:id', async (req: any, res: any) => {
  const { id } = req.params;

  // Simula remoção
  res.json({
    message: 'Produto removido com sucesso',
    id
  });
});

// =========================================
// ROTAS COM DECORATORS DO PURECORE FOURPI
// =========================================

// POST /secure/products - Rota com decorators de segurança
app.post('/secure/products', withDecorators([FourPiCompleteSentinel], createValidatedHandler(
  ProductValidator.validate,
  async (req: any, res: any) => {
    console.log('🔒 Rota segura executada com FourPiCompleteSentinel');

    const productData = req.body;
    const newProduct = await req.server.decorators.productService.create(productData);

    res.status(201).json({
      message: 'Produto criado com segurança máxima',
      product: newProduct,
      decorators: 'FourPiCompleteSentinel aplicado'
    });
  }
)));

// POST /orders - Cria pedido com validação complexa
app.post('/orders', createValidatedHandler(OrderValidator.validate, async (req: any, res: any) => {
  const orderData = req.body;

  // Validações de negócio específicas
  const totalValid = OrderValidator.validateTotalAmount(orderData.products, orderData.totalAmount);
  if (!totalValid) {
    res.status(400).json({
      error: 'Total do pedido não corresponde à soma dos produtos'
    });
    return;
  }

  // Simula criação do pedido
  const newOrder = {
    id: `order-${Date.now()}`,
    ...orderData,
    status: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  res.status(201).json({
    message: 'Pedido criado com sucesso',
    order: newOrder
  });
}));

// =========================================
// ROTAS AUTENTICADAS
// =========================================

// GET /profile - Rota protegida por JWT
app.get('/profile', async (req: any, res: any) => {
  // Verifica autenticação usando decorator do plugin JWT
  if (req.server.decorators.authenticate) {
    req.server.decorators.authenticate(req, res, () => {
      // Usuário autenticado
      res.json({
        user: req.user,
        message: 'Perfil do usuário'
      });
    });
  } else {
    res.status(401).json({ error: 'Não autenticado' });
  }
});

// POST /admin/products - Rota administrativa
app.post('/admin/products', async (req: any, res: any) => {
  // Middleware de autenticação inline
  if (!req.headers.authorization) {
    res.status(401).json({ error: 'Token de admin obrigatório' });
    return;
  }

  const [, token] = req.headers.authorization.split(' ');
  if (token !== 'admin-token') {
    res.status(403).json({ error: 'Token de admin inválido' });
    return;
  }

  // Lógica administrativa
  const productData = req.body;
  const adminProduct = {
    ...productData,
    isAdminCreated: true,
    adminApproval: 'pending',
    createdAt: new Date()
  };

  res.status(201).json({
    message: 'Produto administrativo criado',
    product: adminProduct
  });
});

// =========================================
// MIDDLEWARE GLOBAL
// =========================================

app.use((req: any, res: any, next: any) => {
  // Middleware global
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Powered-By', 'PureCore-FourPi-Fastify');

  next();
});

// =========================================
// SUB-ROUTER (GRUPO DE ROTAS)
// =========================================

const apiRouter = createPureCoreFastify();

apiRouter.get('/stats', async (req: any, res: any) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

apiRouter.get('/config', async (req: any, res: any) => {
  res.json({
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    features: ['fastify-integration', 'zod-validation', 'decorators']
  });
});

// Registra sub-router
app.register((fastify, options, done) => {
  fastify.get('/v2/status', async (req: any, res: any) => {
    res.json({ status: 'API v2 OK' });
  });
  done();
});

// =========================================
// INICIALIZAÇÃO DO SERVIDOR
// =========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 ==========================================');
  console.log('🔥 PureCore Fastify Integration Demo');
  console.log(`📡 Servidor rodando na porta ${PORT}`);
  console.log('📊 Funcionalidades:');
  console.log('   ✅ API compatível com Fastify');
  console.log('   ✅ Plugins Fastify integrados');
  console.log('   ✅ Hooks Fastify funcionando');
  console.log('   ✅ Decorators Fastify disponíveis');
  console.log('   ✅ Validação Zod automática');
  console.log('   ✅ Decorators PureCore FourPi');
  console.log('   ✅ Sistema de autenticação');
  console.log('==========================================\n');

  console.log('📋 Rotas disponíveis:');
  console.log('   GET    /health');
  console.log('   GET    /products');
  console.log('   GET    /products/:id');
  console.log('   POST   /products');
  console.log('   PUT    /products/:id');
  console.log('   DELETE /products/:id');
  console.log('   POST   /secure/products (com decorators)');
  console.log('   POST   /orders');
  console.log('   GET    /profile (autenticado)');
  console.log('   POST   /admin/products (admin)');
  console.log('   GET    /v2/status (sub-router)');
  console.log('');

  console.log('🧪 Teste as rotas:');
  console.log(`   curl http://localhost:${PORT}/health`);
  console.log(`   curl http://localhost:${PORT}/products`);
  console.log('');
});

export default app;
