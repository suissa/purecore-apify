/**
 * Minimal Zod Implementation (Nominal Typing)
 */

export namespace z {
  export type Infer<T> = T extends ZodType<infer U> ? U : never;
  export type infer<T> = Infer<T>;

  export abstract class ZodType<Output = any, Def = any, Input = Output> {
    readonly _type!: Output;
    readonly _def!: Def;

    constructor(def: Def) {
      this._def = def;
    }

    abstract parse(data: any): Output;

    safeParse(
      data: any
    ): { success: true; data: Output } | { success: false; error: any } {
      try {
        return { success: true, data: this.parse(data) };
      } catch (error) {
        return { success: false, error };
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
            ? defaultValue
            : () => defaultValue,
      });
    }
  }

  export class ZodString extends ZodType<string, { checks: any[] }> {
    constructor(def: { checks: any[] } = { checks: [] }) {
      super(def);
    }
    parse(data: any): string {
      if (typeof data !== "string") throw new Error("Expected string");
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
      if (typeof data !== "number") throw new Error("Expected number");
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
  }

  export class ZodBoolean extends ZodType<boolean, {}> {
    parse(data: any): boolean {
      if (typeof data !== "boolean") throw new Error("Expected boolean");
      return data;
    }
  }

  export class ZodDate extends ZodType<Date, {}> {
    parse(data: any): Date {
      if (!(data instanceof Date) && isNaN(Date.parse(data)))
        throw new Error("Expected date");
      return new Date(data);
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

  export class ZodArray extends ZodType<any[], { type: ZodTypeAny }> {
    parse(data: any): any[] {
      if (!Array.isArray(data)) throw new Error("Expected array");
      return data.map((item) => this._def.type.parse(item));
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
        throw new Error("Expected object");
      const shape = this._def.shape();
      const result: any = {};
      for (const key in shape) {
        result[key] = shape[key].parse(data[key]);
      }
      return result;
    }
  }

  export type ZodTypeAny = ZodType<any, any, any>;
  export type ZodSchema<T = any> = ZodType<T, any, any>;

  export const string = (def?: any) => new ZodString(def);
  export const number = (def?: any) => new ZodNumber(def);
  export const boolean = () => new ZodBoolean({});
  export const date = () => new ZodDate({});
  export const any = () => new ZodAny({});
  export const array = (type: ZodTypeAny) => new ZodArray({ type });
  export const object = <T extends Record<string, ZodTypeAny>>(shape: T) =>
    new ZodObject(shape);
}

export default z;
