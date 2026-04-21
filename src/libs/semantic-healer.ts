import { z } from "zod";

// --- ALGORITMOS NATIVOS (ZERO DEPS) ---

const Algorithms = {
  /**
   * Distância de Levenshtein (Edições necessárias para transformar A em B)
   */
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

  /**
   * Soundex (Fonética em Inglês - padrão industrial)
   * Transforma "Phone" e "Fone" no mesmo código.
   */
  soundex(s: string): string {
    const a = s.toLowerCase().split("");
    const f = a.shift();
    let r = "";
    const codes: Record<string, number> = {
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

    r =
      (f || "") +
      a
        .map((v) => codes[v] || 0)
        .filter((v, i, arr) =>
          i === 0 ? v !== (codes[f!] || 0) : v !== arr[i - 1]
        )
        .filter((v) => v !== 0)
        .join("");

    return (r + "000").slice(0, 4).toUpperCase();
  },

  /**
   * Jaro-Winkler (Bom para nomes curtos e erros de digitação no final)
   * Retorna similaridade entre 0 e 1.
   */
  jaroWinkler(s1: string, s2: string): number {
    let m = 0;
    if (s1.length === 0 || s2.length === 0) return 0;
    if (s1 === s2) return 1;

    const range = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length);
    const s2Matches = new Array(s2.length);

    for (let i = 0; i < s1.length; i++) {
      const low = i >= range ? i - range : 0;
      const high = i + range <= s2.length ? i + range : s2.length - 1;

      for (let j = low; j <= high; j++) {
        if (s1Matches[i] !== true && s2Matches[j] !== true && s1[i] === s2[j]) {
          ++m;
          s1Matches[i] = s1Matches[i] = s2Matches[j] = true;
          break;
        }
      }
    }
    if (m === 0) return 0;
    let k = 0;
    let n_trans = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s1Matches[i] === true) {
        for (let j = k; j < s2.length; j++) {
          if (s2Matches[j] === true) {
            k = j + 1;
            if (s1[i] !== s2[j]) ++n_trans;
            break;
          }
        }
      }
    }
    let weight = (m / s1.length + m / s2.length + (m - n_trans / 2) / m) / 3;
    let l = 0;
    const p = 0.1;
    if (weight > 0.7) {
      while (s1[l] && s1[l] === s2[l] && l < 4) ++l;
      weight = weight + l * p * (1 - weight);
    }
    return weight;
  },
};

// --- DICIONÁRIO DE SINÔNIMOS ---
const SYNONYMS: Record<string, string[]> = {
  // Pessoais
  name: [
    "nome",
    "full_name",
    "fullname",
    "nome_completo",
    "cliente",
    "customer",
  ],
  email: ["e-mail", "mail", "correo", "endereco_eletronico", "login"],
  age: ["idade", "anos", "nascimento_anos"],
  birthDate: ["data_nascimento", "nascimento", "dob", "aniversario", "born_at"],

  // Endereço
  zipCode: ["cep", "postal_code", "codigo_postal", "zip"],
  address: ["endereco", "rua", "logradouro", "street"],
  city: ["cidade", "municipio", "town"],
  state: ["estado", "uf", "province", "region"],

  // Sistema
  role: ["cargo", "permissao", "funcao", "tipo_usuario", "group"],
  active: ["ativo", "habilitado", "status", "is_active", "enabled"],
};

