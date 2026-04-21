import { NextFunction, Request, RequestHandler, Response } from "../types";
import { createHandlerDecorator } from "./base";

type ResilientHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
}

export const CircuitBreaker = (
  options: CircuitBreakerOptions = {}
): MethodDecorator => {
  const config = {
    failureThreshold: options.failureThreshold ?? 5,
    resetTimeoutMs: options.resetTimeoutMs ?? 10000,
  };

  return createHandlerDecorator((handler, meta) => {
    const routeKey = String(meta.propertyKey);
    let failures = 0;
    let nextAttempt = 0;
    let state: "closed" | "open" | "half-open" = "closed";

    const execute: ResilientHandler = async (req, res, next) => {
      const now = Date.now();
      if (state === "open") {
        if (now >= nextAttempt) {
          state = "half-open";
        } else {
          res
            .status(503)
            .json({
              error: "Circuit breaker aberto, tente novamente mais tarde.",
              route: routeKey,
            });
          return;
        }
      }

      try {
        await handler(req, res, next);
        failures = 0;
        state = "closed";
      } catch (error) {
        failures += 1;
        if (failures >= config.failureThreshold) {
          state = "open";
          nextAttempt = Date.now() + config.resetTimeoutMs;
          res
            .status(503)
            .json({
              error: "Circuit breaker aberto, tente novamente mais tarde.",
              route: routeKey,
            });
          return;
        }
        res
          .status(500)
          .json({ error: "Erro interno do servidor.", route: routeKey });
        return;
      }
    };

    return execute;
  });
};

interface TimeoutOptions {
  ms?: number;
  maxTimeoutMs?: number;
  retryAttempts?: number;
  enableAsyncChannel?: boolean;
  enableTelemetry?: boolean;
  enableRequestChunking?: boolean;
  globalBlocking?: boolean;
}

interface TelemetryData {
  requestId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  timeoutExceeded: boolean;
  chunksProcessed?: number;
  totalChunks?: number;
  retryAttempts: number;
  blocked: boolean;
  bottlenecks: string[];
  maxTimeoutMs: number;
}

interface AsyncChannel {
  id: string;
  response: any;
  completed: boolean;
  error?: any;
  telemetry?: TelemetryData;
}

// Cache global para bloqueio de requisições problemáticas
const globalRequestBlocklist = new Map<
  string,
  {
    blocked: boolean;
    reason: string;
    expiresAt: number;
    timeoutCount: number;
    lastTimeout: number;
  }
>();

// Cache para telemetria por rota (últimas 50 execuções)
const telemetryCache = new Map<string, TelemetryData[]>();

