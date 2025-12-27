export type Validator<T> = (arg: T) => boolean | Promise<boolean>;
export type ValidationSchema = Record<string, Validator<any>>;

export function Validate(validators: Validator<any>[]) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            if (args.length !== validators.length) {
                // If args count match is strict, we can throw. Or just validate available ones.
                // Let's assume strict mapping for complexity.
            }

            for (let i = 0; i < args.length; i++) {
                const validator = validators[i];
                if (validator) {
                    const isValid = await Promise.resolve(validator(args[i]));
                    if (!isValid) {
                        throw new Error(`Validation failed for argument ${i} in method ${propertyKey}`);
                    }
                }
            }

            return originalMethod.apply(this, args);
        };
        return descriptor;
    };
}
