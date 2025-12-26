import { Request, Response, NextFunction, UploadFile, Notification } from '../types';
import { createWriteStream, mkdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

export interface UploadifyOptions {
  dest?: string;
  storage?: 'disk' | 'memory';
  limits?: {
    fileSize?: number;
    files?: number;
  };
}

class Uploadify {
  private options: UploadifyOptions;

  constructor(options: UploadifyOptions = {}) {
    this.options = {
      dest: options.dest || 'uploads',
      storage: options.storage || 'disk',
      limits: options.limits || { fileSize: 10 * 1024 * 1024, files: 10 },
    };

    if (this.options.storage === 'disk' && !existsSync(this.options.dest!)) {
      mkdirSync(this.options.dest!, { recursive: true });
    }
  }

  private addNotification(req: Request, code: string, message: string, field?: string) {
    if (!req.notifications) req.notifications = [];
    req.notifications.push({
      code,
      message,
      field,
      timestamp: new Date().toISOString(),
    });
  }

  public single(fieldname: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.handleMultipart(req, { mode: 'single', fieldname });
        next();
      } catch (err) {
        this.addNotification(req, 'UPLOAD_ERROR', (err as Error).message);
        next();
      }
    };
  }

  public array(fieldname: string, maxCount?: number) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.handleMultipart(req, { mode: 'array', fieldname, maxCount });
        next();
      } catch (err) {
        this.addNotification(req, 'UPLOAD_ERROR', (err as Error).message);
        next();
      }
    };
  }

  public fields(fields: { name: string; maxCount?: number }[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.handleMultipart(req, { mode: 'fields', fields });
        next();
      } catch (err) {
        this.addNotification(req, 'UPLOAD_ERROR', (err as Error).message);
        next();
      }
    };
  }

  public none() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.handleMultipart(req, { mode: 'none' });
        next();
      } catch (err) {
        this.addNotification(req, 'UPLOAD_ERROR', (err as Error).message);
        next();
      }
    };
  }

  private async handleMultipart(req: Request, config: any) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return;
    }

    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
    if (!boundaryMatch) {
      this.addNotification(req, 'INVALID_BOUNDARY', 'Não foi possível encontrar o boundary no Content-Type');
      return;
    }

    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    
    let buffer = Buffer.alloc(0);
    req.body = req.body || {};
    const files: UploadFile[] = [];

    for await (const chunk of req) {
      buffer = Buffer.concat([buffer, chunk as Buffer]);
      
      let boundaryIndex;
      while ((boundaryIndex = buffer.indexOf(boundaryBuffer)) !== -1) {
        const part = buffer.subarray(0, boundaryIndex);
        buffer = buffer.subarray(boundaryIndex + boundaryBuffer.length);

        if (part.length > 0) {
          await this.processPart(req, part, config, files);
        }
      }
    }

    // Processa a última parte se houver
    if (buffer.length > 0 && !buffer.equals(Buffer.from('--\r\n'))) {
       // O buffer restante pode conter o delimitador final --boundary--
    }

    // Organiza arquivos no request conforme o modo
    if (config.mode === 'single') {
      req.file = files.find(f => f.fieldname === config.fieldname);
    } else if (config.mode === 'array') {
      req.files = files.filter(f => f.fieldname === config.fieldname);
    } else if (config.mode === 'fields') {
      const groupedFiles: { [key: string]: UploadFile[] } = {};
      files.forEach(f => {
        if (!groupedFiles[f.fieldname]) groupedFiles[f.fieldname] = [];
        groupedFiles[f.fieldname].push(f);
      });
      req.files = groupedFiles;
    } else if (config.mode === 'any') {
      req.files = files;
    }
  }

  private async processPart(req: Request, part: Buffer, config: any, files: UploadFile[]) {
    const headerEndIndex = part.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) return;

    const headersRaw = part.subarray(0, headerEndIndex).toString();
    const content = part.subarray(headerEndIndex + 4, part.length - 2); // -2 para remover \r\n do final da parte

    const contentDisposition = headersRaw.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
    if (!contentDisposition) return;

    const fieldname = contentDisposition[1];
    const originalname = contentDisposition[2];

    if (originalname) {
      // É um arquivo
      if (config.mode === 'none') {
        this.addNotification(req, 'LIMIT_UNEXPECTED_FILE', 'Arquivos não são permitidos nesta rota', fieldname);
        return;
      }

      const contentTypeMatch = headersRaw.match(/Content-Type: ([^\s]+)/i);
      const mimetype = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';

      const file: UploadFile = {
        fieldname,
        originalname,
        encoding: '7bit',
        mimetype,
        size: content.length,
      };

      if (this.options.storage === 'memory') {
        file.buffer = content;
      } else {
        const filename = `${Date.now()}-${originalname}`;
        const path = join(this.options.dest!, filename);
        
        // Salvamento síncrono para simplificar o parser manual nesta versão
        const writeStream = createWriteStream(path);
        writeStream.write(content);
        writeStream.end();

        file.destination = this.options.dest;
        file.filename = filename;
        file.path = path;
      }

      files.push(file);
    } else {
      // É um campo de texto
      req.body[fieldname] = content.toString();
    }
  }
}

export const uploadify = (options?: UploadifyOptions) => new Uploadify(options);