export const Timeout = (options: TimeoutOptions = {}): MethodDecorator => {
  const config = {
    timeoutMs: options.ms ?? 5000,
    maxTimeoutMs: options.maxTimeoutMs ?? 30000,
    retryAttempts: options.retryAttempts ?? 3,
    enableAsyncChannel: options.enableAsyncChannel ?? true,
    enableTelemetry: options.enableTelemetry ?? true,
    enableRequestChunking: options.enableRequestChunking ?? true,
    globalBlocking: options.globalBlocking ?? true,
  };

  return createHandlerDecorator((handler, meta) => {
    const routeKey = String(meta.propertyKey);

    const execute: ResilientHandler = async (req, res, next) => {
      const requestId = `req-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const startTime = Date.now();

      // 1. Verificar bloqueio global
      const blockInfo = globalRequestBlocklist.get(routeKey);
      if (blockInfo?.blocked && Date.now() < blockInfo.expiresAt) {
        res.status(429).json({
          error: "Requisição bloqueada globalmente",
          reason: blockInfo.reason,
          timeoutCount: blockInfo.timeoutCount,
          retryAfter: Math.ceil((blockInfo.expiresAt - Date.now()) / 1000),
        });
        return;
      }

      const telemetry: TelemetryData = {
        requestId,
        startTime,
        timeoutExceeded: false,
        retryAttempts: 0,
        blocked: false,
        bottlenecks: [],
        maxTimeoutMs: config.maxTimeoutMs,
      };

      let asyncChannel: AsyncChannel | null = null;
      let attemptCount = 0;

      // Função para executar tentativa
      const executeWithTimeout = (timeoutMs: number): Promise<void> => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`TIMEOUT_${timeoutMs}ms`));
          }, timeoutMs);

          // Wrap handler result in Promise.resolve to handle both void and Promise<void>
          Promise.resolve(handler(req, res, next))
            .then(() => resolve())
            .catch(reject)
            .finally(() => clearTimeout(timer));
        });
      };

      // Canal async para resposta final
      const createAsyncChannel = (): AsyncChannel => ({
        id: `async-${requestId}`,
        response: null,
        completed: false,
        telemetry,
      });

      const sendAsyncResponse = (channel: AsyncChannel | null, data: any) => {
        if (!channel) return;
        channel.response = data;
        channel.completed = true;

        // Log da resposta assíncrona
        console.log(`[ASYNC:${channel.id}]`, data);

        // TODO: Integrar com WebSocket/Server-Sent Events
        // Por enquanto, apenas logging
      };

      try {
        // Tentativa inicial com timeout padrão
        await executeWithTimeout(config.timeoutMs);
      } catch (error: any) {
        if (error instanceof Error && error.message.startsWith("TIMEOUT_")) {
          telemetry.timeoutExceeded = true;
          attemptCount++;

          // Criar canal async
          if (config.enableAsyncChannel) {
            asyncChannel = createAsyncChannel();

            // Retornar imediatamente com canal async aberto
            res.status(202).json({
              message: "Timeout - processamento continua em background",
              asyncChannelId: asyncChannel.id,
              timeoutMs: config.timeoutMs,
              maxTimeoutMs: config.maxTimeoutMs,
              remainingAttempts: config.retryAttempts - attemptCount + 1,
            });

            // Continuar processamento em background
            process.nextTick(async () => {
              try {
                // Tentar novamente com mais tempo (até 3x)
                for (
                  let attempt = 1;
                  attempt <= config.retryAttempts;
                  attempt++
                ) {
                  attemptCount++;
                  telemetry.retryAttempts = attempt;

                  try {
                    await executeWithTimeout(config.maxTimeoutMs);
                    // Sucesso!
                    sendAsyncResponse(asyncChannel, {
                      success: true,
                      attempt,
                      message: "Processamento concluído após retry",
                      duration: Date.now() - startTime,
                    });
                    return;
                  } catch (retryError: any) {
                    if (
                      retryError instanceof Error &&
                      retryError.message.startsWith("TIMEOUT_")
                    ) {
                      telemetry.bottlenecks.push(
                        `Retry ${attempt} falhou com ${config.maxTimeoutMs}ms`
                      );

                      // Se atingiu máximo de tentativas, tentar chunking
                      if (
                        attempt === config.retryAttempts &&
                        config.enableRequestChunking
                      ) {
                        if (canChunkRequest(req)) {
                          try {
                            const chunks = await chunkRequest(req, 3); // Máximo 3 chunks
                            telemetry.totalChunks = chunks.length;

                            const chunkResults = [];
                            for (let i = 0; i < chunks.length; i++) {
                              telemetry.chunksProcessed = i + 1;
                              const result = await processChunk(
                                chunks[i],
                                handler,
                                req,
                                res,
                                next
                              );
                              chunkResults.push(result);
                            }

                            sendAsyncResponse(asyncChannel, {
                              success: true,
                              method: "chunking",
                              chunksProcessed: chunkResults.length,
                              totalChunks: chunks.length,
                              message:
                                "Requisição processada em partes menores",
                              telemetry: config.enableTelemetry
                                ? telemetry
                                : undefined,
                            });
                            return;
                          } catch (chunkError) {
                            // Chunking falhou - explicar problema
                            const explanation = generateTimeoutExplanation(
                              req,
                              telemetry
                            );

                            sendAsyncResponse(asyncChannel, {
                              success: false,
                              method: "chunking_failed",
                              error: "Não foi possível processar em partes",
                              explanation,
                              recommendations: [
                                "Reveja a lógica de negócio",
                                "Otimize consultas de banco",
                                "Implemente cache",
                                "Reduza complexidade computacional",
                              ],
                              telemetry: config.enableTelemetry
                                ? telemetry
                                : undefined,
                              maxTimeoutMs: config.maxTimeoutMs,
                            });

                            // Bloquear globalmente após falha total
                            if (config.globalBlocking) {
                              const currentBlock = globalRequestBlocklist.get(
                                routeKey
                              ) || {
                                blocked: false,
                                timeoutCount: 0,
                                lastTimeout: 0,
                                reason: "",
                                expiresAt: 0,
                              };

                              globalRequestBlocklist.set(routeKey, {
                                blocked: true,
                                reason: "Timeouts recorrentes após chunking",
                                timeoutCount: currentBlock.timeoutCount + 1,
                                lastTimeout: Date.now(),
                                expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
                              });

                              telemetry.blocked = true;
                            }
                            return;
                          }
                        } else {
                          // Não pode fazer chunking
                          const explanation = generateTimeoutExplanation(
                            req,
                            telemetry
                          );

                          sendAsyncResponse(asyncChannel, {
                            success: false,
                            method: "not_chunkable",
                            error: "Requisição não pode ser dividida",
                            explanation,
                            telemetry: config.enableTelemetry
                              ? telemetry
                              : undefined,
                            maxTimeoutMs: config.maxTimeoutMs,
                          });

                          // Bloquear mesmo assim após múltiplas tentativas
                          if (config.globalBlocking) {
                            const currentBlock = globalRequestBlocklist.get(
                              routeKey
                            ) || {
                              blocked: false,
                              timeoutCount: 0,
                              lastTimeout: 0,
                              reason: "",
                              expiresAt: 0,
                            };

                            globalRequestBlocklist.set(routeKey, {
                              blocked: true,
                              reason: "Timeouts recorrentes - não chunkável",
                              timeoutCount: currentBlock.timeoutCount + 1,
                              lastTimeout: Date.now(),
                              expiresAt: Date.now() + 24 * 60 * 60 * 1000,
                            });

                            telemetry.blocked = true;
                          }
                          return;
                        }
                      }
                    } else {
                      // Erro não-timeout durante retry
                      sendAsyncResponse(asyncChannel, {
                        success: false,
                        error: "Erro durante processamento",
                        details:
                          retryError instanceof Error
                            ? retryError.message
                            : "Erro desconhecido",
                      });
                      return;
                    }
                  }
                }
              } catch (finalError: any) {
                sendAsyncResponse(asyncChannel, {
                  success: false,
                  error: "Falha total após todas as tentativas",
                  finalError:
                    finalError instanceof Error
                      ? finalError.message
                      : "Erro desconhecido",
                });
              }
            });

            return; // Já respondemos
          }
        } else {
          // Erro não-timeout - passar adiante
          next(error);
          return;
        }
      }

      // Sucesso na primeira tentativa
      telemetry.endTime = Date.now();
      telemetry.duration = telemetry.endTime - telemetry.startTime;

      // Salvar telemetria
      if (config.enableTelemetry) {
        const routeTelemetry = telemetryCache.get(routeKey) || [];
        routeTelemetry.push(telemetry);

        // Manter apenas últimas 50 entradas
        if (routeTelemetry.length > 50) {
          routeTelemetry.shift();
        }

        telemetryCache.set(routeKey, routeTelemetry);
      }
    };

    return execute;
  });
};

// Funções auxiliares para o decorator Timeout

function canChunkRequest(req: Request): boolean {
  const body = req.body;

  // Arrays grandes
  if (Array.isArray(body) && body.length > 10) {
    return true;
  }

  // Objetos com propriedade items (ex: { items: [...] })
  if (
    body &&
    typeof body === "object" &&
    body.items &&
    Array.isArray(body.items) &&
    body.items.length > 5
  ) {
    return true;
  }

  // Payload muito grande
  if (JSON.stringify(body).length > 500000) {
    // 500KB
    return true;
  }

  return false;
}

async function chunkRequest(
  req: Request,
  maxChunks: number = 3
): Promise<any[]> {
  const body = req.body;
  const chunks: any[] = [];

  if (Array.isArray(body)) {
    // Dividir array em chunks
    const chunkSize = Math.max(1, Math.ceil(body.length / maxChunks));
    for (let i = 0; i < body.length; i += chunkSize) {
      chunks.push(body.slice(i, i + chunkSize));
    }
  } else if (body && body.items && Array.isArray(body.items)) {
    // Dividir propriedade items
    const chunkSize = Math.max(1, Math.ceil(body.items.length / maxChunks));
    for (let i = 0; i < body.items.length; i += chunkSize) {
      chunks.push({
        ...body,
        items: body.items.slice(i, i + chunkSize),
        _chunkInfo: {
          index: chunks.length,
          total: Math.ceil(body.items.length / chunkSize),
          originalSize: body.items.length,
        },
      });
    }
  } else if (typeof body === "object") {
    // Para objetos grandes, dividir por propriedades
    const keys = Object.keys(body);
    const chunkSize = Math.max(1, Math.ceil(keys.length / maxChunks));

    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunkKeys = keys.slice(i, i + chunkSize);
      const chunk = chunkKeys.reduce((acc: any, key: string) => {
        acc[key] = body[key];
        return acc;
      }, {} as any);

      chunks.push({
        ...chunk,
        _chunkInfo: {
          index: chunks.length,
          total: Math.ceil(keys.length / chunkSize),
          originalKeys: keys.length,
        },
      });
    }
  }

  return chunks;
}

async function processChunk(
  chunk: any,
  originalHandler: RequestHandler,
  originalReq: Request,
  res: Response,
  next: NextFunction
): Promise<any> {
  // Criar uma cópia da requisição com o chunk
  const chunkReq = {
    ...originalReq,
    body: chunk,
  } as Request;

  return new Promise((resolve, reject) => {
    // Criar response mock para capturar resultado
    const mockRes = {
      ...res,
      status: (code: number) =>
        ({ json: (data: any) => ({ code, data }) } as any),
      json: (data: any) => ({ data }),
      send: (data: any) => ({ data }),
    } as unknown as Response;

    const mockNext = (err?: any) => {
      if (err) reject(err);
      else resolve({ success: true, chunk });
    };

    // Timeout para processamento do chunk (10s)
    const timeout = setTimeout(() => {
      reject(new Error("Chunk processing timeout"));
    }, 10000);

    Promise.resolve(originalHandler(chunkReq, mockRes, mockNext))
      .then((result: any) => {
        clearTimeout(timeout);
        resolve(result || { success: true, chunk });
      })
      .catch((error: any) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function generateTimeoutExplanation(
  req: Request,
  telemetry: TelemetryData
): string {
  const reasons = [];

  // Análise baseada na duração
  if (telemetry.duration && telemetry.duration > 20000) {
    reasons.push("Processamento excessivamente longo");
  } else if (telemetry.duration && telemetry.duration > 10000) {
    reasons.push("Processamento demorado");
  }

  // Análise do payload
  const bodySize = JSON.stringify(req.body || {}).length;
  if (bodySize > 1000000) {
    // 1MB
    reasons.push("Payload muito grande (>1MB)");
  } else if (bodySize > 100000) {
    // 100KB
    reasons.push("Payload grande (>100KB)");
  }

  // Análise de tentativas
  if (telemetry.retryAttempts >= 3) {
    reasons.push("Múltiplas tentativas de retry falharam");
  }

  // Análise de chunks
  if (telemetry.totalChunks && telemetry.totalChunks > 1) {
    if (telemetry.chunksProcessed === telemetry.totalChunks) {
      reasons.push("Processamento em partes funcionou, mas lento");
    } else {
      reasons.push("Falha no processamento em partes");
    }
  }

  // Análise de bottlenecks
  if (telemetry.bottlenecks.length > 0) {
    reasons.push(`Gargalos identificados: ${telemetry.bottlenecks.join(", ")}`);
  }

  // Fallback
  if (reasons.length === 0) {
    reasons.push(
      "Timeout devido a processamento complexo ou recursos insuficientes"
    );
  }

  return reasons.join(". ");
}

interface FailoverOptions {
  fallback?: RequestHandler;
}

export const Failover = (options: FailoverOptions = {}): MethodDecorator => {
  const fallbackResponse: RequestHandler =
    options.fallback ??
    ((_req, res) => {
      res.status(503).json({ error: "Serviço temporariamente indisponível" });
    });

  return createHandlerDecorator((handler) => {
    const execute: ResilientHandler = async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        console.warn("[Failover] acionado, chamando fallback:", error);
        try {
          await Promise.resolve(fallbackResponse(req, res, next));
        } catch (fallbackError) {
          next(fallbackError);
        }
      }
    };

    return execute;
  });
};
