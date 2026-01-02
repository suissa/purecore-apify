export function Analyze(label?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const tag = label || propertyKey;
      console.time(tag);
      const startMem = process.memoryUsage().heapUsed;

      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        const endMem = process.memoryUsage().heapUsed;
        const diffMem = (endMem - startMem) / 1024 / 1024; // MB
        console.timeEnd(tag);
        console.log(`[${tag}] Memory Delta: ${diffMem.toFixed(4)} MB`);
      }
    };

    return descriptor;
  };
}
