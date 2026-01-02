/**
 * Teste simples de importação
 */

console.log('🔍 Testando execução básica...');

// Teste básico primeiro
console.log('✅ Node está funcionando!');

// Teste de importação
try {
  console.log('🔍 Tentando importar...');
  const fs = require('fs');
  console.log('✅ Importação síncrona funciona!');

  // Teste de arquivo existente
  if (fs.existsSync('../src/auto-generator-ddd.ts')) {
    console.log('✅ Arquivo auto-generator-ddd.ts encontrado!');
  } else {
    console.log('❌ Arquivo auto-generator-ddd.ts não encontrado!');
  }

} catch (error) {
  console.error('❌ Erro:', error);
}

console.log('🏁 Teste concluído.');
