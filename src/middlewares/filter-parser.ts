import { RawFilterString, MongoQuery } from "../types";

/**
 * Intent-Based Filter Parser
 * Transforma strings de busca complexas em objetos estruturados (MongoDB-style).
 * Suporta tokens aninhados, parênteses e proteção de strings.
 */
export class AdvancedFilterParser {
  /**
   * Converte uma string de filtro em um objeto de query estruturado.
   */
  static parse(queryString: string): MongoQuery {
    if (!queryString) return {} as MongoQuery;

    let cleaned = queryString.trim();
    // Remove colchetes externos se existirem
    if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    return this.parseRecursive(cleaned) as MongoQuery;
  }

  /**
   * Parser recursivo para suportar parênteses e precedência.
   * Ordem de precedência: OR (menor) -> AND -> NOR -> NOT (maior)
   */
  private static parseRecursive(input: string): any {
    input = input.trim();

    // Tratamento de parênteses externos
    if (input.startsWith("(")) {
      const matchEnd = this.getMatchingParenthesis(input, 0);
      if (matchEnd === input.length - 1) {
        return this.parseRecursive(input.slice(1, -1));
      }
    }

    // Procura por operadores fora de parênteses e fora de strings
    // 1. OR (| , || &OR& OR)
    const orSplit = this.splitByOperator(input, /&OR&|\sOR\s|,|\|\|/i);
    if (orSplit.length > 1) {
      return { $or: orSplit.map((p) => this.parseRecursive(p)) };
    }

    // 2. AND (& ; && &AND& AND)
    const andSplit = this.splitByOperator(input, /&AND&|\sAND\s|;|&&/i);
    if (andSplit.length > 1) {
      return { $and: andSplit.map((p) => this.parseRecursive(p)) };
    }

    // 3. NOR (&NOR& NOR)
    const norSplit = this.splitByOperator(input, /&NOR&|\sNOR\s/i);
    if (norSplit.length > 1) {
      return { $nor: norSplit.map((p) => this.parseRecursive(p)) };
    }

    // 4. NOT (! &NOT& NOT)
    if (input.match(/^(!|&NOT&|\sNOT\s)/i)) {
      const content = input.replace(/^(!|&NOT&|\sNOT\s)/i, "").trim();
      return { $not: this.parseRecursive(content) };
    }

    // Expressão atômica
    return this.parseExpression(input);
  }

  /**
   * Divide a string por um operador, respeitando parênteses e aspas.
   */
  private static splitByOperator(
    input: string,
    operatorRegex: RegExp
  ): string[] {
    const parts: string[] = [];
    let depth = 0;
    let inQuotes: string | null = null;
    let lastIndex = 0;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      // Handle quotes
      if ((char === '"' || char === "'") && input[i - 1] !== "\\") {
        if (!inQuotes) inQuotes = char;
        else if (inQuotes === char) inQuotes = null;
      }

      if (inQuotes) continue;

      // Handle parentheses
      if (char === "(") depth++;
      else if (char === ")") depth--;

      if (depth === 0) {
        const remaining = input.slice(i);
        const match = remaining.match(operatorRegex);
        if (match && match.index === 0) {
          parts.push(input.slice(lastIndex, i).trim());
          i += match[0].length - 1;
          lastIndex = i + 1;
        }
      }
    }

    if (parts.length > 0) {
      parts.push(input.slice(lastIndex).trim());
    }

    return parts.length > 0 ? parts : [input];
  }

  private static getMatchingParenthesis(str: string, start: number): number {
    let depth = 0;
    for (let i = start; i < str.length; i++) {
      if (str[i] === "(") depth++;
      if (str[i] === ")") depth--;
      if (depth === 0) return i;
    }
    return -1;
  }

  private static parseExpression(expr: string): any {
    // Regex para capturar: chave, operador, valor
    // Suporta identificadores com pontos, colchetes e operadores diversos
    const match = expr.match(
      /^([a-zA-Z0-9_.]+)\s*(==|!=|>=|<=|=|>|<|:)\s*(.+)$/
    );

    if (!match) {
      const key = expr.trim();
      // Heurística para booleano implícito: "isActive" -> { isActive: true }
      if (key.match(/^[a-zA-Z0-9_.]+$/)) {
        return { [key]: true };
      }
      return {};
    }

    const [, key, op, rawVal] = match;
    if (!key) return {};
    const value = this.inferType(rawVal!);

    switch (op) {
      case "==":
      case "=":
        return { [key]: { $eq: value } };
      case "!=":
        return { [key]: { $ne: value } };
      case ">":
        return { [key]: { $gt: value } };
      case "<":
        return { [key]: { $lt: value } };
      case ">=":
        return { [key]: { $gte: value } };
      case "<=":
        return { [key]: { $lte: value } };
      case ":":
        return { [key]: { $regex: value, $options: "i" } };
      default:
        return { [key]: value };
    }
  }

  private static inferType(val: string): any {
    val = val.trim();
    if (val === "true") return true;
    if (val === "false") return false;
    if (val === "null") return null;

    // Remove aspas se presentes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      return val.slice(1, -1);
    }

    if (!isNaN(Number(val)) && val !== "") return Number(val);
    return val;
  }
}
