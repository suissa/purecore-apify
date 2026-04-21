export function TransformArgs(transforms: ((arg: any) => any)[]) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: any[]) {
            const transformedArgs = args.map((arg, idx) => {
                const transform = transforms[idx];
                return transform ? transform(arg) : arg;
            });
            return originalMethod.apply(this, transformedArgs);
        };
        return descriptor;
    };
}

export function TransformReturn(transform: (ret: any) => any) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const result = await originalMethod.apply(this, args);
            return transform(result);
        };
        return descriptor;
    };
}
