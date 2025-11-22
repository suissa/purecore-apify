import { createServer, Server } from 'node:http';
import { Router } from './router';
import { Request, Response, NextFunction } from './types';

export class Apify extends Router {
  
  /**
   * Inicia o servidor HTTP
   */
  listen(port: number, callback?: () => void): Server {
    const server = createServer(async (req, res) => {
      // 1. "Upgrade" dos objetos nativos
      const appReq = req as Request;
      const appRes = res as Response;

      // Inicializa propriedades do Request/Response
      this.augmentRequest(appReq);
      this.augmentResponse(appRes);

      // 2. Handler Final (Caso nenhuma rota do Router responda)
      const finalHandler: NextFunction = (err) => {
        if (err) {
          console.error(err);
          if (!appRes.writableEnded) {
             appRes.statusCode = 500;
             appRes.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
          return;
        }
        if (!appRes.writableEnded) {
          appRes.statusCode = 404;
          appRes.setHeader('Content-Type', 'application/json');
          appRes.end(JSON.stringify({ error: `Cannot ${appReq.method} ${appReq.originalUrl}` }));
        }
      };

      // 3. Passa a bola para a lógica do Router (herdada!)
      await this.handle(appReq, appRes, finalHandler);
    });

    return server.listen(port, callback);
  }

  // --- Helpers Privados ---

  private augmentRequest(req: Request) {
    req.originalUrl = req.url || '/';
    req.baseUrl = '';
    req.params = {};
    req.query = {};
    if (!req.body) req.body = {}; // Será preenchido pelo body parser depois

    // Parse Query String
    const urlObj = new URL(req.url || '/', `http://${req.headers.host}`);
    req.query = Object.fromEntries(urlObj.searchParams);
    req.url = urlObj.pathname; // URL interna trabalha só com o pathname
  }

  private augmentResponse(res: Response) {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };
    res.send = (data) => {
      if (typeof data === 'object') return res.json(data);
      res.end(data);
    };
  }
}