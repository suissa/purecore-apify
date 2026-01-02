import { IncomingMessage, ServerResponse } from "http";

// --- 1. CORE ALGORITHMS (Zero Deps) ---
// Reutilizando lógica similar ao heal.ts mas otimizada para caminhos URL

const RouterAlgorithms = {
  levenshtein(a: string, b: string): number {
    const aLen = a.length;
    const bLen = b.length;
    if (aLen === 0) return bLen;
    if (bLen === 0) return aLen;

    const matrix: number[][] = [];
    for (let i = 0; i <= bLen; i++) {
      matrix[i] = new Array(aLen + 1);
      matrix[i]![0] = i;
    }
    for (let j = 0; j <= aLen; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= bLen; i++) {
      for (let j = 1; j <= aLen; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1,
            Math.min(matrix[i]![j - 1]! + 1, matrix[i - 1]![j]! + 1)
          );
        }
      }
    }
    return matrix[bLen]![aLen]!;
  },
};

// --- 2. INTERFACES UNIVERSAIS ---

export interface UniversalRequest {
  path: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
  query?: any;
  // Permite mutação para "cura" (ex: reescrever url)
  url?: string;
  originalUrl?: string;
}

export interface UniversalResponse {
  // Capacidade de escrever headers
  setHeader(name: string, value: string | number | readonly string[]): this;
  // Capacidade de status
  status(code: number): this;
  // Capacidade de enviar JSON
  json(body: any): void;
  // Capacidade de Stream (AON Glass Box)
  write(chunk: any): boolean;
  end(): void;
  // Referência ao objeto nativo (para casos extremos)
  raw?: ServerResponse;
}

export type NextFunction = (err?: any) => void;

export interface IntentRouterOptions {
  // Lista de rotas válidas para comparação Fuzzy
  validRoutes: string[];
  // Limiar de certeza para redirecionar (0 a 1). Default: 0.8
  fuzzyThreshold?: number;
  // Ativa modo AON (Glass Box)
  enableAON?: boolean;
}

// --- 3. INTENT LOGIC (O Cérebro) ---

class IntentHealer {
  constructor(private options: IntentRouterOptions) {}

  /**
   * Tenta corrigir o caminho (Path Healing)
   */
  healPath(
    currentPath: string
  ): { corrected: string; confidence: number } | null {
    // Remove query string e trailing slash para comparação
    const cleanPath = currentPath.split("?")[0].replace(/\/+$/, "");

    // Se já é válido, ignora
    if (this.options.validRoutes.includes(cleanPath)) return null;

    let bestMatch = "";
    let minDistance = Infinity;

    for (const route of this.options.validRoutes) {
      const distance = RouterAlgorithms.levenshtein(cleanPath, route);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = route;
      }
    }

    // Calcula score de similaridade
    const maxLength = Math.max(cleanPath.length, bestMatch.length);
    const confidence = 1 - minDistance / maxLength;

    const threshold = this.options.fuzzyThreshold || 0.8;

    if (confidence >= threshold) {
      return { corrected: bestMatch, confidence };
    }

    return null;
  }

  /**
   * Tenta corrigir o método HTTP (Method Inference)
   */
  healMethod(req: UniversalRequest): string | null {
    // Cenário: GET com Body -> Intenção provável é POST ou PUT
    if (req.method === "GET" && req.body && Object.keys(req.body).length > 0) {
      // Heurística simples: Se tem ID no corpo, talvez seja PUT, senão POST.
      // Aqui simplificamos para POST como "criação/ação"
      return "POST";
    }
    return null;
  }

  /**
   * Detecta se o cliente quer AON (Glass Box)
   */
  shouldStream(req: UniversalRequest): boolean {
    if (!this.options.enableAON) return false;
    const accept = req.headers["accept"];
    if (typeof accept === "string" && accept.includes("application/x-ndjson")) {
      return true;
    }
    return false;
  }
}

// --- 4. MIDDLEWARE AGNOSTICO ---

const coreMiddleware = async (
  req: UniversalRequest,
  res: UniversalResponse,
  next: NextFunction,
  options: IntentRouterOptions
) => {
  const healer = new IntentHealer(options);
  const isAON = healer.shouldStream(req);

  // --- AON START: Abrindo a Caixa de Vidro ---
  if (isAON) {
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Connection", "keep-alive");

    // Envia o primeiro pensamento
    res.write(
      JSON.stringify({
        type: "intent_analysis",
        status: "analyzing_request",
        timestamp: Date.now(),
      }) + "\n"
    );
  }

  // --- HEALING 1: Path Correction ---
  const pathFix = healer.healPath(req.path);
  if (pathFix) {
    const msg = `Typo detected. Redirecting '${req.path}' to '${
      pathFix.corrected
    }' (${(pathFix.confidence * 100).toFixed(0)}% match)`;

    if (isAON) {
      res.write(
        JSON.stringify({
          type: "healing",
          action: "route_correction",
          description: msg,
        }) + "\n"
      );
    }

    // A mágica: Reescrevemos a URL internamente antes do framework ver
    req.url = pathFix.corrected;
    res.setHeader("X-Intent-Correction", `route-fixed; from=${req.path}`);
  }

  // --- HEALING 2: Method Inference ---
  const methodFix = healer.healMethod(req);
  if (methodFix) {
    const msg = `Method mismatch. Treating GET with body as ${methodFix}.`;

    if (isAON) {
      res.write(
        JSON.stringify({
          type: "healing",
          action: "method_inference",
          description: msg,
        }) + "\n"
      );
    }

    req.method = methodFix;
    res.setHeader("X-Method-Correction", `method-fixed; to=${methodFix}`);
  }

  // Segue para o próximo handler (ou rota real)
  next();
};

// --- 5. FACTORY & ADAPTERS (Framework Specifics) ---

export class IntentRouterFactory {
  /**
   * Cria middleware para Express.js
   */
  static createExpress(options: IntentRouterOptions) {
    return (req: any, res: any, next: any) => {
      // Adapter: Express -> Universal
      const universalReq: UniversalRequest = {
        path: req.path,
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query,
        // Getters/Setters para refletir mutação no objeto original
        get url() {
          return req.url;
        },
        set url(val) {
          req.url = val;
        },
        get originalUrl() {
          return req.originalUrl;
        },
      };

      const universalRes: UniversalResponse = {
        setHeader: (n, v) => res.setHeader(n, v),
        status: (c) => res.status(c),
        json: (b) => res.json(b),
        write: (c) => res.write(c),
        end: () => res.end(),
        raw: res,
      };

      coreMiddleware(universalReq, universalRes, next, options);
    };
  }

  /**
   * Cria middleware para Fastify
   */
  static createFastify(options: IntentRouterOptions) {
    return (req: any, reply: any, done: any) => {
      // Adapter: Fastify -> Universal
      const universalReq: UniversalRequest = {
        path: req.url.split("?")[0], // Fastify raw url
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query,
        get url() {
          return req.url;
        },
        set url(val) {
          req.url = val;
        }, // Fastify permite mutar req.url
      };

      const universalRes: UniversalResponse = {
        setHeader: (n, v) => reply.header(n, v),
        status: (c) => reply.code(c),
        json: (b) => reply.send(b),
        write: (c) => reply.raw.write(c), // Acesso ao stream nativo Node
        end: () => reply.raw.end(),
        raw: reply.raw,
      };

      coreMiddleware(universalReq, universalRes, done, options);
    };
  }
}
