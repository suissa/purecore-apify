import { IncomingMessage, ServerResponse } from "http";

// --- 1. ALGORITMOS DE CURA (ZERO DEPS) ---
// Trazidos do SemanticHealer para contexto local

const Algorithms = {
  levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= b.length; i++) matrix[i]![0] = i;
    for (let j = 0; j <= a.length; j++) matrix[0]![j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j] + 1,
          matrix[i]![j - 1] + 1,
          matrix[i - 1]![j - 1] + cost
        );
      }
    }
    return matrix[b.length]![a.length];
  },

  soundex(s: string): string {
    const f = s.charAt(0).toLowerCase();
    const a = s.toLowerCase().split("");
    const codes: any = {
      a: 0,
      e: 0,
      i: 0,
      o: 0,
      u: 0,
      y: 0,
      h: 0,
      w: 0,
      b: 1,
      f: 1,
      p: 1,
      v: 1,
      c: 2,
      g: 2,
      j: 2,
      k: 2,
      q: 2,
      s: 2,
      x: 2,
      z: 2,
      d: 3,
      t: 3,
      l: 4,
      m: 5,
      n: 5,
      r: 6,
    };
    const r =
      f +
      a
        .slice(1)
        .map((v) => codes[v])
        .filter((v, i, arr) => (i === 0 ? v !== codes[f] : v !== arr[i - 1]))
        .filter((v) => v !== 0)
        .join("");
    return (r + "000").slice(0, 4).toUpperCase();
  },
};

// --- 2. DICIONÁRIOS DE INTENÇÃO ---

const INTENT_DICTIONARY = {
  pagination: {
    canonical: ["page", "limit", "offset"],
    synonyms: [
      "pg",
      "p",
      "pagina",
      "pag",
      "per_page",
      "size",
      "qtd",
      "quantity",
      "skip",
      "lmt",
    ],
  },
  sort: {
    canonical: ["sort", "order", "orderBy"],
    synonyms: ["srt", "ordenar", "classificar", "by", "direction", "dir"],
  },
  search: {
    canonical: ["q", "search", "query"],
    synonyms: ["busca", "procurar", "find", "keyword", "termo", "s"],
  },
  fields: {
    canonical: ["fields", "select", "attributes"],
    synonyms: ["campos", "cols", "columns", "only", "project", "show"],
  },
};

// Lista plana de todos os canônicos para Fuzzy matching rápido
const ALL_CANONICALS = [
  ...INTENT_DICTIONARY.pagination.canonical,
  ...INTENT_DICTIONARY.sort.canonical,
  ...INTENT_DICTIONARY.search.canonical,
  ...INTENT_DICTIONARY.fields.canonical,
];

// --- 3. MIDDLEWARE ---

export class GetIntentMiddleware {
  /**
   * Função principal do Middleware
   */
  static async handle(req: any, res: any, next: () => void) {
    // 1. Detectar Modo AON (Glass Box)
    const accept = req.headers["accept"] || "";
    const isAON = accept.includes("application/x-ndjson");

    // Injetar helper de log na requisição para uso posterior
    req.aon = {
      active: isAON,
      log: (event: any) => {
        if (isAON) {
          if (!res.headersSent) {
            res.setHeader("Content-Type", "application/x-ndjson");
            res.setHeader("Transfer-Encoding", "chunked");
            res.setHeader("Connection", "keep-alive");
          }
          res.write(JSON.stringify(event) + "\n");
        }
      },
    };

    if (isAON) {
      req.aon.log({
        type: "status",
        msg: "Intercepting GET Request for Intent Analysis...",
      });
    }

    // 2. Extrair Query String Crua
    const rawQueryString = req.url.split("?")[1];

    if (!rawQueryString) {
      req.intentQuery = {};
      return next();
    }

    // 3. Processar a Query com Heurísticas
    const { healedQuery, corrections } = await this.parseAndHeal(
      rawQueryString
    );

    // 4. Reportar Correções via AON
    corrections.forEach((c) => {
      req.aon.log({
        type: "healing",
        severity: "info",
        action: "query_correction",
        detail: c,
      });
    });

    // 5. Substituir a query "burra" do framework pela nossa query "inteligente"
    req.query = healedQuery;
    req.intentQuery = healedQuery;

    if (Object.keys(healedQuery).length > 0 && isAON) {
      req.aon.log({
        type: "status",
        msg: "Query parsed successfully via Intent Engine.",
      });
    }

    next();
  }

