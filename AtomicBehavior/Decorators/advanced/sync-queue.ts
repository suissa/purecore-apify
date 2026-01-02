export function SyncQueue() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const queueKey = Symbol(`__sync_queue_${propertyKey}__`);

    descriptor.value = async function (...args: any[]) {
      if (!(this as any)[queueKey]) {
        (this as any)[queueKey] = Promise.resolve();
      }

      const queueCall = (this as any)[queueKey].then(async () => {
        try {
          return await originalMethod.apply(this, args);
        } catch (e) {
            throw e; 
        }
      });

      // We chain the catch to the queue itself so one failure doesn't block the queue forever,
      // but we return 'queueCall' so the caller gets the result/error of THEIR call.
      (this as any)[queueKey] = queueCall.catch(() => {});

      return queueCall;
    };

    return descriptor;
  };
}
