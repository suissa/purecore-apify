/**
 * Script para executar a geração de schemas Zod
 * Wrapper JavaScript para executar TypeScript
 */

async function runGenerator() {
  try {
    console.log('🚀 Executando geração de schemas Zod...\n');

    // Importa dinamicamente o módulo TypeScript
    const { ZodSchemaGenerator, EXAMPLE_INTERFACES } = await import('./src/zod-interface-generator.js');

    console.log('📦 Módulo importado com sucesso');
    console.log('📊 Interfaces disponíveis:', Object.keys(EXAMPLE_INTERFACES));

    const generator = new ZodSchemaGenerator();

    // Gera schemas para todas as interfaces de exemplo
    console.log('🏗️ Iniciando geração de schemas...');
    generator.generateSchemas(EXAMPLE_INTERFACES, './generated-schemas');

    console.log('\n🎉 Geração concluída com sucesso!');
    console.log('📂 Verifique a pasta ./generated-schemas');

  } catch (error) {
    console.error('❌ Erro ao executar geração:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runGenerator();
