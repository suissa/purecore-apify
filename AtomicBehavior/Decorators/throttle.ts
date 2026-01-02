export function Throttle(interval: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const lastRunKey = Symbol(`__throttle_lastRun_${propertyKey}__`);

    descriptor.value = function (...args: any[]) {
      const lastRun = (this as any)[lastRunKey] || 0;
      const now = Date.now();

      if (now - lastRun >= interval) {
        (this as any)[lastRunKey] = now;
        originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}
