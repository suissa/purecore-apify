import { createHandlerDecorator } from "./base";
import { AdvancedFilterParser } from "../middlewares/filter-parser";
import { RequestHandler } from "../types";

/**
 * @Filter
 * Decorator que habilita o parsing automático de filtros complexos (Intent-Based).
 * Suporta múltiplas dialéticas (SQL-like, RSQL, Custom DSL) e parênteses aninhados.
 *
 * Exemplo: ?filter=[(age>18&AND&status=active)&OR&role=admin]
 * Resultado: req.query.where = { $or: [ { $and: [...] }, { role: { $eq: 'admin' } } ] }
 *
 * @param queryKey A chave da query string que contém o filtro (default: 'filter')
 * @returns MethodDecorator
 */
export const Filter = (queryKey: string = "filter"): MethodDecorator => {
  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      // 1. Extração do filtro da query string
      const rawFilter = req.query?.[queryKey];

      if (
        rawFilter &&
        typeof rawFilter === "string" &&
        rawFilter.trim() !== ""
      ) {
        try {
          // 2. Parsing usando a AdvancedFilterParser (Recursive Descent)
          // O resultado é injetado em req.query.where para ser consumido por DAOs/Repositórios
          (req.query as any).where = AdvancedFilterParser.parse(rawFilter);

          // 3. Integração com AON (Adaptive Observability Negotiation) se disponível
          const aon = (req as any).aon;
          if (aon && typeof aon.addCorrection === "function") {
            aon.addCorrection(
              `✨ Logic DSL parsed from query parameter '${queryKey}'`
            );
          }
        } catch (error) {
          // Fail-safe: Em caso de erro no parsing, apenas registramos e deixamos seguir
          // O AON cuidará de alertar se isso causar problemas na execução
          console.error(`[FilterDecorator] Error parsing filter logic:`, error);
        }
      }

      return handler(req, res, next);
    };

    return execute;
  });
};
