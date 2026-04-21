/**
 * Minimal Zod Implementation (Nominal Typing)
 * Expanded to support purecore-apify requirements
 */

export class ZodError extends Error {
  constructor(public errors: { path: (string | number)[]; message: string }[]) {
    super("ZodError");
  }
  format() {
    return this.errors;
  }
}

export abstract class ZodType<Output = any, Def = any, Input = Output> {
  readonly _type!: Output;
  readonly _def!: Def;

  constructor(def: Def) {
    this._def = def;
  }

  abstract parse(data: any): Output;

  safeParse(
    data: any
  ): { success: true; data: Output } | { success: false; error: ZodError } {
    try {
      return { success: true, data: this.parse(data) };
    } catch (error) {
      if (error instanceof ZodError) return { success: false, error };
      return {
        success: false,
        error: new ZodError([{ path: [], message: (error as Error).message }]),
      };
    }
  }

  optional() {
    return new ZodOptional({ innerType: this });
  }

  nullable() {
    return new ZodNullable({ innerType: this });
  }

  default(defaultValue: Output | (() => Output)) {
    return new ZodDefault({
      innerType: this,
      defaultValue:
        typeof defaultValue === "function"
          ? (defaultValue as () => Output)
          : () => defaultValue,
    });
  }

  refine(
    check: (data: Output) => any,
    options?: string | { message?: string; path?: (string | number)[] }
  ) {
    const message =
      typeof options === "string"
        ? options
        : options?.message || "Invalid input";
    const path = (typeof options === "object" ? options.path : []) || [];
    return new ZodEffects({ innerType: this, check, message, path });
  }

  transform(transformer: (data: Output) => any) {
    return new ZodEffects({ innerType: this, transform: transformer });
  }
}

export type ZodTypeAny = ZodType<any, any, any>;
export type ZodSchema<T = any> = ZodType<T, any, any>;
export type ZodRawShape = Record<string, ZodTypeAny>;

export class ZodEffects extends ZodType<any, any> {
  constructor(def: {
    innerType: ZodTypeAny;
    check?: (data: any) => any;
    transform?: (data: any) => any;
    message?: string;
    path?: (string | number)[];
  }) {
    super(def);
  }
  parse(data: any): any {
    let val = this._def.innerType.parse(data);
    if (this._def.check && !this._def.check(val)) {
      throw new ZodError([
        {
          path: this._def.path || [],
          message: this._def.message || "Invalid input",
        },
      ]);
    }
    if (this._def.transform) {
      val = this._def.transform(val);
    }
    return val;
  }
}

export class ZodString extends ZodType<string, { checks: any[] }> {
  constructor(def: { checks: any[] } = { checks: [] }) {
    super(def);
  }
  parse(data: any): string {
    if (typeof data !== "string")
      throw new ZodError([{ path: [], message: "Expected string" }]);
    return data;
  }
  min(value: number, message?: string) {
    this._def.checks.push({ kind: "min", value, message });
    return this;
  }
  max(value: number, message?: string) {
    this._def.checks.push({ kind: "max", value, message });
    return this;
  }
  length(value: number, message?: string) {
    this._def.checks.push({ kind: "length", value, message });
    return this;
  }
  email(message?: string) {
    this._def.checks.push({ kind: "email", message });
    return this;
  }
  uuid(message?: string) {
    this._def.checks.push({ kind: "uuid", message });
    return this;
  }
  url(message?: string) {
    this._def.checks.push({ kind: "url", message });
    return this;
  }
  regex(regex: RegExp, message?: string) {
    this._def.checks.push({ kind: "regex", regex, message });
    return this;
  }
}

export class ZodNumber extends ZodType<number, { checks: any[] }> {
  constructor(def: { checks: any[] } = { checks: [] }) {
    super(def);
  }
  parse(data: any): number {
    if (typeof data !== "number")
      throw new ZodError([{ path: [], message: "Expected number" }]);
    return data;
  }
  min(value: number, message?: string) {
    this._def.checks.push({ kind: "min", value, message });
    return this;
  }
  max(value: number, message?: string) {
    this._def.checks.push({ kind: "max", value, message });
    return this;
  }
  positive(message?: string) {
    this._def.checks.push({
      kind: "min",
      value: 0,
      message: message || "Must be positive",
    });
    return this;
  }
  int(message?: string) {
    this._def.checks.push({ kind: "int", message });
    return this;
  }
}

export class ZodBoolean extends ZodType<boolean, {}> {
  parse(data: any): boolean {
    if (typeof data !== "boolean")
      throw new ZodError([{ path: [], message: "Expected boolean" }]);
    return data;
  }
}

export class ZodDate extends ZodType<Date, { checks: any[] }> {
  constructor(def: { checks: any[] } = { checks: [] }) {
    super(def);
  }
  parse(data: any): Date {
    if (
      !(data instanceof Date) &&
      (typeof data !== "string" || isNaN(Date.parse(data)))
    )
      throw new ZodError([{ path: [], message: "Expected date" }]);
    return new Date(data);
  }
  min(value: Date, message?: string) {
    this._def.checks.push({ kind: "min", value, message });
    return this;
  }
}

export class ZodAny extends ZodType<any, {}> {
  parse(data: any): any {
    return data;
  }
}

export class ZodOptional extends ZodType<any, { innerType: ZodTypeAny }> {
  parse(data: any): any {
    if (data === undefined) return undefined;
    return this._def.innerType.parse(data);
  }
}