export class SemanticHealer {
  /**
   * O Método Principal de Cura
   */
  static heal<T extends z.ZodRawShape>(
    rawData: Record<string, any>,
    schema: z.ZodObject<T>
  ): z.infer<typeof schema> {
    const healedData: Record<string, any> = {};
    const schemaShape = schema.shape;
    const schemaKeys = Object.keys(schemaShape);

    // Flattening básico (para lidar com inputs aninhados tipo { data: { user: ... } })
    const flatInput = this.flattenObject(rawData);
    const inputKeys = Object.keys(flatInput);

    // Set de chaves do schema que ainda não encontramos
    const missingSchemaKeys = new Set(schemaKeys);

    // Set de chaves do input que ainda não usamos (sobras)
    const unusedInputKeys = new Set(inputKeys);

    // --- FASE 1: Match Exato ---
    for (const key of schemaKeys) {
      if (flatInput.hasOwnProperty(key)) {
        healedData[key] = flatInput[key];
        missingSchemaKeys.delete(key);
        unusedInputKeys.delete(key);
      }
    }

    // --- FASE 2: Match por Sinônimos (Dicionário) ---
    for (const schemaKey of Array.from(missingSchemaKeys)) {
      const knownSynonyms = SYNONYMS[schemaKey] || [];

      for (const inputKey of Array.from(unusedInputKeys)) {
        // Normaliza (lowercase, remove underline)
        const normalizedInput = inputKey.toLowerCase().replace(/_/g, "");
        const normalizedSchema = schemaKey.toLowerCase();

        // Checa se inputKey contém o schemaKey ou vice-versa (ex: user_email vs email)
        const isSubstring = normalizedInput.includes(normalizedSchema);

        // Checa lista de sinônimos
        const isSynonym = knownSynonyms.some(
          (s) => normalizedInput === s.toLowerCase().replace(/_/g, "")
        );

        if (isSubstring || isSynonym) {
          console.log(
            `[Healer] Synonym Match: '${inputKey}' -> '${schemaKey}'`
          );
          healedData[schemaKey] = flatInput[inputKey];
          missingSchemaKeys.delete(schemaKey);
          unusedInputKeys.delete(inputKey);
          break; // Achou um, passa pro proximo schemaKey
        }
      }
    }

    // --- FASE 3: Match Fuzzy & Fonético (Algoritmos) ---
    for (const schemaKey of Array.from(missingSchemaKeys)) {
      let bestMatch: string | null = null;
      let bestScore = -Infinity; // Para Jaro-Winkler (maior é melhor)
      let bestDist = Infinity; // Para Levenshtein (menor é melhor)

      for (const inputKey of Array.from(unusedInputKeys)) {
        // 1. Soundex (Fonética)
        const soundexMatch =
          Algorithms.soundex(schemaKey) === Algorithms.soundex(inputKey);

        // 2. Jaro-Winkler (Similaridade)
        const jwScore = Algorithms.jaroWinkler(schemaKey, inputKey);

        // 3. Levenshtein (Distância)
        const levDist = Algorithms.levenshtein(schemaKey, inputKey);

        // Heurística combinada
        // Se a fonética bater, damos um boost gigante
        const score = jwScore + (soundexMatch ? 0.3 : 0);

        // Aceitamos se JaroWinkler > 0.85 (muito similar) ou Levenshtein <= 2 (typo leve)
        if (score > 0.85 || levDist <= 2) {
          if (score > bestScore) {
            bestScore = score;
            bestMatch = inputKey;
          }
        }
      }

      if (bestMatch) {
        console.log(
          `[Healer] Fuzzy Match: '${bestMatch}' -> '${schemaKey}' (Score: ${bestScore.toFixed(
            2
          )})`
        );
        healedData[schemaKey] = flatInput[bestMatch];
        missingSchemaKeys.delete(schemaKey);
        unusedInputKeys.delete(bestMatch);
      }
    }

    // --- FASE 4: Coerção de Tipos (Type Healing) ---
    // Tentamos converter o que achamos até agora para o tipo correto antes da fase 5
    for (const key of Object.keys(healedData)) {
      const targetSchema = schemaShape[key];
      if (targetSchema) {
        healedData[key] = this.coerceType(healedData[key], targetSchema);
      }
    }

    // --- FASE 5: Content Matching (Brute Force Inteligente) ---
    // Testa valores sobrando contra validadores dos campos faltando
    for (const schemaKey of Array.from(missingSchemaKeys)) {
      const targetSchema = schemaShape[schemaKey];

      for (const inputKey of Array.from(unusedInputKeys)) {
        const value = flatInput[inputKey];

        if (targetSchema) {
          // Tenta parsear o valor com o schema do campo
          // Precisamos tentar coagir o valor "órfão" também (ex: string '123' para number schema)
          const coercedValue = this.coerceType(value, targetSchema);
          const result = targetSchema.safeParse(coercedValue);

          if (result.success) {
            console.log(
              `[Healer] Content Match: Value of '${inputKey}' valid for '${schemaKey}'`
            );
            healedData[schemaKey] = result.data; // Usa o dado parseado/transformado
            missingSchemaKeys.delete(schemaKey);
            unusedInputKeys.delete(inputKey);
            break;
          }
        }
      }
    }

    // Retorna o dado curado (o Zod vai fazer a validação final e lançar erro se ainda faltar algo crítico)
    return healedData as z.infer<typeof schema>;
  }

