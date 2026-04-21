export function AsyncEvent(eventName?: string) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        const evtName = eventName || propertyKey;
        const setupKey = Symbol(`__async_event_setup_${propertyKey}`);

        descriptor.value = function(...args: any[]) {
            const context = this as any;

            // Ensure the instance has EventEmitter-like interface
            if (typeof context.emit !== 'function' || typeof context.on !== 'function') {
                throw new Error(`@AsyncEvent: Class must implement 'emit' and 'on' methods (like Node.js EventEmitter).`);
            }

            // Lazy registration of the listener (once per instance)
            if (!context[setupKey]) {
                context.on(evtName, (...eventArgs: any[]) => {
                    // Execute the original method with the event arguments
                    originalMethod.apply(context, eventArgs);
                });
                context[setupKey] = true;
            }

            // Asynchronous emission
            // We use setImmediate if available (Node), else setTimeout(0)
            const schedule = typeof setImmediate === 'function' ? setImmediate : (fn: Function) => setTimeout(fn, 0);

            schedule(() => {
                context.emit(evtName, ...args);
            });

            // Return void as the execution is now decoupled and async
            return;
        };

        return descriptor;
    };
}
