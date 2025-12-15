import { Apify } from '../src/index.js';
import { Router } from '../src/router.js';
import { Request, Response } from '../src/types.js';
import {
  NotFoundError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  httpErrors
} from '../src/errors.js';
import { errorHandler, authMiddleware, error, validationError, databaseError, externalApiError } from '../src/middlewares.js';
import { ResilientConfig } from '../src/healer.js';
import {
  AutoescaleSentinel,
  ApiSentinel,
  DatabaseSentinel,
  RateLimitGuard,
  SchemaValidator,
  Memoization,
  Inject,
  Catch,
  registerDependency
} from '../src/decorators/config.js';

// Configuração do sistema resiliente
const resilientConfig: ResilientConfig = {
  notFound: {
    autoFixRoutes: true, // Ativa correção automática de rotas 404
    // fallbackApi: 'https://api-externa.com', // API externa para fallback (opcional)
  },
  internalServerError: {
    retryAfter: 300, // 5 minutos de retry para 500
    healerAgent: true, // Ativa análise inteligente de erros
    healerConfig: {
      // llmApiKey: process.env.OPENAI_API_KEY, // Para usar LLM
      // storageUrl: 'https://api-storage.com/mappings' // Para salvar mapeamentos
    }
  }
};

// Exemplo de uso do tratamento de erro robusto e resiliente
const app = new Apify(resilientConfig);

// IMPORTANTE: O errorHandler deve ser o ÚLTIMO middleware
app.use(errorHandler);

// Exemplo 1: Erro de validação
app.get('/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  // Validação com ValidationError
  if (!id) {
    throw validationError('ID do usuário é obrigatório', 'id', id);
  }

  const userId = parseInt(id);
  if (isNaN(userId)) {
    throw new BadRequestError('ID deve ser um número');
  }

  // Simula usuário não encontrado
  if (userId > 100) {
    throw new NotFoundError(`Usuário ${userId} não encontrado`);
  }

  res.json({
    id: userId,
    name: `Usuário ${userId}`,
    email: `user${userId}@example.com`
  });
});

// Exemplo 2: Erro de criação com conflito
app.post('/users', (req: Request, res: Response) => {
  const { email } = req.body;

  // Simula validação de email
  if (!email) {
    throw validationError('Email é obrigatório', 'email', email);
  }

  // Simula conflito (email já existe)
  if (email === 'existing@example.com') {
    throw new ConflictError('Email já cadastrado no sistema');
  }

  res.status(201).json({
    id: Date.now(),
    email,
    createdAt: new Date()
  });
});

// Exemplo 3: Erro de autenticação
app.get('/admin', authMiddleware, (req: Request, res: Response) => {
  // authMiddleware já lança UnauthorizedError se token inválido
  res.json({ message: 'Área administrativa' });
});

// Exemplo 4: Erro de autorização
app.get('/admin/super-secret', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;

  if (user.role !== 'admin') {
    throw new ForbiddenError('Apenas administradores podem acessar esta área');
  }

  res.json({ secret: 'Dados confidenciais' });
});

// Exemplo 5: Simulação de erro de banco de dados
app.get('/db-error', (req: Request, res: Response) => {
  try {
    // Simula erro de conexão com banco
    throw new Error('Connection timeout');
  } catch (originalError) {
    throw databaseError('Erro ao conectar com o banco de dados', originalError as Error);
  }
});

// Exemplo 6: Simulação de erro de API externa
app.get('/external-api', async (req: Request, res: Response) => {
  try {
    // Simula chamada para API externa
    const response = await fetch('https://api-externa-que-nao-existe.com');
    if (!response.ok) {
      throw new Error('API externa retornou erro');
    }
  } catch (originalError) {
    throw externalApiError('GitHub API', 'Falha ao buscar dados externos', originalError as Error);
  }

  res.json({ data: 'Dados da API externa' });
});

// Exemplo 7: Uso da função helper error()
app.get('/shortcut/:status', (req: Request, res: Response) => {
  const { status } = req.params;
  const statusCode = parseInt(status);

  if (isNaN(statusCode)) {
    throw error(400, 'Status deve ser um número');
  }

  // Lança erro com status code dinâmico
  throw error(statusCode, `Erro personalizado com status ${statusCode}`);
});

// Exemplo 8: Uso do objeto httpErrors (compatível com Fastify)
app.get('/http-errors/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const statusCode = parseInt(code);

  if (isNaN(statusCode)) {
    throw httpErrors.badRequest('Código deve ser um número');
  }

  // Demonstra o uso do objeto httpErrors similar ao fastify.httpErrors
  switch (statusCode) {
    case 400:
      throw httpErrors.badRequest();
    case 401:
      throw httpErrors.unauthorized();
    case 403:
      throw httpErrors.forbidden();
    case 404:
      throw httpErrors.notFound();
    case 405:
      throw httpErrors.methodNotAllowed();
    case 409:
      throw httpErrors.conflict();
    case 422:
      throw httpErrors.unprocessableEntity();
    case 429:
      throw httpErrors.tooManyRequests();
    case 500:
      throw httpErrors.internalServerError();
    case 502:
      throw httpErrors.badGateway();
    case 503:
      throw httpErrors.serviceUnavailable();
    case 504:
      throw httpErrors.gatewayTimeout();
    default:
      throw httpErrors.internalServerError(`Código de erro não suportado: ${statusCode}`);
  }
});

