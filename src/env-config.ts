/**
 * Configuração padrão de ambiente para @purecore/apify
 * Este arquivo contém todas as configurações padrão que ativam TODOS os decorators
 */

export const DEFAULT_ENV_CONFIG = `# =========================================
# @purecore/apify - Configuração Padrão
# =========================================
# Esta configuração ativa TODOS os decorators por padrão
# A biblioteca vem "completa" sem que o dev precise fazer nada

# =========================================
# AUTENTICAÇÃO JWT
# =========================================
# Segredo para tokens JWT (obrigatório)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# =========================================
# SISTEMA NO_AUTH
# =========================================
# Rotas que NÃO precisam de autenticação
# Formato: "METHOD /path, METHOD /path"
# Sempre excluir health e login por padrão
NO_AUTH="GET /health, POST /login, GET /status"

# =========================================
# CONFIGURAÇÕES DE RESILIÊNCIA
# =========================================
# Circuit Breaker - Threshold de falhas antes de abrir
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5

# Circuit Breaker - Tempo para tentar reset (ms)
CIRCUIT_BREAKER_RESET_TIMEOUT=10000

# Timeout padrão para requisições (ms)
TIMEOUT_DEFAULT_MS=30000

# Timeout máximo para retries (ms)
TIMEOUT_MAX_MS=60000

# Número máximo de tentativas de retry
TIMEOUT_RETRY_ATTEMPTS=3

# =========================================
# CONFIGURAÇÕES DE CACHE
# =========================================
# TTL padrão do cache (segundos)
CACHE_DEFAULT_TTL=300

# =========================================
# CONFIGURAÇÕES DE OBSERVABILIDADE
# =========================================
# Habilitar logs detalhados (true/false)
ENABLE_DETAILED_LOGS=true

# Habilitar métricas (true/false)
ENABLE_METRICS=true

# Habilitar traces (true/false)
ENABLE_TRACES=true

# =========================================
# CONFIGURAÇÕES DE SEGURANÇA
# =========================================
# Habilitar proteção XSS (true/false)
ENABLE_XSS_PROTECTION=true

# Header para JWT (padrão: authorization)
JWT_HEADER_NAME=authorization

# =========================================
# CONFIGURAÇÕES HELMET.JS (SEGURANÇA HTTP)
# =========================================
# Habilitar Content Security Policy (true/false)
ENABLE_CSP=true

# Habilitar Strict Transport Security - HSTS (true/false)
ENABLE_HSTS=true

# Max age para HSTS em segundos (31536000 = 1 ano)
HSTS_MAX_AGE=31536000

# Incluir subdomínios no HSTS (true/false)
HSTS_INCLUDE_SUBDOMAINS=true

# Habilitar preload no HSTS (true/false)
HSTS_PRELOAD=false

# Política de referrer (no-referrer, strict-origin-when-cross-origin, etc.)
REFERRER_POLICY=strict-origin-when-cross-origin

# Política X-Frame-Options (SAMEORIGIN, DENY)
X_FRAME_OPTIONS=SAMEORIGIN

# Habilitar X-Content-Type-Options (true/false)
ENABLE_X_CONTENT_TYPE_OPTIONS=true

# Habilitar X-XSS-Protection (true/false)
ENABLE_X_XSS_PROTECTION=true

# Habilitar remoção X-Powered-By (true/false)
ENABLE_X_POWERED_BY_REMOVAL=true

# Habilitar Cross-Origin policies (true/false)
ENABLE_CROSS_ORIGIN_POLICIES=true

# Política COEP (require-corp, credentialless)
COEP_POLICY=require-corp

# Política COOP (same-origin, same-origin-allow-popups, unsafe-none)
COOP_POLICY=same-origin

# Política CORP (same-origin, same-site, cross-origin)
CORP_POLICY=same-origin

# =========================================
# CONFIGURAÇÕES DO WS RETRY CHANNEL
# =========================================
# Habilitar canal WS para retries paralelos (true/false)
ENABLE_WS_RETRY_CHANNEL=true

# Timeout para processamentos paralelos (ms)
WS_RETRY_TIMEOUT=5000

# =========================================
# CONFIGURAÇÕES DE BANCO DE DADOS
# =========================================
# String de conexão do banco (exemplo MongoDB)
# DATABASE_URL=mongodb://localhost:27017/apify

# =========================================
# CONFIGURAÇÕES DE LOG
# =========================================
# Nível de log (debug, info, warn, error)
LOG_LEVEL=info

# Arquivo de log (opcional)
# LOG_FILE=logs/apify.log

# =========================================
# CONFIGURAÇÕES DE MONITORAMENTO
# =========================================
# URL do serviço de métricas (opcional)
# METRICS_URL=http://localhost:9090

# URL do serviço de traces (opcional)
# TRACES_URL=http://localhost:9411

# =========================================
# CONFIGURAÇÕES DE PERFORMANCE
# =========================================
# Número máximo de conexões simultâneas
MAX_CONNECTIONS=1000

# Timeout de conexão (ms)
CONNECTION_TIMEOUT=5000

# =========================================
# VARIÁVEIS DE AMBIENTE
# =========================================
# Ambiente (development, staging, production)
NODE_ENV=development

# Porta do servidor
PORT=3344

# Prefixo das APIs
API_PREFIX=/api/v1`;

