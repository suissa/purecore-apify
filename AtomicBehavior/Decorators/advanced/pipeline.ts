export type Middleware = (args: any[], next: () => Promise<any>) => Promise<any>;

export function Pipeline(...middlewares: Middleware[]) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const dispatch = async (index: number): Promise<any> => {
                if (index >= middlewares.length) {
                    return originalMethod.apply(this, args);
                }
                const middleware = middlewares[index];
                return middleware(args, () => dispatch(index + 1));
            };
            return dispatch(0);
        };
        return descriptor;
    };
}
