export interface CacheStrategy {
    get(key: string): Promise<any | undefined>;
    set(key: string, value: any, ttl?: number): Promise<void>;
}

export class MemoryCacheStrategy implements CacheStrategy {
    private cache = new Map<string, { val: any, exp: number }>();
    async get(key: string) {
        const data = this.cache.get(key);
        if (!data) return undefined;
        if (data.exp < Date.now()) {
            this.cache.delete(key);
            return undefined;
        }
        return data.val;
    }
    async set(key: string, value: any, ttl: number = 60000) {
        this.cache.set(key, { val: value, exp: Date.now() + ttl });
    }
}

export function Cache(strategy: CacheStrategy = new MemoryCacheStrategy(), ttl: number = 60000, keyGen?: (...args: any[]) => string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const key = keyGen ? keyGen(...args) : `${propertyKey}:${JSON.stringify(args)}`;
            const cached = await strategy.get(key);
            if (cached !== undefined) return cached;

            const result = await originalMethod.apply(this, args);
            await strategy.set(key, result, ttl);
            return result;
        };
        return descriptor;
    };
}
