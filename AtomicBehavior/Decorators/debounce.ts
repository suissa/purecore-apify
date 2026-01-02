export function Debounce(delay: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const timerKey = Symbol(`__debounce_timer_${propertyKey}__`);

    descriptor.value = function (...args: any[]) {
      const timer = (this as any)[timerKey];
      if (timer) {
        clearTimeout(timer);
      }

      (this as any)[timerKey] = setTimeout(() => {
        originalMethod.apply(this, args);
      }, delay);
    };

    return descriptor;
  };
}
