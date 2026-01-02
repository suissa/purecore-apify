export function Saga(compensationMethod: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            try {
                return await originalMethod.apply(this, args);
            } catch (error) {
                console.error(`Saga detected error in ${propertyKey}. Triggering compensation: ${compensationMethod}`);
                if (typeof (this as any)[compensationMethod] === 'function') {
                    // Pass the error and original args to compensation
                    await (this as any)[compensationMethod](error, ...args);
                } else {
                    console.error(`Compensation method ${compensationMethod} not found on target.`);
                }
                throw error; // Re-throw or handle? Usually re-throw after compensation.
            }
        };
        return descriptor;
    };
}
