export function Final<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    constructor(...args: any[]) {
      if (new.target !== constructor && new.target.name !== constructor.name) {
        throw new Error(`Class ${constructor.name} is final and cannot be subclassed.`);
      }
      super(...args);
    }
  };
}
