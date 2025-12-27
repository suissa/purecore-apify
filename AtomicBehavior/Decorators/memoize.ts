interface CacheEntry {
  value: any;
  expiry: number;
}

export function Memoize(ttlMs?: number, keyResolver?: (...args: any[]) => string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cacheKey = Symbol(`__memoize_cache_${propertyKey}__`);

    descriptor.value = function (...args: any[]) {
      // Initialize cache for the instance if not exists
      if (!(this as any)[cacheKey]) {
        (this as any)[cacheKey] = new Map<string, CacheEntry>();
      }
      const cache: Map<string, CacheEntry> = (this as any)[cacheKey];

      const key = keyResolver ? keyResolver(...args) : JSON.stringify(args);

      if (cache.has(key)) {
        const entry = cache.get(key)!;
        if (!ttlMs || Date.now() < entry.expiry) {
          return entry.value;
        }
        cache.delete(key);
      }

      const result = originalMethod.apply(this, args);
      const expiry = ttlMs ? Date.now() + ttlMs : Infinity;
      cache.set(key, { value: result, expiry });

      return result;
    };

    return descriptor;
  };
}
