declare module "@purecore/one-jwt-4-all" {
  export function jwtVerify(
    token: string,
    secret: string | Buffer
  ): Promise<any>;
  export class SignJWT {
    constructor(payload: any);
    setProtectedHeader(header: any): this;
    setIssuedAt(): this;
    setExpirationTime(time: string | number): this;
    sign(secret: string | Buffer): Promise<string>;
  }
}
