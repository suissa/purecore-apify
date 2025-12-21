Specification: The Universal Agentic Router

Status: Draft / Experimental

Version: 1.0.0

Context: Full Agent Stack Initiative

Package: @purecore/apify

1. Abstract

O Universal Router é um mecanismo de roteamento de alta performance, zero-dependency e agnóstico de runtime (Node.js/Bun), projetado para servir como a espinha dorsal de aplicações da Full Agent Stack.

Diferente de roteadores tradicionais (Express, Fastify) que focam apenas em "ligar URLs a funções", o Universal Router é desenhado para:

Automação Estrutural: Eliminar boilerplate via File System Routing estrito.

Inteligência Nativa: Integrar nativamente o padrão AON (Adaptive Observability Negotiation).

Abstração Universal: Normalizar requisições e respostas para que o código de negócio seja imune a mudanças de infraestrutura subjacente.

2. Core Philosophy

2.1. Convention over Configuration

O roteador assume que a estrutura de pastas dita a arquitetura da API. Não há arquivos de "manifesto de rotas". A presença de um arquivo em um local específico é a declaração de sua existência.

2.2. The "Glass Box" Default

O roteador não é um tubo opaco. Ele é projetado para expor seu estado interno (via AON) por padrão, permitindo que agentes de IA e interfaces conversacionais "vejam" o processamento.

3. Routing Mechanism

3.1. File System Structure

O roteador escanreia recursivamente o diretório alvo (padrão: src/modules) e mapeia rotas baseadas na hierarquia de pastas.

src/
└── modules/
    ├── users/              -> Grupo de Rotas
    │   └── routes.ts       -> GET /users, POST /users
    ├── products/
    │   └── routes.ts       -> GET /products
    └── checkout/
        └── routes.ts       -> POST /checkout


3.2. Automatic Prefixing

Por padrão, todas as rotas são prefixadas com /api/v1 (configurável), seguido pelo nome da pasta do módulo.

Arquivo: src/modules/users/routes.ts

Rota Gerada: /api/v1/users

3.3. Hot-Path Optimization

O roteador compila a árvore de rotas em uma estrutura de busca otimizada (Radix Tree ou Hash Map plano dependendo da configuração) na inicialização, garantindo complexidade O(1) ou O(log n) para resolução de rotas, sem overhead de leitura de disco em tempo de execução.

4. The Universal Adapter

Para garantir a promessa de "Zero Lock-in", o roteador implementa uma camada de adaptação que normaliza os objetos de entrada e saída.

4.1. Standard Request & Response

O desenvolvedor interage com interfaces puras, não com objetos nativos do Node/Bun.

interface UniversalContext {
  // Dados normalizados
  body: any;
  query: Record<string, string>;
  params: Record<string, string>;
  headers: IncomingHttpHeaders;
  
  // Agente de Observabilidade (Injetado)
  agent: {
    emit: (event: AONEvent) => void;
    isStreaming: boolean;
  };
  
  // Métodos de Resposta Universal
  send: (data: any, status?: number) => void;
  stream: (data: any) => void;
}


5. Agentic Integration (AON Native)

O Universal Router é o primeiro roteador do mercado a implementar o Handshake AON no nível de infraestrutura.

5.1. Negotiation Middleware

Antes de executar qualquer lógica de negócio, o roteador inspeciona o header Accept:

Detecção: Se Accept: application/x-ndjson, ativa a flag context.agent.isStreaming = true.

Preparação: Escreve headers de resposta (Transfer-Encoding: chunked) imediatamente.

Heartbeat: Inicia opcionalmente um keep-alive se a rota for marcada como @LongRunning.

5.2. Auto-Healer Injection

O roteador envolve o handler da rota em um bloco try/catch inteligente que invoca o AutoHealer.

Fluxo Padrão: Erro -> Catch -> Router envia 500.

Fluxo Universal Router: Erro -> Catch -> AutoHealer.heal(error) -> Retry/Fix -> Sucesso ou Erro Final.

6. Decorator System

O roteador suporta nativamente Programação Orientada a Aspectos (AOP) via decorators, sem precisar de transpilers complexos ou frameworks pesados como NestJS.

6.1. Execution Order (The Onion Model)

A execução dos decorators segue uma ordem estrita de fora para dentro para garantir segurança:

@Security (Rate Limit, Helmet, CORS)

@Auth (JWT Guard, Roles)

@Observability (Tracing, Metrics, Logs)

@Resilience (Circuit Breaker, Bulkhead)

@Cache (Smart Cache)

Business Logic (Sua Função)

7. Example Implementation

Exemplo de como o roteador é instanciado e utilizado na Full Agent Stack.

import { Apify, Get, Post, Body, Security } from '@purecore/apify';

// 1. Inicialização (Zero Config)
const app = new Apify({
  root: './src/modules', // Onde estão os arquivos
  prefix: '/api/v1',
  agentic: true // Ativa AON por padrão
});

// 2. Definição de Rota (Dentro de src/modules/users/routes.ts)
export class UsersController {
  
  @Post('/')
  @Security({ level: 'high' }) // WAF Nativo
  async create(@Body() data: CreateUserDto, ctx: UniversalContext) {
    
    // Opcional: Emitir pensamento para o Agente
    ctx.agent.emit({ 
      type: 'intent_analysis', 
      msg: 'Validating user strictly...' 
    });

    return db.users.create(data);
  }
}

// 3. Start
app.listen(3344, () => {
  console.log('🚀 Universal Router active in Agent Mode');
});


8. Compliance & Compatibility

Runtime: Node.js >= 18, Bun >= 1.0.

Protocolos: HTTP/1.1 (suporte a HTTP/2 planejado).

Segurança: Implementa nativamente OWASP Top 10 mitigation headers.

Documento gerado para a Full Agent Stack Initiative.