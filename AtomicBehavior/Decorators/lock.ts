const locks = new Map<string, boolean>();

export function Lock(key?: string | ((...args: any[]) => string)) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lockKey = key;
      if (typeof key === 'function') {
        lockKey = key(...args);
      } else if (!key) {
        // Default to class name + method name
        lockKey = `${target.constructor.name}:${propertyKey}`;
      } else {
        lockKey = String(key);
      }

      if (locks.get(lockKey as string)) {
        console.warn(`Method ${propertyKey} is locked for key: ${lockKey}`);
        return; // Or throw an error
      }

      locks.set(lockKey as string, true);

      try {
        return await originalMethod.apply(this, args);
      } finally {
        locks.delete(lockKey as string);
      }
    };

    return descriptor;
  };
}
