import { RawFilterString, MongoQuery } from "../types";

/**
 * Intent-Based Filter Parser
 * Transforma strings de busca complexas em objetos estruturados (MongoDB-style).
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
   */
  private static parseRecursive(input: string): any {
    input = input.trim();

    // Se está totalmente envolto em parênteses, remove e processa conteúdo
    if (
      input.startsWith("(") &&
      this.getMatchingParenthesis(input, 0) === input.length - 1
    ) {
      return this.parseRecursive(input.slice(1, -1));
    }

    // Normalização básica de tokens para facilitar o split sem quebrar strings
    // Ordem de precedência: OR (menor) -> AND -> NOT (maior)

    // Busca por OR fora de parênteses
    const orIndex = this.findOperatorOutsideParens(
      input,
      /&OR&|\sOR\s|,|\|\|/i
    );
    if (orIndex !== -1) {
      const parts = this.splitOutsideParens(input, /&OR&|\sOR\s|,|\|\|/i);
      return { $or: parts.map((p) => this.parseRecursive(p)) };
    }

    // Busca por AND fora de parênteses
    const andIndex = this.findOperatorOutsideParens(
      input,
      /&AND&|\sAND\s|;|&&/i
    );
    if (andIndex !== -1) {
      const parts = this.splitOutsideParens(input, /&AND&|\sAND\s|;|&&/i);
      return { $and: parts.map((p) => this.parseRecursive(p)) };
    }

    // Busca por NOR fora de parênteses
    const norIndex = this.findOperatorOutsideParens(input, /&NOR&|\sNOR\s/i);
    if (norIndex !== -1) {
      const parts = this.splitOutsideParens(input, /&NOR&|\sNOR\s/i);
      return { $nor: parts.map((p) => this.parseRecursive(p)) };
    }

    // Busca por NOT no início
    if (input.match(/^(!|&NOT&|\sNOT\s)/i)) {
      const content = input.replace(/^(!|&NOT&|\sNOT\s)/i, "").trim();
      const parsed = this.parseRecursive(content);
      // Se for uma expressão simples, aplica $not no nível do campo
      // Se for complexa, aplica logicamente (depende da implementação do backend)
      return { $not: parsed };
    }

    // Se chegou aqui, deve ser uma expressão atômica (campo op valor)
    return this.parseExpression(input);
  }

  private static findOperatorOutsideParens(
    input: string,
    regex: RegExp
  ): number {
    let depth = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === "(") depth++;
      else if (input[i] === ")") depth--;
      else if (depth === 0) {
        const remaining = input.slice(i);
        const match = remaining.match(regex);
        if (match && match.index === 0) return i;
      }
    }
    return -1;
  }

  private static splitOutsideParens(input: string, regex: RegExp): string[] {
    const parts: string[] = [];
    let depth = 0;
    let lastIndex = 0;

    for (let i = 0; i < input.length; i++) {
      if (input[i] === "(") depth++;
      else if (input[i] === ")") depth--;
      else if (depth === 0) {
        const remaining = input.slice(i);
        const match = remaining.match(regex);
        if (match && match.index === 0) {
          parts.push(input.slice(lastIndex, i).trim());
          i += match[0].length - 1;
          lastIndex = i + 1;
        }
      }
    }
    parts.push(input.slice(lastIndex).trim());
    return parts;
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
    // Suporta: == (RSQL), =, !=, >=, <=, >, <, : (contains)
    const match = expr.match(
      /^([a-zA-Z0-9_.]+)\s*(==|!=|>=|<=|=|>|<|:)\s*(.+)$/
    );

    if (!match) {
      // Fallback: se for só uma palavra, assume que é um campo booleano
      const key = expr.trim();
      if (key.match(/^[a-zA-Z0-9_.]+$/)) {
        return { [key]: true };
      }
      return {};
    }

    const [, key, op, rawVal] = match;
    const value = this.inferType(rawVal);

    // Tradução de Operadores para sintaxe MongoDB
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
    if (!isNaN(Number(val)) && val !== "") return Number(val);

    // Remove aspas
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      return val.slice(1, -1);
    }
    return val;
  }
}
