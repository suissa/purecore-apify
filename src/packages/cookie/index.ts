/**
 * Minimal Cookie Implementation
 */

export interface CookieSerializeOptions {
  domain?: string;
  encode?: (val: string) => string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  priority?: "low" | "medium" | "high";
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
}

export function serialize(
  name: string,
  val: string,
  options: CookieSerializeOptions = {}
): string {
  const enc = options.encode || encodeURIComponent;
  let str = name + "=" + enc(val);

  if (options.maxAge != null) {
    str += "; Max-Age=" + Math.floor(options.maxAge);
  }
  if (options.domain) {
    str += "; Domain=" + options.domain;
  }
  if (options.path) {
    str += "; Path=" + options.path;
  }
  if (options.expires) {
    str += "; Expires=" + options.expires.toUTCString();
  }
  if (options.httpOnly) {
    str += "; HttpOnly";
  }
  if (options.secure) {
    str += "; Secure";
  }
  if (options.sameSite) {
    const sameSite =
      typeof options.sameSite === "string"
        ? options.sameSite.toLowerCase()
        : options.sameSite;
    switch (sameSite) {
      case true:
      case "strict":
        str += "; SameSite=Strict";
        break;
      case "lax":
        str += "; SameSite=Lax";
        break;
      case "none":
        str += "; SameSite=None";
        break;
    }
  }

  return str;
}

export function parse(
  str: string,
  options: { decode?: (val: string) => string } = {}
): Record<string, string> {
  const dec = options.decode || decodeURIComponent;
  const obj: Record<string, string> = {};
  const pairs = str.split(/[;] */);

  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const val = pair.slice(eqIdx + 1, pair.length).trim();
    if (val[0] === '"') {
      obj[key] = dec(val.slice(1, -1));
    } else {
      obj[key] = dec(val);
    }
  }

  return obj;
}

export default { serialize, parse };
