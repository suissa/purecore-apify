export enum CircuitParams {
    FailureThreshold = 3,
    ResetTimeout = 5000,
}

enum CircuitState {
    CLOSED,
    OPEN,
    HALF_OPEN
}

export function CircuitBreaker(threshold: number = CircuitParams.FailureThreshold, resetTimeout: number = CircuitParams.ResetTimeout) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        const stateKey = Symbol(`__circuit_state_${propertyKey}__`);
        const failuresKey = Symbol(`__circuit_failures_${propertyKey}__`);
        const lastFailureKey = Symbol(`__circuit_last_failure_${propertyKey}__`);

        descriptor.value = async function (...args: any[]) {
            const state = (this as any)[stateKey] || CircuitState.CLOSED;
            const failures = (this as any)[failuresKey] || 0;
            const lastFailure = (this as any)[lastFailureKey] || 0;

            if (state === CircuitState.OPEN) {
                if (Date.now() - lastFailure > resetTimeout) {
                    (this as any)[stateKey] = CircuitState.HALF_OPEN;
                } else {
                    throw new Error(`CircuitBreaker: Method ${propertyKey} is OPEN`);
                }
            }

            try {
                const result = await originalMethod.apply(this, args);
                if ((this as any)[stateKey] === CircuitState.HALF_OPEN) {
                    (this as any)[stateKey] = CircuitState.CLOSED;
                    (this as any)[failuresKey] = 0;
                }
                return result;
            } catch (error) {
                (this as any)[failuresKey] = failures + 1;
                (this as any)[lastFailureKey] = Date.now();
                if ((this as any)[failuresKey] >= threshold) {
                    (this as any)[stateKey] = CircuitState.OPEN;
                }
                throw error;
            }
        };

        return descriptor;
    };
}
