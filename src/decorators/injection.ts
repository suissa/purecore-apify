/**
 * Dependency Injection - @Inject decorator para injeção automática de dependências
 */

interface DependencyContainer {
  [key: string]: any;
}

// Container global de dependências
const dependencyContainer: DependencyContainer = {};

// Container por classe
const classDependencies = new Map<Function, DependencyContainer>();

/**
 * Registra uma dependência no container global
 */
export function registerDependency(token: string, instance: any): void {
  dependencyContainer[token] = instance;
}

/**
 * Registra múltiplas dependências
 */
export function registerDependencies(dependencies: Record<string, any>): void {
  Object.assign(dependencyContainer, dependencies);
}

/**
 * Resolve uma dependência do container
 */
export function resolveDependency<T = any>(token: string): T {
  const instance = dependencyContainer[token];
  if (!instance) {
    throw new Error(`Dependência não encontrada: ${token}`);
  }
  return instance;
}

/**
 * Decorator para injetar dependências em propriedades
 */
export function Inject(token?: string) {
  return function(target: any, propertyKey: string) {
    const dependencyToken = token || propertyKey;

    // Define getter que resolve a dependência
    Object.defineProperty(target, propertyKey, {
      get() {
        return resolveDependency(dependencyToken);
      },
      set(value: any) {
        // Permite sobrescrever se necessário
        dependencyContainer[dependencyToken] = value;
      },
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * Decorator para injetar dependências no construtor
 */
export function InjectConstructor(...tokens: string[]) {
  return function(target: Function) {
    // Armazena tokens para uso posterior
    (target as any).__injectTokens = tokens;
  };
}

/**
 * Factory para criar instâncias com injeção automática
 */
export function createWithInjection<T>(constructor: new (...args: any[]) => T, ...extraArgs: any[]): T {
  const tokens = (constructor as any).__injectTokens || [];
  const dependencies = tokens.map((token: string) => resolveDependency(token));

  return new constructor(...dependencies, ...extraArgs);
}

/**
 * Decorator para propriedades com injeção lazy (só resolve quando acessada)
 */
export function LazyInject(token?: string) {
  return function(target: any, propertyKey: string) {
    const dependencyToken = token || propertyKey;
    let resolvedValue: any;
    let isResolved = false;

    Object.defineProperty(target, propertyKey, {
      get() {
        if (!isResolved) {
          resolvedValue = resolveDependency(dependencyToken);
          isResolved = true;
        }
        return resolvedValue;
      },
      set(value: any) {
        resolvedValue = value;
        isResolved = true;
        dependencyContainer[dependencyToken] = value;
      },
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * Decorator para métodos que precisam de dependências
 */
export function InjectMethod(...tokens: string[]) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args: any[]) {
      const dependencies = tokens.map(token => resolveDependency(token));
      return originalMethod.apply(this, [...dependencies, ...args]);
    };

    return descriptor;
  };
}

/**
 * Helper para criar container scoped
 */
export class ScopedContainer {
  private scopedDependencies: DependencyContainer = {};

  register(token: string, instance: any): void {
    this.scopedDependencies[token] = instance;
  }

  resolve<T = any>(token: string): T {
    return this.scopedDependencies[token] || dependencyContainer[token];
  }

  createWithScope<T>(constructor: new (...args: any[]) => T): T {
    // Temporariamente sobrescreve o container global
    const originalResolve = resolveDependency;
    (global as any).resolveDependency = this.resolve.bind(this);

    try {
      return createWithInjection(constructor);
    } finally {
      (global as any).resolveDependency = originalResolve;
    }
  }
}

/**
 * Singleton pattern para dependências
 */
export function Singleton(token?: string) {
  return function(target: Function) {
    const dependencyToken = token || target.name;

    // Verifica se já existe uma instância
    if (dependencyContainer[dependencyToken]) {
      return dependencyContainer[dependencyToken];
    }

    // Cria nova instância
    const instance = new (target as any)();
    dependencyContainer[dependencyToken] = instance;

    return instance;
  };
}

/**
 * Limpa todas as dependências registradas
 */
export function clearDependencies(): void {
  Object.keys(dependencyContainer).forEach(key => {
    delete dependencyContainer[key];
  });
}

/**
 * Lista todas as dependências registradas
 */
export function listDependencies(): string[] {
  return Object.keys(dependencyContainer);
}
