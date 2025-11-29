import { Apify } from '../src/index.js';

const app = new Apify();

// O prefixo padrão '/api/v1' já está configurado automaticamente
// E os módulos em src/modules são carregados automaticamente

app.listen(3344, () => {
  console.log('🚀 Servidor rodando na porta 3344');
  console.log('📁 Módulos carregados automaticamente:');
  console.log('👥 Users:');
  console.log('   • GET /api/v1/users - Lista usuários');
  console.log('   • GET /api/v1/users/:id - Busca usuário por ID');
  console.log('   • POST /api/v1/users - Cria usuário');
  console.log('   • PUT /api/v1/users/:id - Atualiza usuário');
  console.log('   • DELETE /api/v1/users/:id - Remove usuário');
  console.log('📦 Products:');
  console.log('   • GET /api/v1/products - Lista produtos');
  console.log('   • GET /api/v1/products/:id - Busca produto por ID');
  console.log('   • POST /api/v1/products - Cria produto');
});