export class ZodNullable extends ZodType<any, { innerType: ZodTypeAny }> {
  parse(data: any): any {
    if (data === null) return null;
    return this._def.innerType.parse(data);
  }
}

export class ZodDefault extends ZodType<
  any,
  { innerType: ZodTypeAny; defaultValue: () => any }
> {
  parse(data: any): any {
    if (data === undefined) return this._def.defaultValue();
    return this._def.innerType.parse(data);
  }
}

export class ZodArray extends ZodType<
  any[],
  { type: ZodTypeAny; checks: any[] }
> {
  constructor(def: { type: ZodTypeAny; checks: any[] }) {
    super(def);
  }
  parse(data: any): any[] {
    if (!Array.isArray(data))
      throw new ZodError([{ path: [], message: "Expected array" }]);
    return data.map((item, idx) => {
      try {
        return this._def.type.parse(item);
      } catch (e) {
        if (e instanceof ZodError) {
          const errors = [...e.errors];
          errors.forEach((err) => err.path.unshift(idx));
          throw new ZodError(errors);
        }
        throw e;
      }
    });
  }
  min(value: number, message?: string) {
    this._def.checks.push({ kind: "min", value, message });
    return this;
  }
  max(value: number, message?: string) {
    this._def.checks.push({ kind: "max", value, message });
    return this;
  }
}

export class ZodObject<T extends Record<string, ZodTypeAny>> extends ZodType<
  { [K in keyof T]: Infer<T[K]> },
  { shape: () => T }
> {
  constructor(shape: T) {
    super({ shape: () => shape });
  }
  parse(data: any): { [K in keyof T]: Infer<T[K]> } {
    if (typeof data !== "object" || data === null)
      throw new ZodError([{ path: [], message: "Expected object" }]);
    const shape = this._def.shape();
    const result: any = {};
    for (const key in shape) {
      try {
        result[key] = (shape[key] as ZodTypeAny).parse(data[key]);
      } catch (e) {
        if (e instanceof ZodError) {
          const errors = [...e.errors];
          errors.forEach((err) => err.path.unshift(key));
          throw new ZodError(errors);
        }
        throw e;
      }
    }
    return result;
  }
  get shape() {
    return this._def.shape();
  }
}

export class ZodEnum extends ZodType<string, { values: string[] }> {
  parse(data: any): string {
    if (!this._def.values.includes(data)) {
      throw new ZodError([
        {
          path: [],
          message: `Invalid enum value. Expected ${this._def.values.join(
            " | "
          )}`,
        },
      ]);
    }
    return data;
  }
}

export class ZodRecord extends ZodType<
  Record<string, any>,
  { valueType: ZodTypeAny }
> {
  parse(data: any): Record<string, any> {
    if (typeof data !== "object" || data === null)
      throw new ZodError([{ path: [], message: "Expected object" }]);
    const result: any = {};
    for (const key in data) {
      result[key] = this._def.valueType.parse(data[key]);
    }
    return result;
  }
}

export class ZodLazy extends ZodType<any, { getter: () => ZodTypeAny }> {
  parse(data: any): any {
    return this._def.getter().parse(data);
  }
}

export type Infer<T> = T extends ZodType<infer U> ? U : never;

export const string = (def?: any) => new ZodString(def);
export const number = (def?: any) => new ZodNumber(def);
export const boolean = () => new ZodBoolean({});
export const date = () => new ZodDate();
export const any = () => new ZodAny({});
export const array = (type: ZodTypeAny) => new ZodArray({ type, checks: [] });
export const object = <T extends Record<string, ZodTypeAny>>(shape: T) =>
  new ZodObject(shape);
export const record = (valueType: ZodTypeAny) => new ZodRecord({ valueType });
export const lazy = (getter: () => ZodTypeAny) => new ZodLazy({ getter });
export const enum_fn = (values: string[]) => new ZodEnum({ values });

export const z = {
  string,
  number,
  boolean,
  date,
  any,
  array,
  object,
  record,
  lazy,
  enum: enum_fn,
  ZodError,
  ZodType,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodDate,
  ZodAny,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodArray,
  ZodObject,
  ZodEnum,
  ZodRecord,
  ZodLazy,
  ZodEffects,
};

export namespace z {
  export type Infer<T> = T extends ZodType<infer U> ? U : never;
  export type infer<T> = Infer<T>;
  export type ZodTypeAny = import("./index.js").ZodTypeAny;
  export type ZodSchema<T = any> = import("./index.js").ZodSchema<T>;
  export type ZodRawShape = import("./index.js").ZodRawShape;
  export type ZodType<
    Output = any,
    Def = any,
    Input = Output
  > = import("./index.js").ZodType<Output, Def, Input>;
  export type ZodString = import("./index.js").ZodString;
  export type ZodNumber = import("./index.js").ZodNumber;
  export type ZodBoolean = import("./index.js").ZodBoolean;
  export type ZodDate = import("./index.js").ZodDate;
  export type ZodAny = import("./index.js").ZodAny;
  export type ZodOptional = import("./index.js").ZodOptional;
  export type ZodNullable = import("./index.js").ZodNullable;
  export type ZodDefault = import("./index.js").ZodDefault;
  export type ZodArray = import("./index.js").ZodArray;
  export type ZodObject<T extends ZodRawShape> =
    import("./index.js").ZodObject<T>;
  export type ZodEnum = import("./index.js").ZodEnum;
  export type ZodRecord = import("./index.js").ZodRecord;
  export type ZodLazy = import("./index.js").ZodLazy;
  export type ZodEffects = import("./index.js").ZodEffects;
}

export default z;