  /**
   * O Motor de Parsing e Cura
   */
  private static async parseAndHeal(rawString: string) {
    const healedQuery: any = {};
    const corrections: string[] = [];
    const decodedString = decodeURIComponent(rawString);

    let remainingString = decodedString;
    const filterKeyMatch = decodedString.match(
      /(?:^|&)(filter|search|q|busca)=\[?(.*)/i
    );

    if (filterKeyMatch) {
      const key = filterKeyMatch[1];
      const startOfValue = filterKeyMatch[2]!;

      let filterValue = "";
      if (startOfValue.startsWith("[")) {
        let depth = 0;
        let i = 0;
        for (; i < startOfValue.length; i++) {
          if (startOfValue[i] === "[") depth++;
          if (startOfValue[i] === "]") depth--;
          if (depth === 0) break;
        }
        filterValue = startOfValue.slice(0, i + 1);
      } else {
        const nextAmp = startOfValue.indexOf("&");
        if (nextAmp === -1) {
          filterValue = startOfValue;
        } else {
          const nextPart = startOfValue.slice(nextAmp + 1);
          if (
            nextPart.includes("=") &&
            !nextPart.startsWith("AND&") &&
            !nextPart.startsWith("OR&")
          ) {
            filterValue = startOfValue.slice(0, nextAmp);
          } else {
            filterValue = startOfValue;
          }
        }
      }

      try {
        const { AdvancedFilterParser } = await import("./filter-parser");
        healedQuery.where = AdvancedFilterParser.parse(filterValue);
        corrections.push(
          `Advanced Filter DSL detected in '${key}'. Parsed into structured 'where' clause.`
        );

        remainingString = decodedString
          .replace(`${key}=${filterValue}`, "")
          .replace(/^&|&$/, "");
      } catch (err) {
        // Fallback or ignore
      }
    }

    const parts = remainingString.split("&");

    for (const part of parts) {
      if (!part) continue;

      const match = part.match(
        /^([a-zA-Z0-9._\[\]]+)([^a-zA-Z0-9._\[\]]+)(.*)$/
      );

      let rawKey, separator, rawValue;

      if (match) {
        rawKey = match[1]!;
        separator = match[2]!;
        rawValue = match[3]!;
      } else {
        rawKey = part;
        separator = "=";
        rawValue = "true";
      }

      const { finalKey, correction } = this.healKey(rawKey);
      if (correction) corrections.push(correction);

      const finalValue = this.parseValue(finalKey, rawValue, separator);

      this.setDeep(healedQuery, finalKey, finalValue);

      if (separator !== "=" && separator !== ":") {
        corrections.push(
          `Inferred operator '${separator}' for key '${finalKey}'`
        );
        if (!healedQuery._operators) healedQuery._operators = {};
        healedQuery._operators[finalKey] = separator;
      }
    }

    return { healedQuery, corrections };
  }

  private static healKey(rawKey: string): {
    finalKey: string;
    correction?: string;
  } {
    const cleanKeyBase = rawKey.split("[")[0]!.split(".")[0]!;

    for (const category of Object.values(INTENT_DICTIONARY)) {
      if (category.canonical.includes(cleanKeyBase))
        return { finalKey: rawKey };

      const synonymIndex = category.synonyms.indexOf(cleanKeyBase);
      if (synonymIndex > -1) {
        const correctedBase = category.canonical[0]!;
        const reconstructed = rawKey.replace(cleanKeyBase, correctedBase);
        return {
          finalKey: reconstructed,
          correction: `Synonym mapped: '${rawKey}' -> '${reconstructed}'`,
        };
      }
    }

    let bestMatch = null;
    let bestDist = Infinity;

    for (const canonical of ALL_CANONICALS) {
      const dist = Algorithms.levenshtein(cleanKeyBase, canonical);
      if (dist <= 2 && dist < cleanKeyBase.length / 2) {
        if (dist < bestDist) {
          bestDist = dist;
          bestMatch = canonical;
        }
      }
    }

    if (bestMatch) {
      const reconstructed = rawKey.replace(cleanKeyBase, bestMatch);
      return {
        finalKey: reconstructed,
        correction: `Fuzzy typo fixed: '${rawKey}' -> '${reconstructed}'`,
      };
    }

    return { finalKey: rawKey };
  }

  private static parseValue(
    key: string,
    value: string,
    separator: string
  ): any {
    if (INTENT_DICTIONARY.fields.canonical.some((k) => key.startsWith(k))) {
      const matches = value.match(/[a-zA-Z0-9]+/g);
      return matches || [];
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      const content = value.slice(1, -1);
      return content.split(",").map((v) => v.trim());
    }

    if (value.includes(",") && !value.includes(" ")) {
      return value.split(",");
    }

    if (value === "true") return true;
    if (value === "false") return false;
    if (!isNaN(Number(value)) && !isNaN(parseFloat(value)))
      return Number(value);

    return value;
  }

  private static setDeep(obj: any, path: string, value: any) {
    const cleanPath = path.replace(/\[(\d+)\]/g, ".$1");
    const keys = cleanPath.split(".");

    let current = obj;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      const isLast = i === keys.length - 1;

      if (isLast) {
        if (current.hasOwnProperty(key)) {
          if (!Array.isArray(current[key])) {
            current[key] = [current[key]];
          }
          current[key].push(value);
        } else {
          current[key] = value;
        }
      } else {
        if (!current[key]) {
          const nextKey = keys[i + 1]!;
          current[key] = isNaN(Number(nextKey)) ? {} : [];
        }
        current = current[key];
      }
    }
  }
}

export const intentGetter = () => {
  return async (req: any, res: any, next: any) => {
    await GetIntentMiddleware.handle(req, res, next);
  };
};
