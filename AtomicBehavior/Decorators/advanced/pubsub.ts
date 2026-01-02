type EventHandler = (data: any) => void;

class EventBus {
    private static instance: EventBus;
    private handlers: Map<string, EventHandler[]> = new Map();

    private constructor() {}

    static getInstance() {
        if (!EventBus.instance) EventBus.instance = new EventBus();
        return EventBus.instance;
    }

    subscribe(event: string, handler: EventHandler) {
        if (!this.handlers.has(event)) this.handlers.set(event, []);
        this.handlers.get(event)!.push(handler);
    }

    publish(event: string, data: any) {
        if (this.handlers.has(event)) {
            this.handlers.get(event)!.forEach(handler => handler(data));
        }
    }
}

export const bus = EventBus.getInstance();

export function Publish(event: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const result = await originalMethod.apply(this, args);
            bus.publish(event, result);
            return result;
        };
        return descriptor;
    };
}

export function Subscribe(event: string) {
    return function (target: any, propertyKey: string) {
        bus.subscribe(event, (data) => {
            if (typeof target[propertyKey] === 'function') {
                target[propertyKey](data);
            }
        });
    };
}
