/**
 * Preset Decorator Factory - Permite combinar múltiplos decorators em um único
 */

export type DecoratorFunction = (...args: any[]) => any;

/**
 * Factory para criar presets de decorators combinados
 * @param decorators Array de decorators a serem aplicados
 * @returns Decorator que aplica todos os decorators na ordem especificada
 */
export function PresetDecoratorFactory<T extends DecoratorFunction[]>(
  decorators: T
) {
  return function (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor
  ) {
    // Aplica os decorators na ordem inversa (do último para o primeiro)
    // para que eles sejam executados na ordem correta
    let result = descriptor;

    for (let i = decorators.length - 1; i >= 0; i--) {
      const decorator = decorators[i];
      if (decorator) {
        result = decorator(target, propertyKey, result) || result;
      }
    }

    return result;
  };
}

/**
 * Helper para criar presets nomeados
 */
export function createPreset(name: string, decorators: DecoratorFunction[]) {
  const preset = PresetDecoratorFactory(decorators);

  // Adiciona nome ao preset para debug
  Object.defineProperty(preset, "name", {
    value: name,
    writable: false,
  });

  return preset;
}

/**
 * Helper para combinar presets existentes
 */
export function combinePresets(...presets: DecoratorFunction[]) {
  return PresetDecoratorFactory(presets);
}
