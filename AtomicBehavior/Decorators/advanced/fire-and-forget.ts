export function FireAndForget() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: any[]) {
            // Run without awaiting
            Promise.resolve(originalMethod.apply(this, args)).catch(err => {
                console.error(`FireAndForget Error in ${propertyKey}:`, err);
            });
            // Return void or promise that resolves immediately?
            // Usually returns void or undefined strictly.
            return; 
        };
        return descriptor;
    };
}
