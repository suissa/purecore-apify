export function Watch(handlerName: string) {
  return function (target: any, propertyKey: string) {
    let value = target[propertyKey];

    const getter = function () {
      return value;
    };

    const setter = function (this: any, newVal: any) {
      const oldVal = value;
      value = newVal;
      
      // Call the handler if it exists on the instance
      if (typeof this[handlerName] === 'function') {
        this[handlerName](newVal, oldVal);
      }
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}
