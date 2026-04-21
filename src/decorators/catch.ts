import { HttpError } from "../errors.js";

/**
 * Catch Decorator - Tratamento graceful de erros
 */

interface CatchOptions {
  /** Função de tratamento de erro */
  handler?: (error: Error, context: any) => any;
  /** Retorno padrão em caso de erro */
  defaultValue?: any;
  /** Se deve relançar o erro após tratamento */
  rethrow?: boolean;
  /** Se deve logar o erro */
  logError?: boolean;
  /** Níveis de erro a serem capturados */
  errorTypes?: (string | Function)[];
}

// Module-level error log for getErrorLog/clearErrorLog
const errorLog: Array<{
  timestamp: string;
  error: string;
  context: any;
  stack?: string;
}> = [];

/**
 * Decorator que captura erros e executa tratamento customizado
 */
export function Catch(options: CatchOptions = {}) {
  const {
    handler,
    defaultValue,
    rethrow = false,
    logError = true,
    errorTypes,
  } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        // Verifica se deve capturar este tipo de erro
        if (errorTypes && !shouldCatchError(error, errorTypes)) {
          throw error;
        }

        // Log do erro se solicitado
        if (logError) {
          console.error(`❌ [${methodName}] Erro capturado:`, {
            error: error?.message,
            stack: error?.stack,
            args: args.length > 0 ? "[arguments provided]" : "no arguments",
          });
        }

        // Contexto para o handler
        const context = {
          target: this,
          method: propertyKey,
          args,
          timestamp: new Date().toISOString(),
          instance: target.constructor.name,
        };

        // Executa handler customizado se fornecido
        if (handler) {
          try {
            const result = await handler(error as Error, context);
            if (result !== undefined) {
              return result;
            }
          } catch (handlerError) {
            console.error(
              `💥 [${methodName}] Erro no handler de catch:`,
              handlerError
            );
            if (rethrow) throw handlerError;
          }
        }

        // Retorna valor padrão se especificado
        if (defaultValue !== undefined) {
          console.warn(
            `⚠️ [${methodName}] Retornando valor padrão devido a erro`
          );
          return defaultValue;
        }

        // Para erros HTTP, pode ser interessante retornar uma resposta padrão
        if (error instanceof HttpError) {
          console.warn(
            `🌐 [${methodName}] Erro HTTP capturado: ${error.statusCode} ${error.message}`
          );
          return {
            error: {
              message: "Serviço temporariamente indisponível",
              statusCode: 503,
              type: "ServiceUnavailableError",
            },
          };
        }

        // Comportamento padrão: retorna null para graceful degradation
        console.warn(
          `🔄 [${methodName}] Graceful degradation: retornando null`
        );
        return null;
      }
    };

    return descriptor;
  };
}

/**
 * Verifica se um erro deve ser capturado baseado nos tipos especificados
 */
function shouldCatchError(
  error: any,
  errorTypes: (string | Function)[]
): boolean {
  for (const errorType of errorTypes) {
    if (typeof errorType === "string") {
      // Verifica nome da classe
      if (error.constructor.name === errorType) return true;
      // Verifica tipo do erro
      if (error.name === errorType) return true;
    } else if (typeof errorType === "function") {
      // Verifica instância
      if (error instanceof errorType) return true;
    }
  }
  return false;
}

/**
 * Catch específico para erros HTTP
 */
export function CatchHttpErrors(
  options: Omit<CatchOptions, "errorTypes"> = {}
) {
  return Catch({
    ...options,
    errorTypes: [HttpError],
  });
}

/**
 * Catch específico para erros de validação
 */
export function CatchValidationErrors(
  options: Omit<CatchOptions, "errorTypes"> = {}
) {
  return Catch({
    ...options,
    errorTypes: ["ValidationError"],
  });
}

/**
 * Catch específico para erros de banco de dados
 */
export function CatchDatabaseErrors(
  options: Omit<CatchOptions, "errorTypes"> = {}
) {
  return Catch({
    ...options,
    errorTypes: ["DatabaseError", "MongoError", "SequelizeDatabaseError"],
  });
}

/**
 * Catch específico para erros de API externa
 */
export function CatchApiErrors(options: Omit<CatchOptions, "errorTypes"> = {}) {
  return Catch({
    ...options,
    errorTypes: ["ExternalApiError", "FetchError", "NetworkError"],
  });
}

/**
 * Catch com retry automático
 */
export function CatchWithRetry(
  maxRetries = 3,
  delayMs = 1000,
  options: CatchOptions = {}
) {
  let retryCount = 0;

  return Catch({
    ...options,
    handler: async (error, context) => {
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(
          `🔄 [${context.instance}.${context.method}] Tentativa ${retryCount}/${maxRetries} em ${delayMs}ms`
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));

        // Re-executa o método original
        const originalMethod = context.target[context.method];
        return await originalMethod.apply(context.target, context.args);
      }

      console.error(
        `❌ [${context.instance}.${context.method}] Todas as ${maxRetries} tentativas falharam`
      );
      throw error; // Relança erro após todas as tentativas
    },
  });
}

/**
 * Catch que salva erros para análise posterior
 */
export function CatchAndLog(options: CatchOptions = {}) {
  return Catch({
    ...options,
    handler: (error, context) => {
      errorLog.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        context,
        stack: error.stack,
      });

      // Mantém apenas os últimos 100 erros
      if (errorLog.length > 100) {
        errorLog.shift();
      }

      console.log(
        `📝 [${context.instance}.${context.method}] Erro salvo para análise (${errorLog.length} total)`
      );
    },
  });
}

/**
 * Retorna log de erros capturados
 */
export function getErrorLog() {
  return errorLog;
}

/**
 * Limpa log de erros
 */
export function clearErrorLog() {
  errorLog.length = 0;
}