// Exemplo 9: Demonstração de i18n (todas as mensagens estão em português)
app.get('/i18n-demo', (req: Request, res: Response) => {
  // Todos os erros usarão mensagens em português automaticamente
  throw httpErrors.paymentRequired('Pagamento é obrigatório para este recurso');
});

// Exemplo 10: Rate limiting simulado
let requestCount = 0;
app.get('/rate-limit', (req: Request, res: Response) => {
  requestCount++;

  if (requestCount > 5) {
    throw new TooManyRequestsError('Muitas requisições. Tente novamente mais tarde.');
  }

  res.json({
    message: 'Requisição permitida',
    count: requestCount,
    remaining: Math.max(0, 5 - requestCount)
  });
});

// Exemplo 11: Erro de serviço indisponível (manutenção)
app.get('/maintenance', (req: Request, res: Response) => {
  throw new ServiceUnavailableError('Sistema em manutenção. Tente novamente em alguns minutos.');
});

// --- EXEMPLOS DO SISTEMA RESILIENTE ---

// Rotas corretas para teste de auto-correção
app.get('/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({
    id,
    name: `Usuário ${id}`,
    email: `user${id}@example.com`,
    autoCorrected: req.headers['x-auto-corrected'] === 'true'
  });
});

app.post('/users', (req: Request, res: Response) => {
  res.status(201).json({
    id: Date.now(),
    ...req.body,
    created: true
  });
});

app.get('/products/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  res.json({
    slug,
    name: `Produto ${slug}`,
    price: 99.99
  });
});

// Exemplo 12: Simulação de erro 500 com análise do HealerAgent
app.get('/database-error', (req: Request, res: Response) => {
  // Simula erro de banco de dados
  throw new InternalServerError('Connection timeout to database');
});

// Exemplo 13: Endpoint para estatísticas do sistema resiliente
app.get('/resilient-stats', (req: Request, res: Response) => {
  const stats = app.getResilientStats();
  res.json({
    resilientSystem: {
      healerAgent: stats.healerAgent,
      availableRoutes: stats.availableRoutesCount,
      config: stats.config
    },
    timestamp: new Date().toISOString()
  });
});

// Exemplo 14: Demonstração de auto-correção (rotas que serão corrigidas automaticamente)
// Estas rotas não existem, mas o sistema vai tentar encontrar similares
app.get('/user/:id', (req: Request, res: Response) => {
  // Esta rota nunca será chamada - será corrigida para /users/:id
  res.json({ message: 'Esta rota nunca executa' });
});

app.get('/product/:id', (req: Request, res: Response) => {
  // Será corrigida para /products/:slug se tiver alta confiança
  res.json({ message: 'Esta rota nunca executa' });
});

// =========================================
// EXEMPLOS COM DECORATORS AVANÇADOS
// =========================================

// Exemplo 15: Usando AutoescaleSentinel (como no código do usuário)
class UserController {

  @AutoescaleSentinel
  async getProfile(req: Request, res: Response) {
    // Este método tem TODOS os decorators aplicados automaticamente:
    // Logs, Metrics, TraceSpan, SmartCache, CircuitBreaker, Timeout, Failover, AuthExpressGuard
    return res.json({
      id: req.params.id,
      name: 'João Silva',
      email: 'joao@example.com'
    });
  }

  @ApiSentinel
  @SchemaValidator({
    type: 'zod',
    schema: { /* schema de validação */ },
    field: 'body'
  })
  @Memoization({ ttl: 300 })
  async createUser(req: Request, res: Response) {
    // Validação automática + cache + rate limit + error handling
    const user = req.body;
    return res.status(201).json({ id: Date.now(), ...user });
  }

  @DatabaseSentinel
  @Catch({
    handler: (error, context) => {
      console.log(`Database error in ${context.method}:`, error.message);
      return { error: 'Database temporarily unavailable', retry: true };
    }
  })
  async getUserFromDB(userId: string) {
    // Circuit breaker + retry automático + error handling graceful
    if (userId === 'error') {
      throw new Error('Database connection failed');
    }
    return { id: userId, name: 'User from DB' };
  }
}

// Exemplo 16: Usando injeção de dependência
class ServiceWithDependencies {

  @Inject('database')
  private db: any;

  @Inject('logger')
  private logger: any;

  @LazyInject('cache')
  private cache: any;

  @Catch({ logError: false })
  async processData(data: any) {
    this.logger.info('Processing data:', data);
    // Usa this.db, this.cache automaticamente injetados
    return this.db.save(data);
  }
}

// Registrar dependências
registerDependency('database', {
  save: (data: any) => Promise.resolve({ id: 1, ...data })
});

registerDependency('cache', {
  get: (key: string) => null,
  set: (key: string, value: any) => console.log(`Cached ${key}`)
});