  /**
   * Helper: Transforma { user: { name: 'X' } } em { 'user.name': 'X', 'name': 'X' }
   * Uma versão simplificada que traz chaves profundas para a raiz se forem únicas
   */
  private static flattenObject(obj: any): Record<string, any> {
    const result: Record<string, any> = {};

    function recurse(cur: any, prop: string) {
      if (Object(cur) !== cur || cur instanceof Date) {
        result[prop] = cur;
        // HACK: Adiciona também a chave sem prefixo para facilitar matches
        // Ex: data.user.email -> email
        const parts = prop.split(".");
        const lastPart = parts[parts.length - 1];
        if (lastPart !== undefined && !result[lastPart]) result[lastPart] = cur;
      } else if (Array.isArray(cur)) {
        result[prop] = cur; // Arrays mantemos como estão por enquanto
      } else {
        let isEmpty = true;
        for (const p in cur) {
          isEmpty = false;
          recurse(cur[p], prop ? prop + "." + p : p);
        }
        if (isEmpty && prop) result[prop] = {};
      }
    }
    recurse(obj, "");
    return result;
  }

  /**
   * Helper: Coerção de Tipos Agressiva
   */
  private static coerceType(value: any, targetSchema: z.ZodTypeAny): any {
    if (value === undefined || value === null) return value;

    // Detecta o tipo base do Zod
    let typeName = "";
    if (targetSchema instanceof z.ZodString) typeName = "string";
    else if (targetSchema instanceof z.ZodNumber) typeName = "number";
    else if (targetSchema instanceof z.ZodBoolean) typeName = "boolean";
    else if (targetSchema instanceof z.ZodDate) typeName = "date";
    else if (targetSchema instanceof z.ZodOptional) {
      // Unwrap optional e tenta de novo
      return this.coerceType(value, (targetSchema as any)._def.innerType);
    }

    // String -> Number
    if (typeName === "number" && typeof value === "string") {
      const n = Number(value.replace(",", ".")); // Suporte a float pt-BR
      return isNaN(n) ? value : n;
    }

    // String -> Boolean
    if (typeName === "boolean" && typeof value === "string") {
      const lower = value.toLowerCase();
      if (["true", "s", "sim", "y", "yes", "1", "on"].includes(lower))
        return true;
      if (["false", "n", "nao", "no", "0", "off"].includes(lower)) return false;
    }

    // String/Number -> Date
    if (typeName === "date") {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }

    return value;
  }
}

// --- EXEMPLO DE USO ---

// 1. Schema do Usuário (O Objetivo)
const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18),
  birthDate: z.date(),
  role: z.enum(["ADMIN", "USER", "GUEST"]),
  isActive: z.boolean().default(false),
  zipCode: z
    .string()
    .regex(/^\d{5}-?\d{3}$/)
    .optional(),
});

// 2. Input Caótico (A Realidade)
const chaoticInput = {
  // Erro 1: Sinônimo/Tradução
  nome_completo: "Carlos Silva",

  // Erro 2: Typo (Fuzzy Match - Levenshtein)
  emial: "carlos@teste.com",

  // Erro 3: Fonética (Soundex)
  roule: "ADMIN",

  // Erro 4: Tipo Errado (Coerção)
  age: "25",

  // Erro 5: Campo totalmente desconhecido, mas valor bate com Date (Content Match)
  metadata_nascimento: "1998-05-20T10:00:00Z",

  // Erro 6: Campo booleano como texto pt-BR
  is_active: "Sim",

  // Lixo que deve ser ignorado
  utm_source: "google",
};

console.log("--- INPUT ORIGINAL ---");
console.log(chaoticInput);

console.log("\n--- INICIANDO HEALING ---");
const healed = SemanticHealer.heal(chaoticInput, UserSchema);

console.log("\n--- RESULTADO FINAL (HEALED) ---");
console.log(healed);

// Validação final do Zod para provar que passou
const parseResult = UserSchema.safeParse(healed);
console.log("\n--- ZOD VALIDATION ---");
console.log(
  parseResult.success ? "✅ SUCCESS" : "❌ FAILED",
  parseResult.success ? "" : parseResult.error
);
