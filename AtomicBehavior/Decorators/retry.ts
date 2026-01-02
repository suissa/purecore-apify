export function Retry(retries: number = 3, delay: number = 1000, backoff: boolean = false) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let attempts = 0;
      while (attempts < retries) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          attempts++;
          if (attempts >= retries) {
            throw error;
          }
          const waitTime = backoff ? delay * attempts : delay;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    };

    return descriptor;
  };
}