registerDependency('logger', {
  info: (msg: string, ...args: any[]) => console.log(`ℹ️ ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`❌ ${msg}`, ...args)
});

// Instancia com injeção automática
const service = new ServiceWithDependencies();

// Exemplo 17: Rate Limiting personalizado
class ApiController {

  @RateLimitGuard({
    maxRequests: 10,
    windowSeconds: 60,
    keyGenerator: (target, args) => {
      const req = args[0];
      return req?.user?.id || req?.ip || 'anonymous';
    }
  })
  async sensitiveOperation(req: Request, res: Response) {
    return res.json({ message: 'Operação sensível executada' });
  }

  @Memoization({
    ttl: 300, // 5 minutos
    keyGenerator: (...args) => {
      const req = args[0];
      return `${req.method}:${req.url}:${JSON.stringify(req.query)}`;
    }
  })
  async cachedApiCall(req: Request, res: Response) {
    // Resultado cacheado por 5 minutos
    return res.json({
      data: `Dados cacheados até ${new Date(Date.now() + 300000).toISOString()}`,
      timestamp: new Date().toISOString()
    });
  }
}

// Registrar rotas com decorators
const userController = new UserController();
const apiController = new ApiController();

// Rotas usando os controllers com decorators
app.get('/profile/:id', userController.getProfile.bind(userController));
app.post('/users', userController.createUser.bind(userController));
app.get('/sensitive', apiController.sensitiveOperation.bind(apiController));
app.get('/cached', apiController.cachedApiCall.bind(apiController));

// Exemplo 18: Teste da injeção de dependência
app.get('/inject-test', async (req: Request, res: Response) => {
  try {
    const result = await service.processData({ test: 'data' });
    return res.json({ success: true, result });
  } catch (error) {
    return res.json({ success: false, error: (error as Error).message });
  }
});

// Middleware para simular erro inesperado
app.get('/unexpected-error', (req: Request, res: Response) => {
  // Simula um erro não tratado (será capturado pelo errorHandler)
  setTimeout(() => {
    throw new Error('Erro inesperado assíncrono');
  }, 100);

  res.json({ message: 'Esta resposta nunca será enviada' });
});

// Rota saudável para comparação
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'API funcionando corretamente'
  });
});

app.listen(3344, () => {
  console.log('🚀 Servidor com tratamento de erro robusto, i18n e sistema resiliente rodando na porta 3344');
  console.log('\n📋 Teste os endpoints:');

  console.log('\n✅ Funcionando:');
  console.log('  GET /health');
  console.log('  GET /users/123           → Usuário existente');
  console.log('  POST /users              → Criar usuário');
  console.log('  GET /products/laptop     → Produto existente');
  console.log('  GET /resilient-stats     → Estatísticas do sistema resiliente');

  console.log('\n❌ Exemplos de erro:');
  console.log('  GET /users/abc           → 400 Bad Request (ID inválido)');
  console.log('  GET /users/999           → 404 Not Found');
  console.log('  POST /users (sem dados)  → 400 Bad Request');
  console.log('  POST /users (email existente) → 409 Conflict');
  console.log('  GET /admin (sem token)   → 401 Unauthorized');
  console.log('  GET /db-error            → 500 Database Error');
  console.log('  GET /external-api        → 502 External API Error');
  console.log('  GET /shortcut/418        → 418 Custom Error');
  console.log('  GET /unexpected-error    → 500 Unexpected Error');

  console.log('\n🛡️ Exemplos do Sistema Resiliente:');
  console.log('  GET /database-error      → 503 Service Unavailable (com análise do HealerAgent)');
  console.log('  GET /user/123            → 200 OK (auto-corrigido de /user para /users)');
  console.log('  GET /product/laptop      → 200 OK (auto-corrigido de /product para /products)');

  console.log('\n🎨 Exemplos com Decorators Avançados:');
  console.log('  GET /profile/123         → AutoescaleSentinel (todos os decorators aplicados)');
  console.log('  POST /users              → ApiSentinel + SchemaValidator + Memoization');
  console.log('  GET /sensitive           → RateLimitGuard (10 req/min)');
  console.log('  GET /cached              → Memoization (cache de 5 min)');
  console.log('  GET /inject-test         → @Inject funcionando');

  console.log('\n🌐 Exemplos com httpErrors (compatível com Fastify):');
  console.log('  GET /http-errors/400     → 400 Bad Request');
  console.log('  GET /http-errors/401     → 401 Unauthorized');
  console.log('  GET /http-errors/404     → 404 Not Found');
  console.log('  GET /http-errors/429     → 429 Too Many Requests');
  console.log('  GET /http-errors/500     → 500 Internal Server Error');

  console.log('\n🇧🇷 Exemplos com i18n (pt-BR):');
  console.log('  GET /i18n-demo           → 402 Payment Required (em português)');
  console.log('  GET /rate-limit          → 429 Too Many Requests (rate limiting)');
  console.log('  GET /maintenance         → 503 Service Unavailable (manutenção)');

  console.log('\n🔍 Verifique os headers das respostas auto-corrigidas!');
  console.log('🎨 Teste os decorators avançados!');
  console.log('🔄 O sistema aprende e mapeia rotas automaticamente!');
});
