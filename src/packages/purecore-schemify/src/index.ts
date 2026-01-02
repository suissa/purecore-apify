// ============================================================================
// Schemify CLONE - High Fidelity Polyfill
// ============================================================================

// --- 1. Estruturas de Erro Compatíveis ---

export type SchemifyIssueCode =
  | "invalid_type"
  | "custom"
  | "invalid_string"
  | "invalid_date"
  | "too_small"
  | "too_big";

export type SchemifyIssue = {
  code: SchemifyIssueCode;
  path: (string | number)[];
  message: string;
  [key: string]: any;
};

export class SchemifyError extends Error {
  issues: SchemifyIssue[] = [];

  constructor(issues: SchemifyIssue[]) {
    super();
    this.issues = issues;
    this.name = "SchemifyError";
  }

  get message() {
    return JSON.stringify(this.issues, null, 2);
  }

  format() {
    // Simplificação do format() do Schemify original
    return this.issues.reduce((acc: any, issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "_errors";
      if (!acc[path]) acc[path] = [];
      acc[path].push(issue.message);
      return acc;
    }, {});
  }
}

export type SafeParseReturnType<T> =
  | { success: true; data: T }
  | { success: false; error: SchemifyError };

// --- 2. Classe Base (SchemifyType) ---

export abstract class SchemifyType<Output = any, Def = any, Input = Output> {
  _output!: Output;
  _input!: Input;
  _def!: Def;

  protected _nullable: boolean = false;
  protected _optional: boolean = false;
  protected _transforms: ((val: any) => any)[] = [];
  protected _refinements: {
    check: (val: Output) => boolean;
    message: string;
  }[] = [];

  abstract _parseSync(
    input: unknown,
    path: (string | number)[]
  ): { success: true; data: any } | { success: false; issues: SchemifyIssue[] };

  parse(input: unknown): Output {
    const result = this.safeParse(input);
    if (!result.success) throw result.error;
    return result.data;
  }

  safeParse(input: unknown): SafeParseReturnType<Output> {
    const result = this._process(input, []);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: new SchemifyError(result.issues) };
  }

  // Processamento interno que lida com optional/nullable/transforms
  protected _process(
    input: unknown,
    path: (string | number)[]
  ):
    | { success: true; data: any }
    | { success: false; issues: SchemifyIssue[] } {
    // 1. Handle Optional/Nullable
    if (input === undefined && this._optional)
      return { success: true, data: undefined };
    if (input === null && this._nullable) return { success: true, data: null };

    // 2. Parse Base
    let result = this._parseSync(input, path);
    if (!result.success) return result;

    let data = result.data;

    // 3. Refinements (validações customizadas)
    for (const refine of this._refinements) {
      if (!refine.check(data)) {
        return {
          success: false,
          issues: [{ code: "custom", path, message: refine.message }],
        };
      }
    }

    // 4. Transforms
    for (const transform of this._transforms) {
      data = transform(data);
    }

    return { success: true, data };
  }

  // --- Modificadores ---

  optional(): SchemifyType<Output | undefined, Def, Input | undefined> {
    const newSchema = this._clone();
    newSchema._optional = true;
    return newSchema as any;
  }

  nullable(): SchemifyType<Output | null, Def, Input | null> {
    const newSchema = this._clone();
    newSchema._nullable = true;
    return newSchema as any;
  }

  nullish(): SchemifyType<
    Output | null | undefined,
    Def,
    Input | null | undefined
  > {
    return this.optional().nullable();
  }

  refine(
    check: (data: Output) => boolean,
    message: string | { message: string } = "Invalid value"
  ): this {
    const msg = typeof message === "string" ? message : message.message;
    const newSchema = this._clone();
    newSchema._refinements.push({ check, message: msg });
    return newSchema as this;
  }

  transform<NewOutput>(
    fn: (arg: Output) => NewOutput
  ): SchemifyType<NewOutput, Def, Input> {
    const newSchema = this._clone() as any;
    newSchema._transforms.push(fn);
    return newSchema;
  }

  // Simples clone superficial para imutabilidade fluente
  protected _clone(): SchemifyType<Output, Def, Input> {
    const clone = Object.create(Object.getPrototypeOf(this));
    return Object.assign(clone, this, {
      _transforms: [...this._transforms],
      _refinements: [...this._refinements],
    });
  }
}

// --- 3. Tipos Primitivos ---

class SchemifyString extends SchemifyType<string> {
  private checks: ((v: string) => string | null)[] = [];

