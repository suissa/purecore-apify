/**
 * Sistema de Cache Nativo usando Map e WeakRef (Node.js 14+)
 * Com TTL, LRU e memory-aware cleanup
 */

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  checkInterval?: number;
  maxMemoryUsage?: number; // em bytes
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export class NativeCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private accessOrder = new Map<K, number>(); // Para LRU
  private options: Required<CacheOptions>;
  private cleanupTimer?: NodeJS.Timeout;
  private accessCounter = 0;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 5 minutos
      checkInterval: options.checkInterval || 60 * 1000, // 1 minuto
      maxMemoryUsage: options.maxMemoryUsage || 100 * 1024 * 1024 // 100MB
    };

    this.startCleanupTimer();
  }

  set(key: K, value: V, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.options.defaultTTL);
    const size = this.calculateSize(value);

    // Remove entrada existente se houver
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    // Verifica limites antes de adicionar
    this.enforceMemoryLimits();
    this.enforceSizeLimits();

    const entry: CacheEntry<V> = {
      value,
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now(),
      size
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;

    // Verifica se expirou
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }

    // Atualiza estatísticas de acesso
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.accessOrder.set(key, ++this.accessCounter);

    return entry.value;
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) return false;

    // Verifica se expirou
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  size(): number {
    return this.cache.size;
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const expired = entries.filter(entry => Date.now() > entry.expiresAt).length;

    return {
      size: this.cache.size,
      totalMemoryUsage: totalSize,
      expiredEntries: expired,
      hitRate: this.calculateHitRate(),
      averageAccessCount: entries.reduce((sum, entry) => sum + entry.accessCount, 0) / entries.length || 0
    };
  }

  /**
   * Força limpeza de entradas expiradas
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Obtém as chaves mais acessadas
   */
  getHotKeys(limit: number = 10): K[] {
    return Array.from(this.cache.entries())
      .sort(([, a], [, b]) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(([key]) => key);
  }

  /**
   * Implementa cache com callback para valores não encontrados
   */
  async getOrSet<T extends V>(
    key: K, 
    factory: () => Promise<T> | T, 
    ttl?: number
  ): Promise<T> {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing as T;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  private calculateSize(value: V): number {
    try {
      // Estimativa simples do tamanho em bytes
      const str = JSON.stringify(value);
      return Buffer.byteLength(str, 'utf8');
    } catch {
      // Fallback para objetos não serializáveis
      return 1024; // 1KB estimado
    }
  }

  private enforceMemoryLimits(): void {
    const stats = this.getStats();
    
    if (stats.totalMemoryUsage > this.options.maxMemoryUsage) {
      // Remove entradas menos acessadas até ficar dentro do limite
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

      let removedSize = 0;
      const targetReduction = stats.totalMemoryUsage - this.options.maxMemoryUsage;

      for (const [key, entry] of entries) {
        this.delete(key);
        removedSize += entry.size;
        
        if (removedSize >= targetReduction) break;
      }
    }
  }

  private enforceSizeLimits(): void {
    if (this.cache.size >= this.options.maxSize) {
      // Remove entradas LRU (Least Recently Used)
      const sortedByAccess = Array.from(this.accessOrder.entries())
        .sort(([, a], [, b]) => a - b);

      const toRemove = Math.ceil(this.options.maxSize * 0.1); // Remove 10%
      
      for (let i = 0; i < toRemove && i < sortedByAccess.length; i++) {
        const [key] = sortedByAccess[i];
        this.delete(key);
      }
    }
  }

  private calculateHitRate(): number {
    // Implementação simplificada - em produção seria mais sofisticada
    const entries = Array.from(this.cache.values());
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    return totalAccesses > 0 ? (totalAccesses / (totalAccesses + this.cache.size)) : 0;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.checkInterval);

    // Permite que o processo termine mesmo com o timer ativo
    this.cleanupTimer.unref();
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

/**
 * Cache singleton global
 */
const globalCache = new NativeCache<string, any>({
  maxSize: 5000,
  defaultTTL: 10 * 60 * 1000, // 10 minutos
  maxMemoryUsage: 50 * 1024 * 1024 // 50MB
});

export { globalCache };

/**
 * Decorator para cache automático de métodos
 */
export function Cached(ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}.${propertyKey}.${JSON.stringify(args)}`;
      
      return globalCache.getOrSet(cacheKey, () => {
        return originalMethod.apply(this, args);
      }, ttl);
    };

    return descriptor;
  };
}