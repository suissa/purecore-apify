/**
 * Exemplo simples de uma API com apenas uma rota de Webhook
 */

import { Api } from '../src/index.js';

// Inicializa a aplicação
const app = new Api();

// Rota GET para verificação do webhook
app.get('/webhook', async (req, res) => {
  console.log('🔍 [GET] Verificação do webhook acessada');
  
  res.json({ 
    success: true, 
    message: 'Endpoint de webhook está ativo e aguardando eventos.',
    timestamp: new Date().toISOString()
  });
});

// Rota POST para receber os eventos do webhook
app.post('/webhook', async (req, res) => {
  console.log('📥 [POST] Evento de webhook recebido!');
  
  try {
    const payload = req.body;
    const headers = req.headers;

    // Log básico para debug do payload recebido
    console.log('Headers principais:', {
      'content-type': headers['content-type'],
      'user-agent': headers['user-agent']
    });
    
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Aqui você adicionaria a lógica para processar o webhook (ex: Evolution API, Stripe, etc.)

    // Responde com sucesso
    res.status(200).json({ 
      success: true, 
      message: 'Webhook recebido e processado com sucesso' 
    });

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao processar o webhook' 
    });
  }
});

// Define a porta
const PORT = process.env.PORT || 3333;

// Inicia o servidor
app.listen(PORT, () => {
  console.log('🚀 ==========================================');
  console.log('🌐 Webhook Receiver API Iniciada');
  console.log(`📡 Servidor rodando na porta ${PORT}`);
  console.log('==========================================\n');
  console.log('Endpoints disponíveis:');
  console.log(`   GET   http://localhost:${PORT}/webhook  (Verificação)`);
  console.log(`   POST  http://localhost:${PORT}/webhook  (Recebimento de Dados)\n`);
  console.log('Para testar:');
  console.log(`   curl -X GET http://localhost:${PORT}/webhook`);
  console.log(`   curl -X POST http://localhost:${PORT}/webhook -H "Content-Type: application/json" -d '{"event":"test","data":123}'`);
  console.log('');
});
