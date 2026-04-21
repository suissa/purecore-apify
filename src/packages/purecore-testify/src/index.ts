import assert from "node:assert/strict";

// Implementação nativa de Mock
interface MockCall {
  arguments: any[];
  result?: any;
  error?: any;
  timestamp: number;
}

class MockFunction {
  private _calls: MockCall[] = [];
  private _implementation?: Function;
  private _returnValue?: any;
  private _mockResolvedValue?: any;
  private _mockRejectedValue?: any;
  private _mockImplementation?: Function;

  constructor(impl?: Function) {
    this._implementation = impl;
  }

  get calls(): MockCall[] {
    return [...this._calls];
  }

  get mock() {
    return {
      calls: this._calls,
      results: this._calls.map((call) => ({
        type: call.error ? "throw" : "return",
        value: call.error || call.result,
      })),
    };
  }

  mockReturnValue(value: any) {
    this._returnValue = value;
    this._mockImplementation = undefined;
    return this;
  }

  mockResolvedValue(value: any) {
    this._mockResolvedValue = value;
    this._returnValue = undefined;
    this._mockImplementation = undefined;
    return this;
  }

  mockRejectedValue(value: any) {
    this._mockRejectedValue = value;
    this._returnValue = undefined;
    this._mockImplementation = undefined;
    return this;
  }

  mockImplementation(impl: Function) {
    this._mockImplementation = impl;
    this._returnValue = undefined;
    this._mockResolvedValue = undefined;
    this._mockRejectedValue = undefined;
    return this;
  }

  mockClear() {
    this._calls = [];
    return this;
  }

  mockReset() {
    this._calls = [];
    this._implementation = undefined;
    this._returnValue = undefined;
    this._mockResolvedValue = undefined;
    this._mockRejectedValue = undefined;
    this._mockImplementation = undefined;
    return this;
  }

  [Symbol.toPrimitive]() {
    return (...args: any[]) => this._call(...args);
  }

  public _call(...args: any[]) {
    const call: MockCall = {
      arguments: args,
      timestamp: Date.now(),
    };

    try {
      let result;

      if (this._mockImplementation) {
        result = this._mockImplementation(...args);
      } else if (this._returnValue !== undefined) {
        result = this._returnValue;
      } else if (this._implementation) {
        result = this._implementation(...args);
      }

      // Handle promises
      if (result instanceof Promise) {
        if (this._mockResolvedValue !== undefined) {
          call.result = this._mockResolvedValue;
          this._calls.push(call);
          return Promise.resolve(this._mockResolvedValue);
        } else if (this._mockRejectedValue !== undefined) {
          call.error = this._mockRejectedValue;
          this._calls.push(call);
          return Promise.reject(this._mockRejectedValue);
        }
        return result
          .then((res: any) => {
            call.result = res;
            this._calls.push(call);
            return res;
          })
          .catch((err: any) => {
            call.error = err;
            this._calls.push(call);
            throw err;
          });
      }

      call.result = result;
      this._calls.push(call);
      return result;
    } catch (error) {
      call.error = error;
      this._calls.push(call);
      throw error;
    }
  }
}

// Proxy handler for spy functionality
const spyHandler = {
  apply(target: Function, thisArg: any, args: any[]) {
    const call: MockCall = {
      arguments: args,
      timestamp: Date.now(),
    };

    try {
      const result = target.apply(thisArg, args);
      call.result = result;

      // Store call on the spied function
      if (!(target as any).mock) {
        (target as any).mock = { calls: [] };
      }
      (target as any).mock.calls.push(call);

      return result;
    } catch (error) {
      call.error = error;

      if (!(target as any).mock) {
        (target as any).mock = { calls: [] };
      }
      (target as any).mock.calls.push(call);

      throw error;
    }
  },
};

// Mock utilities
export const mock = {
  fn: <T extends Function>(impl?: T): MockFunction & T => {
    const mockFn = new MockFunction(impl);
    const proxy = new Proxy((...args: any[]) => mockFn._call(...args), {
      get(target, prop) {
        if (prop === "mock") return mockFn.mock;
        if (prop === "mockReturnValue")
          return (value: any) => mockFn.mockReturnValue(value);
        if (prop === "mockResolvedValue")
          return (value: any) => mockFn.mockResolvedValue(value);
        if (prop === "mockRejectedValue")
          return (value: any) => mockFn.mockRejectedValue(value);
        if (prop === "mockImplementation")
          return (impl: Function) => mockFn.mockImplementation(impl);
        if (prop === "mockClear") return () => mockFn.mockClear();
        if (prop === "mockReset") return () => mockFn.mockReset();
        return (target as any)[prop];
      },
    });
    return proxy as unknown as MockFunction & T;
  },

  method: (obj: any, methodName: string) => {
    const originalMethod = obj[methodName];
    const spiedMethod = new Proxy(originalMethod, spyHandler);

    // Replace the method on the object
    obj[methodName] = spiedMethod;

    // Add restore functionality
    spiedMethod.mockRestore = () => {
      obj[methodName] = originalMethod;
    };

    return spiedMethod;
  },
};

type Matchers<T> = {
  toBe: (expected: T) => void;
  toEqual: (expected: T) => void;
  toBeTruthy: () => void;
  toBeFalsy: () => void;
  toThrow: (error?: RegExp | Error) => void;
  resolves: Promise<Matchers<T>>;
  rejects: Promise<Matchers<T>>;
  not: Matchers<T>;
  // Adicione mais tipos conforme necessário
  toHaveBeenCalled: () => void;
  toHaveBeenCalledWith: (...args: any[]) => void;
};

// Helper interno
const assertCondition = (condition: boolean, isNot: boolean, msg?: string) => {
  if (isNot) assert.ok(!condition, msg || "Expected condition to be false");
  else assert.ok(condition, msg || "Expected condition to be true");
};

export function expect<T = any>(actual: T): Matchers<T> {
  const createMatchers = (value: any, isNot = false): Matchers<T> => ({
    toBe: (expected) => {
      if (isNot) assert.notStrictEqual(value, expected);
      else assert.strictEqual(value, expected);
    },
    toEqual: (expected) => {
      if (isNot) assert.notDeepStrictEqual(value, expected);
      else assert.deepStrictEqual(value, expected);
    },
    toBeTruthy: () => assertCondition(!!value, isNot),
    toBeFalsy: () => assertCondition(!value, isNot),
    toThrow: (err) => {
      if (isNot) assert.doesNotThrow(() => (value as Function)(), err as any);
      else assert.throws(() => (value as Function)(), err as any);
    },
    toHaveBeenCalled: () =>
      assertCondition((value as any).mock.calls.length > 0, isNot),
    toHaveBeenCalledWith: (...args) => {
      const calls = (value as any).mock.calls;
      const found = calls.some((c: any) => {
        try {
          assert.deepStrictEqual(c.arguments, args);
          return true;
        } catch {
          return false;
        }
      });
      assertCondition(found, isNot);
    },

    get not() {
      return createMatchers(value, !isNot);
    },

    get resolves() {
      return (value as Promise<any>).then((res) => createMatchers(res));
    },
    get rejects() {
      return (value as Promise<any>).then(
        () => {
          throw new Error("Promise resolved but expected rejection");
        },
        (err) => createMatchers(err)
      );
    },
  });

  return createMatchers(actual);
}

export const vi = {
  fn: <T extends Function>(impl?: T) => mock.fn(impl),
  spyOn: (obj: any, method: string) => mock.method(obj, method),
};
