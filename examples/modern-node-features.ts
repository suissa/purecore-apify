/**
 * Exemplo demonstrando as funcionalidades modernas do Node.js
 * implementadas no projeto
 */

import { Apify, Router } from '../src/index.js';
import { nativeMultipart } from '../src/middlewares/native-multipart.js';
import { StorageEngineFactory } from '../src/middlewares/storage-engines.js';
import { executeCpuTask } from '../src/workers/cpu-worker.js';
import { globalCache, Cached } from '../src/cache/native-cache.js';
import { getPerformanceMonitor, Monitor } from '../src/observability/performance-monitor.js';
import { streamToBuffer, createChunkedStream } from '../src/utils/modern-streams.js';

const app = new Apify();
const router = new Router();
const monitor = getPerformanceMonitor();

// Aplica middleware de monitoramento
app.use(monitor.httpMiddleware());

// =============================================================================
// 1. Upload Nativo com Storage Engines Customizados
// =============================================================================

// Upload para disco local
router.post('/upload/disk', nativeMultipart({ 
  uploadDir: './uploads',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'text/plain'],
  storage: StorageEngineFactory.disk({
    destination: './uploads/disk',
    filename: (req, file) => `custom-${Date.now()}-${file.originalname}`
  })
}), async (req: any, res: any) => {
  const { files, body } = req;
  
  res.json({
    message: 'Upload para disco realizado com sucesso',
    storage: 'disk',
    files: files.map((f: any) => ({
      name: f.originalname,
      size: f.size,
      path: f.path
    })),
    fields: body
  });
});

// Upload para memória
router.post('/upload/memory', nativeMultipart({ 
  maxFileSize: 2 * 1024 * 1024, // 2MB
  storage: StorageEngineFactory.memory()
}), async (req: any, res: any) => {
  const { files, body } = req;
  
  res.json({
    message: 'Upload para memória realizado com sucesso',
    storage: 'memory',
    files: files.map((f: any) => ({
      name: f.originalname,
      size: f.size,
      hasBuffer: !!f.buffer,
      bufferSize: f.buffer?.length
    })),
    fields: body
  });
});

// Upload simulado para S3
router.post('/upload/s3', nativeMultipart({ 
  maxFileSize: 10 * 1024 * 1024, // 10MB
  storage: StorageEngineFactory.s3({
    bucket: 'my-app-uploads',
    region: 'us-east-1',
    key: (req, file) => `uploads/${Date.now()}/${file.originalname}`
  })
}), async (req: any, res: any) => {
  const { files, body } = req;
  
  res.json({
    message: 'Upload para S3 simulado com sucesso',
    storage: 's3',
    files: files.map((f: any) => ({
      name: f.originalname,
      size: f.size,
      location: f.location
    })),
    fields: body
  });
});

// Upload com charset customizado
router.post('/upload/charset', nativeMultipart({ 
  charset: 'latin1',
  storage: StorageEngineFactory.disk()
}), async (req: any, res: any) => {
  const { files, body } = req;
  
  res.json({
    message: 'Upload com charset latin1',
    charset: 'latin1',
    files: files.map((f: any) => ({
      name: f.originalname,
      size: f.size
    })),
    fields: body
  });
});

