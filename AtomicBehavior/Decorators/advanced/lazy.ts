export function Lazy(initializer: () => any) {
    return function (target: any, propertyKey: string) {
        const hiddenKey = Symbol(`__lazy_${propertyKey}__`);
        Object.defineProperty(target, propertyKey, {
            get: function () {
                if (!(this as any)[hiddenKey]) {
                    (this as any)[hiddenKey] = initializer.call(this);
                }
                return (this as any)[hiddenKey];
            },
            configurable: true,
            enumerable: true,
        });
    };
}
