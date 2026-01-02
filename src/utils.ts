import { Request, Response, NextFunction, RequestHandler } from './types';

/**
 * Transforma um middleware do ecossistema Express em um middleware PureCore.
 * Ignora incompatibilidades de tipagem, pois em runtime (JS) os objetos são compatíveis (herança).
 */
export const adapt = (expressMiddleware: any): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    // O middleware do Express espera (req, res, next)
    // Nós passamos nossos objetos que herdam de http.IncomingMessage/ServerResponse
    // O 'next' do Express espera (err?), o nosso também aceita (err?)
    expressMiddleware(req, res, next);
  };
};