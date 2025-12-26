// import { v4 as uuidv4 } from 'uuid'; // Removed to avoid external dependencies 
// I'll use a simple random string generator to avoid dependency hell for just one uuid.

function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export type AsyncRouteMode = 'ndjson' | 'sse' | 'sse:dynamic' | 'ndjson:dynamic';

// Registry to store dynamic streams
export class AsyncRouteRegistry {
    private static instance: AsyncRouteRegistry;
    private streams: Map<string, { mode: AsyncRouteMode, stream: AsyncIterable<any> }> = new Map();

    private constructor() {}

    static getInstance() {
        if (!AsyncRouteRegistry.instance) AsyncRouteRegistry.instance = new AsyncRouteRegistry();
        return AsyncRouteRegistry.instance;
    }

    register(id: string, mode: AsyncRouteMode, stream: AsyncIterable<any>) {
        this.streams.set(id, { mode, stream });
    }

    get(id: string) {
        return this.streams.get(id);
    }
    
    // Helper to request the user to mount this
    // e.g. app.get('/_async/:id', (req, res) => AsyncRouteRegistry.handle(req, res))
    // But since this is a decorator lib, we just provide the registry access.
}

export const asyncRouteRegistry = AsyncRouteRegistry.getInstance();

export function AsyncRoute(mode: AsyncRouteMode, baseUrl: string = '/_async') {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const resultStream = await originalMethod.apply(this, args);

            // Ensure result is AsyncIterable
            if (!resultStream || typeof resultStream[Symbol.asyncIterator] !== 'function') {
                 // If standard execution, maybe just return it? But contract implies stream.
                 // Let's assume user returns AsyncIterator or we wrap it?
                 // If they return just a value, we can yield it once.
                 throw new Error("@AsyncRoute method must return an AsyncIterable");
            }

            if (mode === 'sse:dynamic' || mode === 'ndjson:dynamic') {
                const id = generateId();
                asyncRouteRegistry.register(id, mode as AsyncRouteMode, resultStream);
                
                const responseType = mode.split(':')[0]; // sse or ndjson
                const routeUrl = `${baseUrl}/${id}`; // User must ensure this route is handled by looking up registry

                // Mocking a response object if possible, or returning the POJO description
                // The framework using this must handle the return value.
                // We return the specific JSON format requested.
                return {
                    "async-route": {
                        [responseType]: routeUrl
                    }
                };
            } else {
                // Direct mode (sse or ndjson) on the SAME route.
                // This usually requires writing to the 'res' object found in args or returning a specific stream object
                // that the framework knows how to handle.
                
                // Since we want to be generic, we can:
                // 1. Look for a 'res' object in args (Expressy)
                // 2. Return a disguised object that frameworks like Fastify might accept if configured?
                
                // Let's try to detect Express/Node 'res' object.
                const res = args.find(arg => arg && typeof arg.write === 'function' && typeof arg.setHeader === 'function');
                
                if (res) {
                    // Handle direct writing
                    if (mode === 'sse') {
                        res.setHeader('Content-Type', 'text/event-stream');
                        res.setHeader('Cache-Control', 'no-cache');
                        res.setHeader('Connection', 'keep-alive');
                        res.flushHeaders?.();

                        for await (const item of resultStream) {
                            res.write(`data: ${JSON.stringify(item)}\n\n`);
                        }
                        res.end();
                    } else if (mode === 'ndjson') {
                         res.setHeader('Content-Type', 'application/x-ndjson');
                         for await (const item of resultStream) {
                            res.write(`${JSON.stringify(item)}\n`);
                        }
                        res.end();
                    }
                    // Return nothing or undefined as we handled the response
                    return; 
                } else {
                    // If no response object found, maybe we are in a framework where we return the stream?
                    // But we need to attach headers. 
                    // Let's return the stream but attach metadata for an adapter to read?
                    (resultStream as any).__asyncRouteMode = mode;
                    return resultStream;
                }
            }
        };

        return descriptor;
    };
}