/**
 * Função utilitária para gerar arquivo .env com configurações padrão
 */
export function generateDefaultEnvConfig(): string {
  return DEFAULT_ENV_CONFIG;
}

/**
 * Configurações padrão extraídas das variáveis de ambiente
 */
export const getDefaultConfig = () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    headerName: process.env.JWT_HEADER_NAME || 'authorization'
  },
  noAuth: {
    routes: process.env.NO_AUTH ? process.env.NO_AUTH.split(',').map(r => r.trim()) : ['GET /health', 'POST /login', 'GET /status']
  },
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5'),
    resetTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '10000')
  },
  timeout: {
    defaultMs: parseInt(process.env.TIMEOUT_DEFAULT_MS || '30000'),
    maxTimeoutMs: parseInt(process.env.TIMEOUT_MAX_MS || '60000'),
    retryAttempts: parseInt(process.env.TIMEOUT_RETRY_ATTEMPTS || '3')
  },
  cache: {
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300')
  },
  observability: {
    enableDetailedLogs: process.env.ENABLE_DETAILED_LOGS !== 'false',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    enableTraces: process.env.ENABLE_TRACES !== 'false'
  },
  security: {
    enableXssProtection: process.env.ENABLE_XSS_PROTECTION !== 'false'
  },
  helmet: {
    enableCSP: process.env.ENABLE_CSP !== 'false',
    enableHSTS: process.env.ENABLE_HSTS !== 'false',
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'),
    hstsIncludeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
    hstsPreload: process.env.HSTS_PRELOAD === 'true',
    referrerPolicy: process.env.REFERRER_POLICY || 'strict-origin-when-cross-origin',
    xFrameOptions: process.env.X_FRAME_OPTIONS || 'SAMEORIGIN',
    enableXContentTypeOptions: process.env.ENABLE_X_CONTENT_TYPE_OPTIONS !== 'false',
    enableXXssProtection: process.env.ENABLE_X_XSS_PROTECTION !== 'false',
    enableXPoweredByRemoval: process.env.ENABLE_X_POWERED_BY_REMOVAL !== 'false',
    enableCrossOriginPolicies: process.env.ENABLE_CROSS_ORIGIN_POLICIES !== 'false',
    coepPolicy: process.env.COEP_POLICY || 'require-corp',
    coopPolicy: process.env.COOP_POLICY || 'same-origin',
    corpPolicy: process.env.CORP_POLICY || 'same-origin'
  },
  wsRetryChannel: {
    enabled: process.env.ENABLE_WS_RETRY_CHANNEL !== 'false',
    timeout: parseInt(process.env.WS_RETRY_TIMEOUT || '5000')
  }
});

export default DEFAULT_ENV_CONFIG;
