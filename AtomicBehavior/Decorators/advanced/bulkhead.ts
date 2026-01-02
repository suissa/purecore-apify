export function Bulkhead(limit: number) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        const activeCountKey = Symbol(`__bulkhead_count_${propertyKey}__`);
        const queueKey = Symbol(`__bulkhead_queue_${propertyKey}__`);

        descriptor.value = async function (...args: any[]) {
            if (!(this as any)[activeCountKey]) (this as any)[activeCountKey] = 0;
            if (!(this as any)[queueKey]) (this as any)[queueKey] = [];

            if ((this as any)[activeCountKey] >= limit) {
                // Determine if we should queue or reject. For this complex version, let's reject to fail fast
                // or we could return a Promise that waits. Let's implement queueing.
                return new Promise((resolve, reject) => {
                    (this as any)[queueKey].push({ resolve, reject, args, context: this });
                });
            }

            (this as any)[activeCountKey]++;

            const run = async (args: any[]) => {
                try {
                    return await originalMethod.apply(this, args);
                } finally {
                    (this as any)[activeCountKey]--;
                    if ((this as any)[queueKey].length > 0) {
                        const next = (this as any)[queueKey].shift();
                        // Recursive call for the next item, but we need to handle its promise
                        // This logic gets tricky. Better:
                        // Just trigger the next one.
                        // Actually, cleaner implementation:
                        // Just run the next one in the queue if slot available
                         // But we returned a promise to the caller.
                         // So we should execute the next functionality and resolve THAT promise.
                         const { resolve, reject, args, context } = next;
                         (this as any)[activeCountKey]++; // pre-increment for the next task
                         run.call(context, args).then(resolve).catch(reject);
                    }
                }
            };

            return run.call(this, args);
        };
        return descriptor;
    };
}
