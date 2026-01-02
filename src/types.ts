import { IncomingMessage, ServerResponse } from "node:http";

/**
 * Tipos Nominais para Semântica Estrita
 */
export type RawFilterString = string & { readonly __brand: unique symbol };
export type MongoQuery = Record<string, any> & {
  readonly __brand: unique symbol;
};

export interface ParamsDictionary {
  [key: string]: string;
}

/** Dicionário padrão para Query Strings (?page=1&sort=desc) */
export interface QueryDictionary {
  [key: string]: string | string[] | undefined;
}

export interface UploadFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

export interface Notification {
  code: string;
  message: string;
  field?: string;
  timestamp: string;
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
  /** Arquivo único (uploadify.single) */
  file?: UploadFile;
  /** Múltiplos arquivos (uploadify.array ou uploadify.fields) */
  files?: UploadFile[] | { [fieldname: string]: UploadFile[] };
  /** Notification Pattern: Erros não-fatais */
  notifications?: Notification[];
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
export type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export interface Layer {
  method: string;
  path: string;
  regex: RegExp;
  keys: string[];
  handler: RequestHandler | IRouter;
  isRouter: boolean;
}
export interface IRouter {
  // A propriedade stack é necessária para a lógica interna
  stack: Layer[];

  // Métodos principais
  handle(req: Request, res: Response, next: NextFunction): Promise<void>;

  // Métodos de registro
  use(handler: RequestHandler | IRouter): void;
  use(path: string, handler: RequestHandler | IRouter): void;

  get(path: string, handler: RequestHandler): void;
  post(path: string, handler: RequestHandler): void;
  put(path: string, handler: RequestHandler): void;
  delete(path: string, handler: RequestHandler): void;
  patch(path: string, handler: RequestHandler): void;
  // Se quiser ser compatível com o erro 'all', adicione aqui ou implemente na classe:
  // all(path: string, handler: RequestHandler): void;
}