  _parseSync(input: unknown, path: (string | number)[]) {
    if (typeof input !== "string") {
      return {
        success: false,
        issues: [
          {
            code: "invalid_type",
            path,
            message: `Expected string, received ${typeof input}`,
          },
        ],
      } as any;
    }

    for (const check of this.checks) {
      const err = check(input);
      if (err)
        return {
          success: false,
          issues: [{ code: "invalid_string", path, message: err }],
        };
    }
    return { success: true, data: input };
  }

  min(len: number, msg?: string) {
    return this._addCheck((v) =>
      v.length < len ? msg || `Min length ${len}` : null
    );
  }
  max(len: number, msg?: string) {
    return this._addCheck((v) =>
      v.length > len ? msg || `Max length ${len}` : null
    );
  }
  email(msg?: string) {
    return this._addCheck((v) =>
      !/^\S+@\S+\.\S+$/.test(v) ? msg || "Invalid email" : null
    );
  }
  url(msg?: string) {
    return this._addCheck((v) => {
      try {
        new URL(v);
        return null;
      } catch {
        return msg || "Invalid URL";
      }
    });
  }
  regex(re: RegExp, msg?: string) {
    return this._addCheck((v) =>
      !re.test(v) ? msg || "Invalid format" : null
    );
  }

  private _addCheck(fn: (v: string) => string | null) {
    const n = this._clone() as SchemifyString;
    n.checks.push(fn);
    return n;
  }
}

class SchemifyNumber extends SchemifyType<number> {
  private checks: ((v: number) => string | null)[] = [];

  _parseSync(input: unknown, path: (string | number)[]) {
    if (typeof input !== "number" || Number.isNaN(input)) {
      return {
        success: false,
        issues: [
          {
            code: "invalid_type",
            path,
            message: `Expected number, received ${typeof input}`,
          },
        ],
      } as any;
    }
    for (const check of this.checks) {
      const err = check(input);
      if (err)
        return {
          success: false,
          issues: [{ code: "too_small", path, message: err }],
        }; // Código genérico simplificado
    }
    return { success: true, data: input };
  }

  min(val: number, msg?: string) {
    return this._addCheck((v) => (v < val ? msg || `Min value ${val}` : null));
  }
  max(val: number, msg?: string) {
    return this._addCheck((v) => (v > val ? msg || `Max value ${val}` : null));
  }
  int(msg?: string) {
    return this._addCheck((v) =>
      !Number.isInteger(v) ? msg || "Must be integer" : null
    );
  }
  positive(msg?: string) {
    return this.min(0.0000001, msg || "Must be positive");
  }

  private _addCheck(fn: (v: number) => string | null) {
    const n = this._clone() as SchemifyNumber;
    n.checks.push(fn);
    return n;
  }
}

class SchemifyBoolean extends SchemifyType<boolean> {
  _parseSync(input: unknown, path: (string | number)[]) {
    return typeof input === "boolean"
      ? { success: true, data: input }
      : ({
          success: false,
          issues: [{ code: "invalid_type", path, message: "Expected boolean" }],
        } as any);
  }
}

class SchemifyAny extends SchemifyType<any> {
  _parseSync(input: unknown, path: (string | number)[]) {
    return { success: true, data: input } as any;
  }
}

// --- 4. Enum, Literal, Union ---

class SchemifyLiteral<T> extends SchemifyType<T> {
  constructor(private value: T) {
    super();
  }
  _parseSync(input: unknown, path: (string | number)[]) {
    return input === this.value
      ? { success: true, data: input as T }
      : ({
          success: false,
          issues: [
            {
              code: "invalid_type",
              path,
              message: `Expected literal ${this.value}`,
            },
          ],
        } as any);
  }
}

class SchemifyEnum<T extends [string, ...string[]]> extends SchemifyType<
  T[number]
> {
  constructor(private values: T) {
    super();
  }
  _parseSync(input: unknown, path: (string | number)[]) {
    return this.values.includes(input as any)
      ? { success: true, data: input }
      : ({
          success: false,
          issues: [
            {
              code: "invalid_type",
              path,
              message: `Expected one of: ${this.values.join(", ")}`,
            },
          ],
        } as any);
  }
}

// --- 5. Arrays ---

class SchemifyArray<T extends SchemifyType<any>> extends SchemifyType<
  T["_output"][]
