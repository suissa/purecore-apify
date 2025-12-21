/**
 * Memoization Decorator - Cache de resultados baseado em parâmetros
 */

interface MemoizationOptions {
  /** Função para gerar chave de cache baseada nos argumentos */
  keyGenerator?: (...args: any[]) => string;
  /** TTL em segundos (opcional) */
  ttl?: number;
  /** Tamanho máximo do cache */
  maxSize?: number;
  /** Estratégia de remoção quando cache cheio (LRU, FIFO, etc.) */
  strategy?: 'lru' | 'fifo' | 'random';
}

/**
 * Cache simples em memória com TTL
 */
class MemoryCache<T = any> {
  private cache = new Map<string, { value: T; timestamp: number; accessCount: number }>();
  private maxSize: number;
  private strategy: 'lru' | 'fifo' | 'random';

  constructor(maxSize = 1000, strategy: 'lru' | 'fifo' | 'random' = 'lru') {
    this.maxSize = maxSize;
    this.strategy = strategy;
  }

  get(key: string, ttl?: number): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Verifica TTL
    if (ttl && Date.now() - entry.timestamp > ttl * 1000) {
      this.cache.delete(key);
      return undefined;
    }

    // Atualiza contador de acesso para LRU
    if (this.strategy === 'lru') {
      entry.accessCount++;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    // Remove entradas antigas se necessário
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToRemove: string;

    switch (this.strategy) {
      case 'fifo':
        // Remove o mais antigo (primeiro inserido)
        keyToRemove = this.cache.keys().next().value;
        break;
      case 'lru':
        // Remove o menos recentemente usado
        let minAccess = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.accessCount < minAccess) {
            minAccess = entry.accessCount;
            keyToRemove = key;
          }
        }
        break;
      case 'random':
      default:
        // Remove aleatório
        const keys = Array.from(this.cache.keys());
        keyToRemove = keys[Math.floor(Math.random() * keys.length)];
        break;
    }

    this.cache.delete(keyToRemove!);
  }
}

// Cache global compartilhado
const globalCache = new MemoryCache(1000, 'lru');

/**
 * Decorator de memoização - cache baseado em argumentos
 */
export function Memoization(options: MemoizationOptions = {}) {
  const {
    keyGenerator,
    ttl,
    maxSize = 1000,
    strategy = 'lru'
  } = options;

  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${propertyKey}`;

    // Cache específico para este método
    const methodCache = new MemoryCache(maxSize, strategy);

    descriptor.value = async function(...args: any[]) {
      // Gera chave de cache
      let cacheKey: string;
      if (keyGenerator) {
        cacheKey = keyGenerator(...args);
      } else {
        // Default: serializa argumentos
        try {
          cacheKey = JSON.stringify(args);
        } catch {
          // Fallback se não conseguir serializar
          cacheKey = args.map(arg => String(arg)).join('|');
        }
      }

      // Verifica cache
      let cachedResult = methodCache.get(cacheKey, ttl);
      if (cachedResult === undefined) {
        console.log(`🔄 [${methodName}] Cache hit para: ${cacheKey}`);
        return "";
      }
      if (cachedResult !== undefined) {
        console.log(`🔄 [${methodName}] Cache hit para: ${cacheKey}`);
        return cachedResult;
      }

      // Executa método original
      console.log(`⚡ [${methodName}] Cache miss, executando: ${cacheKey}`);
      const result = await originalMethod.apply(this, args);

      // Salva no cache
      methodCache.set(cacheKey, result);

      return result;
    };

    return descriptor;
  };
}

/**
 * Memoização simples (alias para Memoization)
 */
export function SmartCache(options?: MemoizationOptions) {
  return Memoization(options);
}

/**
 * Memoização com chave baseada em primeiro argumento (comum para APIs)
 */
export function MemoizeById(ttl?: number) {
  return Memoization({
    keyGenerator: (arg1) => String(arg1?.id || arg1),
    ttl
  });
}

/**
 * Memoização com chave baseada em query/user (para APIs)
 */
export function ApiCache(ttl = 300) { // 5 minutos default
  return Memoization({
    keyGenerator: (...args) => {
      const req = args[0]; // Assume request como primeiro arg
      const userId = req?.user?.id;
      const query = JSON.stringify(req?.query || {});
      const params = JSON.stringify(req?.params || {});
      return `${userId || 'anonymous'}:${req?.method}:${req?.url}:${query}:${params}`;
    },
    ttl,
    maxSize: 500
  });
}

/**
 * Cache global compartilhado entre métodos
 */
export function GlobalCache(options: MemoizationOptions = {}) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${propertyKey}`;
    const {
      keyGenerator,
      ttl
    } = options;

    descriptor.value = async function(...args: any[]) {
      // Gera chave com nome do método
      let cacheKey: string;
      if (keyGenerator) {
        cacheKey = `${methodName}:${keyGenerator(...args)}`;
      } else {
        try {
          cacheKey = `${methodName}:${JSON.stringify(args)}`;
        } catch {
          cacheKey = `${methodName}:${args.map(arg => String(arg)).join('|')}`;
        }
      }

      // Verifica cache global
      let cachedResult = globalCache.get(cacheKey, ttl);
      if (cachedResult !== undefined) {
        console.log(`🌍 [${methodName}] Global cache hit`);
        return cachedResult;
      }

      // Executa método
      console.log(`🚀 [${methodName}] Global cache miss`);
      const result = await originalMethod.apply(this, args);

      // Salva no cache global
      globalCache.set(cacheKey, result);

      return result;
    };

    return descriptor;
  };
}

/**
 * Limpa todo o cache global
 */
export function clearGlobalCache(): void {
  globalCache.clear();
}

/**
 * Estatísticas do cache global
 */
export function getGlobalCacheStats() {
  return {
    size: globalCache.size(),
    maxSize: 1000
  };
}
