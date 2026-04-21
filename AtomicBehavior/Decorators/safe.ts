export function Safe(onError?: (error: any) => void) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);
        if (result instanceof Promise) {
          return result.catch((error) => {
            if (onError) {
              onError(error);
            } else {
              console.error(`Error in ${propertyKey}:`, error);
            }
          });
        }
        return result;
      } catch (error) {
        if (onError) {
          onError(error);
        } else {
          console.error(`Error in ${propertyKey}:`, error);
        }
      }
    };

    return descriptor;
  };
}
