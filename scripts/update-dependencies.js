#!/usr/bin/env node

/**
 * Script para atualizar dependências para versões modernas
 * e verificar compatibilidade com Node.js 20+
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

console.log('🔄 Atualizando projeto para Node.js moderno...\n');

// Verifica versão do Node.js
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 20) {
  console.error('❌ Este projeto requer Node.js 20 ou superior');
  console.error(`   Versão atual: ${nodeVersion}`);
  console.error('   Por favor, atualize o Node.js antes de continuar');
  process.exit(1);
}

console.log(`✅ Node.js ${nodeVersion} detectado (compatível)\n`);

// Lista de atualizações recomendadas
const updates = [
  {
    name: 'TypeScript',
    package: 'typescript',
    from: '^5.9.3',
    to: '^5.7.2',
    reason: 'Melhor suporte para Node.js 20+ e novas features ES2022'
  },
  {
    name: 'Node Types',
    package: '@types/node',
    from: '^24.10.1',
    to: '^22.10.2',
    reason: 'Tipos corretos para Node.js 20-22 (downgrade necessário)'
  },
  {
    name: 'Cookie Types',
    package: '@types/cookie',
    from: '^0.5.1',
    to: '^0.6.0',
    reason: 'Tipos atualizados'
  },
  {
    name: 'JWT Types',
    package: '@types/jsonwebtoken',
    from: '^9.0.2',
    to: '^9.0.7',
    reason: 'Tipos atualizados'
  },
  {
    name: 'i18next',
    package: 'i18next',
    from: '^23.7.6',
    to: '^23.16.8',
    reason: 'Correções de bugs e melhorias de performance'
  },
  {
    name: 'Zod',
    package: 'zod',
    from: '^3.22.4',
    to: '^3.24.1',
    reason: 'Melhor performance e novas validações'
  }
];

console.log('📦 Atualizações recomendadas:\n');
updates.forEach(update => {
  console.log(`  ${update.name}:`);
  console.log(`    ${update.from} → ${update.to}`);
  console.log(`    💡 ${update.reason}\n`);
});

// Pergunta se deve continuar
console.log('🤔 Deseja aplicar essas atualizações? (y/N)');

// Em ambiente automatizado, aplica as atualizações
const shouldUpdate = process.env.AUTO_UPDATE === 'true' || 
                    process.argv.includes('--auto');

if (shouldUpdate) {
  console.log('🚀 Aplicando atualizações automaticamente...\n');
  
  try {
    // Atualiza dependências
    console.log('📥 Instalando dependências atualizadas...');
    execSync('npm update', { stdio: 'inherit' });
    
    console.log('\n✅ Dependências atualizadas com sucesso!');
    
    // Verifica se há vulnerabilidades
    console.log('\n🔍 Verificando vulnerabilidades de segurança...');
    try {
      execSync('npm audit --audit-level moderate', { stdio: 'inherit' });
      console.log('✅ Nenhuma vulnerabilidade crítica encontrada');
    } catch (error) {
      console.log('⚠️  Vulnerabilidades encontradas. Execute "npm audit fix" para corrigir');
    }
    
    // Compila o projeto
    console.log('\n🔨 Compilando projeto...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Compilação bem-sucedida!');
    
    console.log('\n🎉 Atualização concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('  1. Execute os testes: npm test');
    console.log('  2. Teste as novas funcionalidades: npm run demo:modern');
    console.log('  3. Verifique o benchmark: npm run benchmark');
    
  } catch (error) {
    console.error('\n❌ Erro durante a atualização:', error.message);
    console.error('\n🔧 Tente executar manualmente:');
    console.error('  npm install');
    console.error('  npm run build');
    process.exit(1);
  }
} else {
  console.log('\n📝 Para aplicar manualmente:');
  console.log('  npm update');
  console.log('  npm audit fix');
  console.log('  npm run build');
}

// Verifica funcionalidades do Node.js
console.log('\n🔍 Verificando funcionalidades disponíveis...');

const features = [
  {
    name: 'Worker Threads',
    check: () => {
      try {
        require('node:worker_threads');
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Performance Hooks',
    check: () => {
      try {
        require('node:perf_hooks');
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Web Streams',
    check: () => {
      return typeof ReadableStream !== 'undefined';
    }
  },
  {
    name: 'Fetch API',
    check: () => {
      return typeof fetch !== 'undefined';
    }
  },
  {
    name: 'Test Runner',
    check: () => {
      try {
        require('node:test');
        return true;
      } catch {
        return false;
      }
    }
  }
];

features.forEach(feature => {
  const available = feature.check();
  const status = available ? '✅' : '❌';
  console.log(`  ${status} ${feature.name}`);
});

console.log('\n🎯 Funcionalidades implementadas no projeto:');
console.log('  ✅ Upload nativo (substitui busboy/multer)');
console.log('  ✅ Worker Threads para CPU-intensive');
console.log('  ✅ Cache nativo com TTL e LRU');
console.log('  ✅ Web Streams API');
console.log('  ✅ Performance monitoring');
console.log('  ✅ Decorators para cache e monitoring');

console.log('\n📚 Documentação das melhorias:');
console.log('  📄 examples/modern-node-features.ts - Exemplos de uso');
console.log('  📄 src/middlewares/native-multipart.ts - Upload nativo');
console.log('  📄 src/workers/cpu-worker.ts - Worker Threads');
console.log('  📄 src/cache/native-cache.ts - Cache nativo');
console.log('  📄 src/observability/performance-monitor.ts - Monitoring');