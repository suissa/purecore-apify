/**
 * Tipos Nominais para Semântica Estrita
 */
export type RawFilterString = string & { readonly __brand: unique symbol };
export type MongoQuery = Record<string, any> & {
  readonly __brand: unique symbol;
};
export type LogicalToken = "$$AND$$" | "$$OR$$" | "$$NOT$$";

/**
 * Constantes de Mapeamento Simbólico
 * A ordem importa: sufixos compostos (!.) devem vir antes dos simples
 */
const SYMBOL_MAP = {
  ".-!.": " $$OR$$ $$NOT$$ ", // OR NOT
  ".=!.": " $$AND$$ $$NOT$$ ", // AND NOT
  ".-.": " $$OR$$ ", // OR
  ".=.": " $$AND$$ ", // AND
  ".!.": " $$NOT$$ ", // NOT (Unary)
} as const;

/**
 * Funções Atômicas Puras
 */

/**
 * 1. Normalizer: Converte símbolos visuais em tokens lógicos processáveis
 */
const normalizeSymbols = (input: string): string => {
  return Object.entries(SYMBOL_MAP)
    .reduce((acc, [symbol, token]) => {
      // Escapa o ponto (.) para regex e substitui globalmente
      const regex = new RegExp(symbol.replace(/\./g, "\\."), "g");
      return acc.replace(regex, token);
    }, input)
    .trim();
};

/**
 * 2. Value Inference: Converte string para tipo primitivo (number, boolean, null)
 */
const inferValue = (val: string): string | number | boolean | null => {
  const v = val.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (!isNaN(Number(v)) && v !== "") return Number(v);
  // Remove aspas se existirem
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
};

/**
 * 3. Condition Parser: Transforma "age>18" em { age: { $gt: 18 } }
 * Suporta negação imediata ($not) se detectada
 */
const parseCondition = (
  condition: string,
  negate: boolean = false
): Record<string, any> => {
  // Regex: captura (chave)(operador)(valor)
  // Operadores: !=, >=, <=, =, >, <, : (contains)
  const match = condition.match(/^([a-zA-Z0-9_.]+)(!=|>=|<=|=|>|<|:)(.*)$/);

  if (!match) {
    // Heurística para booleano implícito: "active" -> { active: true }
    return negate ? { [condition]: { $ne: true } } : { [condition]: true };
  }

  const [, key, op, rawVal] = match;
  const value = inferValue(rawVal);
  let queryOp: Record<string, any> = {};

  switch (op) {
    case "=":
      queryOp = { $eq: value };
      break;
    case "!=":
      queryOp = { $ne: value };
      break;
    case ">":
      queryOp = { $gt: value };
      break;
    case "<":
      queryOp = { $lt: value };
      break;
    case ">=":
      queryOp = { $gte: value };
      break;
    case "<=":
      queryOp = { $lte: value };
      break;
    case ":":
      queryOp = { $regex: value, $options: "i" };
      break;
  }

  return negate ? { [key]: { $not: queryOp } } : { [key]: queryOp };
};

/**
 * 4. Group Parser: Processa lógica AND e delega negação para a condição
 */
const parseAndGroup = (groupStr: string): Record<string, any> => {
  const parts = groupStr.split(" $$AND$$ ");

  const queries = parts.map((part) => {
    const isNegated = part.includes("$$NOT$$");
    const cleanPart = part.replace("$$NOT$$", "").trim();
    return parseCondition(cleanPart, isNegated);
  });

  return queries.length === 1 ? queries[0] : { $and: queries };
};

/**
 * 5. Main Pipeline: Orquestra a transformação
 */
export const parseSymbolicFilter = (filter: RawFilterString): MongoQuery => {
  if (!filter) return {} as MongoQuery;

  // Pipeline Funcional
  const normalized = normalizeSymbols(filter);

  // Divide por OR (Precedência: OR separa grupos de ANDs)
  const orGroups = normalized.split(" $$OR$$ ");

  const result = orGroups.map(parseAndGroup);

  const finalQuery = result.length === 1 ? result[0] : { $or: result };

  return finalQuery as MongoQuery;
};

// --- TESTE DE USO (Mental Model Check) ---
/*
  Input: "status=active.=.role=admin.-!.age<18"
  
  Leitura Mental: 
  1. "status é active"
  2. .=. (AND) "role é admin"
  3. .-!. (OR NOT) "age menor que 18" -> Ou seja: OU (idade NÃO É menor que 18 / idade >= 18)

  Processo:
  1. Normalize: "status=active $$AND$$ role=admin $$OR$$ $$NOT$$ age<18"
  2. Split OR: 
     - Grupo 1: "status=active $$AND$$ role=admin"
     - Grupo 2: "$$NOT$$ age<18"
  3. Parse:
     - Grupo 1: { $and: [{ status: 'active' }, { role: 'admin' }] }
     - Grupo 2: { age: { $not: { $lt: 18 } } }
  4. Result: { $or: [ ...Grupo1, ...Grupo2 ] }
*/
