/**
 * Utilitários modernos usando Web Streams API (Node.js 18+)
 * Melhor performance e compatibilidade com padrões web
 */

/**
 * Converte ReadableStream para Buffer de forma eficiente
 */
export async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  
  return Buffer.concat(chunks);
}

/**
 * Processa stream de dados com backpressure automático
 */
export async function processStreamWithBackpressure<T, R>(
  stream: ReadableStream<T>,
  processor: (chunk: T) => Promise<R>,
  options: { concurrency?: number } = {}
): Promise<R[]> {
  const { concurrency = 3 } = options;
  const reader = stream.getReader();
  const results: R[] = [];
  const processing = new Set<Promise<void>>();

  try {
    while (true) {
      // Controla a concorrência
      while (processing.size >= concurrency) {
        await Promise.race(processing);
      }

      const { done, value } = await reader.read();
      if (done) break;

      const processPromise = processor(value)
        .then(result => {
          results.push(result);
        })
        .finally(() => {
          processing.delete(processPromise);
        });

      processing.add(processPromise);
    }

    // Aguarda todos os processamentos pendentes
    await Promise.all(processing);
  } finally {
    reader.releaseLock();
  }

  return results;
}

/**
 * Cria um TransformStream para processamento de dados
 */
export function createProcessingStream<T, R>(
  transformer: (chunk: T) => R | Promise<R>
): TransformStream<T, R> {
  return new TransformStream({
    async transform(chunk, controller) {
      try {
        const result = await transformer(chunk);
        controller.enqueue(result);
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

/**
 * Pipeline de streams com error handling robusto
 */
export async function pipelineWithErrorHandling<T>(
  source: ReadableStream<T>,
  ...transforms: TransformStream<any, any>[]
): Promise<ReadableStream> {
  let current: ReadableStream = source;

  for (const transform of transforms) {
    current = current.pipeThrough(transform);
  }

  return current;
}

/**
 * Utilitário para criar streams de dados grandes com chunks otimizados
 */
export function createChunkedStream<T>(
  data: T[],
  chunkSize: number = 1000
): ReadableStream<T[]> {
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index >= data.length) {
        controller.close();
        return;
      }

      const chunk = data.slice(index, index + chunkSize);
      index += chunkSize;
      controller.enqueue(chunk);
    }
  });
}