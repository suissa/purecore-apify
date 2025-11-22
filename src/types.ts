import { IncomingMessage, ServerResponse } from 'node:http';
import { Router } from './router';

export interface ParamsDictionary {
  [key: string]: string;
}

/** Dicionário padrão para Query Strings (?page=1&sort=desc) */
export interface QueryDictionary {
  [key: string]: string | string[] | undefined;
}

/**
 * Request compatível com Express + Generics
 */
export interface Request<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  Q = QueryDictionary
> extends IncomingMessage {
  params: P;
  query: Q;
  body: ReqBody;
  /** URL relativa ao roteador atual */
  baseUrl: string;
  /** URL original completa */
  originalUrl: string;
}

/**
 * Response compatível com Express + Generics
 */
export interface Response<ResBody = any> extends ServerResponse {
  status(code: number): this;
  json(data: ResBody): void;
  send(data: ResBody): void;
}

export type NextFunction = (err?: any) => void;
export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

export interface Layer {
  method: string;
  path: string;
  regex: RegExp;
  keys: string[];
  handler: RequestHandler | Router;
  isRouter: boolean;
}

export interface Router {
  use(handler: RequestHandler | Router): void;
  use(path: string, handler: RequestHandler | Router): void;
  get(path: string, handler: RequestHandler): void;
  post(path: string, handler: RequestHandler): void;
  put(path: string, handler: RequestHandler): void;
  delete(path: string, handler: RequestHandler): void;
  patch(path: string, handler: RequestHandler): void;
  all(path: string, handler: RequestHandler): void;
}