> {
  constructor(private element: T) {
    super();
  }

  _parseSync(input: unknown, path: (string | number)[]) {
    if (!Array.isArray(input)) {
      return {
        success: false,
        issues: [{ code: "invalid_type", path, message: "Expected array" }],
      } as any;
    }

    const data: any[] = [];
    const issues: SchemifyIssue[] = [];

    input.forEach((item, i) => {
      const res = (this.element as any)._process(item, [...path, i]);
      if (!res.success) {
        issues.push(...res.issues);
      } else {
        data.push(res.data);
      }
    });

    if (issues.length) return { success: false, issues };
    return { success: true, data };
  }
}

// --- 6. Objetos (Complexo) ---

class SchemifyObject<
  T extends Record<string, SchemifyType<any>>
> extends SchemifyType<{ [K in keyof T]: T[K]["_output"] }> {
  private _strict = false;

  constructor(private shape: T) {
    super();
  }

  _parseSync(input: unknown, path: (string | number)[]) {
    if (typeof input !== "object" || input === null) {
      return {
        success: false,
        issues: [{ code: "invalid_type", path, message: "Expected object" }],
      } as any;
    }

    const data: any = {};
    const issues: SchemifyIssue[] = [];
    const inputKeys = Object.keys(input);

    // Valida keys conhecidas
    for (const key in this.shape) {
      const schemaField = this.shape[key];
      if (!schemaField) continue;
      const res = (schemaField as any)._process((input as any)[key], [
        ...path,
        key,
      ]);
      if (!res.success) {
        issues.push(...res.issues);
      } else if (res.data !== undefined || key in input) {
        // Mantém se não for undefined, ou se a chave existia explicitamente
        data[key] = res.data;
      }
    }

    // Strict check
    if (this._strict) {
      const shapeKeys = Object.keys(this.shape);
      const extraKeys = inputKeys.filter((k) => !shapeKeys.includes(k));
      if (extraKeys.length > 0) {
        extraKeys.forEach((k) =>
          issues.push({
            code: "custom",
            path: [...path, k],
            message: `Unrecognized key: ${k}`,
          })
        );
      }
    }

    if (issues.length) return { success: false, issues };
    return { success: true, data };
  }

  // Utilitários de Objeto
  extend<NewShape extends Record<string, SchemifyType<any>>>(
    newShape: NewShape
  ): SchemifyObject<T & NewShape> {
    return new SchemifyObject({ ...this.shape, ...newShape });
  }

  pick<K extends keyof T>(mask: Record<K, true>): SchemifyObject<Pick<T, K>> {
    const newShape: any = {};
    Object.keys(mask).forEach((key) => {
      if (key in this.shape) newShape[key] = this.shape[key];
    });
    return new SchemifyObject(newShape);
  }

  omit<K extends keyof T>(mask: Record<K, true>): SchemifyObject<Omit<T, K>> {
    const newShape: any = { ...this.shape };
    Object.keys(mask).forEach((key) => delete newShape[key]);
    return new SchemifyObject(newShape);
  }

  partial(): SchemifyObject<{
    [K in keyof T]: SchemifyType<T[K]["_output"] | undefined>;
  }> {
    const newShape: any = {};
    for (const key in this.shape) {
      const field = this.shape[key];
      if (field) newShape[key] = field.optional();
    }
    return new SchemifyObject(newShape);
  }

  strict() {
    const n = this._clone() as SchemifyObject<T>;
    n._strict = true;
    return n;
  }
}

// --- 7. API Pública "z" ---

export const z = {
  // Primitivos
  string: () => new SchemifyString(),
  number: () => new SchemifyNumber(),
  boolean: () => new SchemifyBoolean(),
  any: () => new SchemifyAny(),
  literal: <T>(val: T) => new SchemifyLiteral(val),

  // Complexos
  object: <T extends Record<string, SchemifyType<any>>>(shape: T) =>
    new SchemifyObject(shape),
  array: <T extends SchemifyType<any>>(schema: T) => new SchemifyArray(schema),
  enum: <U extends string, T extends [U, ...U[]]>(values: T) =>
    new SchemifyEnum(values),

  // Utilitários
  infer: <T extends SchemifyType<any>>(t: T): T["_output"] => {
    throw new Error("Type inference only");
  },

  // Coercion (Simples)
  coerce: {
    string: () => new SchemifyString().transform((v) => String(v)),
    number: () => new SchemifyNumber().transform((v) => Number(v)),
    boolean: () => new SchemifyBoolean().transform((v) => Boolean(v)),
    date: () => new SchemifyString().transform((v) => new Date(v as any)),
  },
};

// Types Helper
export type infer<T extends SchemifyType<any>> = T["_output"];
