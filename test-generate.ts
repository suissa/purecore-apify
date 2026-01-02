/**
 * Script de teste para geração automática de código
 */

import { ZodSchemaAnalyzer, CodeGenerator } from './src/zod-analyzer';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Simula o schema do patients
import { z } from 'zod';

const patientSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }).optional(),
});

async function testGeneration() {
  console.log('🧪 Testando geração de código para Patients...');

  // Analisa o schema
  const metadata = ZodSchemaAnalyzer.analyzeSchema(patientSchema, 'Patient');
  console.log(`📊 Schema analisado: ${metadata.fields.length} campos`);

  // Gera códigos
  const codes = {
    interface: CodeGenerator.generateInterface(metadata),
    dto: CodeGenerator.generateDTO(metadata),
    repository: CodeGenerator.generateRepository(metadata),
    service: CodeGenerator.generateService(metadata),
    controller: CodeGenerator.generateController(metadata),
    routes: CodeGenerator.generateRoutes(metadata),
    config: CodeGenerator.generateConfig(metadata),
    databaseSchema: CodeGenerator.generateDatabaseSchema(metadata),
    tests: CodeGenerator.generateTests(metadata),
    index: CodeGenerator.generateIndex(metadata)
  };

  // Cria diretório de teste
  const testDir = 'test-generated';
  if (!existsSync(testDir)) {
    mkdirSync(testDir);
  }

  // Salva arquivos
  Object.entries(codes).forEach(([name, content]) => {
    const fileName = `${name}.ts`;
    writeFileSync(join(testDir, fileName), content);
    console.log(`📝 Gerado: ${fileName}`);
  });

  console.log('✅ Geração concluída! Verifique a pasta test-generated/');
}

// Executa se chamado diretamente
if (require.main === module) {
  testGeneration().catch(console.error);
}

export { testGeneration };
