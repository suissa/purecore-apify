import { randomBytes, createHash } from 'node:crypto';
import { Apify } from './index';
import { Request, Response, NextFunction } from './types';
import { Router } from './router';
const app = new Router();
const PORT = 3344;
const appify = new Apify();
// =============================================================================
// Cenario 2: JSON Serialization (Memória e CPU leve)
// Testa a velocidade de alocar objetos e transformar em string (JSON.stringify)
// =============================================================================
const STATIC_DATA = {
  id: 1,
  title: 'Benchmark Test',
  description: 'Lorem ipsum dolor sit amet '.repeat(10), // Texto médio
  tags: ['performance', 'node', 'http', 'benchmark'],
  meta: {
    views: 1000,
    active: true
  }
};

app.get('/api/json', (req: Request, res: Response) => {
  res.json(STATIC_DATA);
});

// =============================================================================
// Cenario 3: Roteamento Dinâmico (Regex Parsing)
// Testa a eficiência do extrator de URL params (:category, :id)
// =============================================================================
app.get('/api/products/:category/:id', (req: Request, res: Response) => {
  const { category, id } = req.params;
  const { sort } = req.query;

  res.json({
    id,
    category,
    sort_mode: sort || 'default',
    process_id: process.pid
  });
});

// =============================================================================
// Cenario 4: I/O Simulado (Assincronia e Event Loop)
// Simula uma query de banco de dados ou chamada externa que leva 50ms.
// O Node deve aguentar MILHARES dessas simultâneas sem bloquear.
// =============================================================================
app.get('/api/io-wait', async (req: Request, res: Response) => {
  // Simula delay de 50ms (ex: Postgres query)
  await new Promise(resolve => setTimeout(resolve, 50));
  
  res.json({ 
    status: 'done', 
    waited: '50ms' 
  });
});

// =============================================================================
// Cenario 5: CPU Intensive (Usando Worker Threads - Não bloqueia Event Loop)
// MODERNO: Usa Worker Threads para não bloquear a thread principal
// =============================================================================
import { executeCpuTask } from './workers/cpu-worker.js';

app.get('/api/cpu-heavy/:level', async (req: Request, res: Response) => {
  const level = parseInt(req.params.level) || 10;
  
  // Nível de segurança para não travar seu PC no benchmark
  const n = Math.min(level, 35); 
  
  const start = performance.now();
  
  try {
    // Executa Fibonacci em Worker Thread (não bloqueia Event Loop)
    const result = await executeCpuTask('fibonacci', { n });
    const end = performance.now();

    res.json({
      operation: 'fibonacci',
      input: n,
      result: result,
      time_taken: `${(end - start).toFixed(4)}ms`,
      worker_thread: true
    });
  } catch (error) {
    res.status(500).json({
      error: 'CPU task failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// =============================================================================
// Cenario 6: Processamento de Dados (Cripto + Alocação)
// Gera dados randômicos na hora. Testa throughput de memória.
// =============================================================================
app.get('/api/crypto', (req: Request, res: Response) => {
  const randomData = randomBytes(1024).toString('hex'); // 1KB de hex
  const hash = createHash('sha256').update(randomData).digest('hex');

  res.json({
    hash,
    data_length: randomData.length
  });
});

// =============================================================================
// Cenario 7: POST Payload (Body Parsing)
// Testa a leitura de buffers de entrada e processamento do JSON recebido.
// =============================================================================
app.post('/api/echo', (req: Request, res: Response) => {
  const body = (req as any).body;
  
  // Simula validação simples
  if (!body) {
    return res.status(400).json({ error: 'No body' });
  }

  res.status(201).json({
    received_at: new Date().toISOString(),
    payload_echo: body,
    size: JSON.stringify(body).length
  });
});

// Inicia o servidor
appify.listen(PORT, () => {
  console.log('=================================================');
  console.log(`🚀 SERVIDOR DE BENCHMARK RODANDO NA PORTA ${PORT}`);
  console.log('=================================================');
  console.log('Rotas disponíveis para teste:');
  console.log('  GET  /api/fast                (Raw Speed)');
  console.log('  GET  /api/json                (Standard JSON)');
  console.log('  GET  /api/products/tech/123   (URL Params)');
  console.log('  GET  /api/io-wait             (Simula DB - 50ms)');
  console.log('  GET  /api/cpu-heavy/30        (CPU Block - Cuidado!)');
  console.log('  GET  /api/crypto              (Memory/Crypto)');
  console.log('  POST /api/echo                (Body Parsing)');
  console.log('=================================================');
});