// =============================================================================
// 2. Processamento CPU-Intensive com Workers
// =============================================================================
router.get('/heavy-task/:complexity', async (req: any, res: any) => {
  const complexity = parseInt(req.params.complexity) || 10;
  
  try {
    const start = performance.now();
    
    // Executa em Worker Thread - não bloqueia Event Loop
    const result = await executeCpuTask('fibonacci', { n: complexity });
    
    const duration = performance.now() - start;
    
    res.json({
      result,
      complexity,
      duration: `${duration.toFixed(2)}ms`,
      workerThread: true,
      eventLoopBlocked: false
    });
  } catch (error) {
    res.status(500).json({
      error: 'Falha no processamento',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// =============================================================================
// 3. Cache Nativo com TTL e LRU
// =============================================================================
class DataService {
  @Cached(30000) // Cache por 30 segundos
  @Monitor('data-fetch') // Monitora performance
  async fetchExpensiveData(id: string): Promise<any> {
    // Simula operação custosa
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id,
      data: `Dados processados para ${id}`,
      timestamp: new Date().toISOString(),
      expensive: true
    };
  }
}

const dataService = new DataService();

router.get('/data/:id', async (req: any, res: any) => {
  const { id } = req.params;
  
  try {
    const data = await dataService.fetchExpensiveData(id);
    
    res.json({
      ...data,
      cached: globalCache.has(`DataService.fetchExpensiveData.["${id}"]`)
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar dados' });
  }
});

// =============================================================================
// 4. Streaming com Web Streams API
// =============================================================================
router.get('/stream-data/:size', async (req: any, res: any) => {
  const size = parseInt(req.params.size) || 1000;
  
  // Gera dados grandes
  const largeDataset = Array.from({ length: size }, (_, i) => ({
    id: i,
    value: Math.random(),
    timestamp: Date.now()
  }));

  // Cria stream chunked
  const stream = createChunkedStream(largeDataset, 100);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');
  
  const reader = stream.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Envia chunk como JSON
      res.write(JSON.stringify(value) + '\n');
    }
    
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Erro no streaming' });
  } finally {
    reader.releaseLock();
  }
});

// =============================================================================
// 5. Métricas e Observabilidade
// =============================================================================
router.get('/metrics', (req: any, res: any) => {
  const metrics = monitor.getAllMetrics();
  const cacheStats = globalCache.getStats();
  
  res.json({
    performance: metrics,
    cache: cacheStats,
    hotKeys: globalCache.getHotKeys(5),
    report: monitor.generateReport()
  });
});

router.get('/health', (req: any, res: any) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({
    status: 'healthy',
    uptime: `${Math.floor(uptime)}s`,
    memory: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    },
    nodeVersion: process.version,
    platform: process.platform
  });
});

// =============================================================================
// 6. Processamento de Hash com Workers
// =============================================================================
router.post('/hash', async (req: any, res: any) => {
  const { input, algorithm = 'sha256' } = req.body;
  
  if (!input) {
    return res.status(400).json({ error: 'Input é obrigatório' });
  }
  
  try {
    const hash = await executeCpuTask('hash', { input, algorithm });
    
    res.json({
      input: input.substring(0, 50) + (input.length > 50 ? '...' : ''),
      algorithm,
      hash,
      length: input.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Falha no cálculo do hash',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Registra as rotas
app.use('/api/modern', router);

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log('🚀 Servidor com funcionalidades modernas do Node.js');
  console.log(`📡 Rodando na porta ${PORT}`);
  console.log('');
  console.log('🔗 Endpoints disponíveis:');
  console.log('  POST /api/modern/upload/disk       - Upload para disco');
  console.log('  POST /api/modern/upload/memory     - Upload para memória');
  console.log('  POST /api/modern/upload/s3         - Upload para S3 (simulado)');
  console.log('  POST /api/modern/upload/charset    - Upload com charset customizado');
  console.log('  GET  /api/modern/heavy-task/:n     - CPU task com workers');
  console.log('  GET  /api/modern/data/:id          - Cache inteligente');
  console.log('  GET  /api/modern/stream-data/:n    - Streaming de dados');
  console.log('  GET  /api/modern/metrics           - Métricas de performance');
  console.log('  GET  /api/modern/health            - Health check');
  console.log('  POST /api/modern/hash              - Hash com workers');
  console.log('');
  console.log('💡 Funcionalidades demonstradas:');
  console.log('  ✅ Upload com múltiplos storage engines');
  console.log('  ✅ AsyncLocalStorage para contexto assíncrono');
  console.log('  ✅ Charset customizado para campos de texto');
  console.log('  ✅ Worker Threads para CPU-intensive');
  console.log('  ✅ Cache nativo com TTL e LRU');
  console.log('  ✅ Web Streams API');
  console.log('  ✅ Performance monitoring nativo');
  console.log('  ✅ Decorators para cache e monitoring');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Encerrando servidor...');
  monitor.destroy();
  globalCache.destroy();
  process.exit(0);
});