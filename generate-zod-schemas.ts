#!/usr/bin/env tsx

/**
 * Script para gerar schemas Zod a partir de interfaces TypeScript
 * Executa a geração completa dos schemas para Product, Stock, Order, Payment
 */

import { ZodSchemaGenerator, EXAMPLE_INTERFACES } from './src/zod-interface-generator.js';
import { mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

function generateSchemas(): void {
  console.log('🚀 GERANDO SCHEMAS ZOD COMPLETOS\n');

  const outputPath = './generated-schemas';

  // Garante que o diretório existe
  const fullPath = resolve(outputPath);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Diretório criado: ${fullPath}`);
  }

  const generator = new ZodSchemaGenerator();

  // Gera schemas para todas as interfaces de exemplo
  generator.generateSchemas(EXAMPLE_INTERFACES, outputPath);

  console.log('\n🎉 GERAÇÃO CONCLUÍDA!');
  console.log(`📂 Schemas salvos em: ${outputPath}`);
  console.log('\n📄 Arquivos gerados:');
  console.log('• product.schema.ts');
  console.log('• stock.schema.ts');
  console.log('• order.schema.ts');
  console.log('• payment.schema.ts');
  console.log('• relationships.ts');

  console.log('\n💡 Como usar:');
  console.log('import { ProductValidator } from "./generated-schemas/product.schema";');
  console.log('import { validateProductName, validateProductPrice } from "./generated-schemas/product.schema";');

  console.log('\n🔗 Relacionamentos:');
  console.log('Product → Stock (hasMany)');
  console.log('Product → Order (manyToMany via OrderItem)');
  console.log('Order → Payment (hasOne)');
  console.log('Order → Customer (belongsTo)');
  console.log('Payment → Customer (belongsTo)');
}

// Executa se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSchemas();
}

export default generateSchemas;
