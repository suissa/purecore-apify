import { RequestHandler } from '../types';

export interface DecoratorMeta {
  propertyKey: string | symbol;
}

export type HandlerInterceptor = (
  handler: RequestHandler,
  meta: DecoratorMeta
) => RequestHandler;

export const createHandlerDecorator = (
  interceptorFactory: HandlerInterceptor
): MethodDecorator => {
  return (_target, propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    if (typeof original !== 'function') {
      throw new TypeError(`Decorator @${String(propertyKey)} só pode ser aplicado em métodos.`);
    }

    descriptor.value = function (...args: unknown[]) {
      const boundHandler: RequestHandler = (original as RequestHandler).bind(this);
      const intercepted = interceptorFactory(boundHandler, { propertyKey });
      return intercepted(...(args as Parameters<RequestHandler>));
    };
  };
};

