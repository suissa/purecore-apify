import { Request, Response, NextFunction, UploadFile, Notification } from '../../types';
import { StorageEngine, DiskStorage, MemoryStorage } from './storage';
import { MultipartParser, Part } from './parser';

export interface UploadifyOptions {
  dest?: string;
  storage?: StorageEngine;
  fileFilter?: (req: Request, file: any, cb: (error: Error | null, acceptFile: boolean) => void) => void;
  limits?: {
    fieldNameSize?: number;
    fieldSize?: number;
    fields?: number;
    fileSize?: number;
    files?: number;
    parts?: number;
    headerPairs?: number;
  };
}

class Uploadify {
  private options: UploadifyOptions;

  constructor(options: UploadifyOptions = {}) {
    this.options = { ...options };
    if (!this.options.storage) {
      if (this.options.dest) {
        this.options.storage = new DiskStorage({ destination: this.options.dest });
      } else {
        this.options.storage = new MemoryStorage();
      }
    }
    if (!this.options.limits) this.options.limits = {};
  }

  public single(fieldname: string) {
    return this.makeMiddleware('single', { fieldname });
  }

  public array(fieldname: string, maxCount?: number) {
    return this.makeMiddleware('array', { fieldname, maxCount });
  }

  public fields(fields: { name: string; maxCount?: number }[]) {
    return this.makeMiddleware('fields', { fields });
  }

  public none() {
    return this.makeMiddleware('none', {});
  }

  public any() {
    return this.makeMiddleware('any', {});
  }

  private makeMiddleware(mode: string, config: any) {
    return (req: Request, res: Response, next: NextFunction) => {
      this.handleRequest(req, res, next, mode, config);
    };
  }

  private async handleRequest(req: Request, res: Response, next: NextFunction, mode: string, config: any) {
    if (!req.headers['content-type']?.includes('multipart/form-data')) return next();

    const boundary = this.getBoundary(req.headers['content-type']);
    if (!boundary) {
      this.addNotification(req, 'INVALID_BOUNDARY', 'Could not find boundary');
      return next();
    }

    req.body = req.body || {};
    req.files = req.files || (mode === 'any' || mode === 'array' || mode === 'fields' ? [] : undefined);
    // Note: for fields, req.files is object. we will handle conversion at the end.

    const pendingFiles: Promise<void>[] = [];
    const filesList: UploadFile[] = [];
    let fileCount = 0;

    const parser = new MultipartParser(boundary,
      (part: Part) => {
        // Handle File
        if (mode === 'none') {
            part.stream.resume(); // Drain
            this.addNotification(req, 'LIMIT_UNEXPECTED_FILE', 'Unexpected file field');
            return;
        }

        // Check limits
        if (this.options.limits?.files && fileCount >= this.options.limits.files) {
             part.stream.resume();
             this.addNotification(req, 'LIMIT_FILE_COUNT', 'Too many files');
             return;
        }

        // Check specific mode limits
        if (mode === 'single' && part.name !== config.fieldname) {
             // If not expected field, what does multer do?
             // It accepts it but puts it in req.files if any/unknown?
             // Multer strict mode: LIMIT_UNEXPECTED_FILE
             // We will assume strict for single? 
             // "Accept a single file with the name fieldname".
             part.stream.resume();
             this.addNotification(req, 'LIMIT_UNEXPECTED_FILE', `Unexpected field ${part.name}`);
             return;
        }
        
        fileCount++;

        const file: UploadFile = {
            fieldname: part.name,
            originalname: part.filename || '',
            encoding: part.encoding,
            mimetype: part.mimetype,
            size: 0
        };

        // File Filter
        if (this.options.fileFilter) {
            this.options.fileFilter(req, file, (err, accept) => {
                if (err || !accept) {
                    part.stream.resume();
                    if (err) this.addNotification(req, 'FILE_FILTER_ERROR', err.message);
                    return;
                }
                this.processFile(req, part, file, pendingFiles, filesList);
            });
        } else {
            this.processFile(req, part, file, pendingFiles, filesList);
        }
      },
      (name, value) => {
        // Handle Field
        if (this.options.limits?.fieldNameSize && name.length > this.options.limits.fieldNameSize) {
             // Truncate or error? Multer truncates name.
             name = name.substring(0, this.options.limits.fieldNameSize);
        }

        if (this.options.limits?.fieldSize && value.length > this.options.limits.fieldSize) {
             // For text fields, we usually truncate.
             value = value.substring(0, this.options.limits.fieldSize);
             this.addNotification(req, 'LIMIT_FIELD_VALUE', `Field ${name} truncated`);
        }

        // Simple append to body
        // Multer handles arrays for same key
        if (req.body[name]) {
            if (Array.isArray(req.body[name])) {
                req.body[name].push(value);
            } else {
                req.body[name] = [req.body[name], value];
            }
        } else {
            req.body[name] = value;
        }
      }
    );

    req.on('data', chunk => parser.write(chunk));
    req.on('end', async () => {
        await Promise.all(pendingFiles);
        this.finalizeRequest(req, mode, config, filesList);
        next();
    });
    // Error handling on req
    req.on('error', (err) => {
        this.addNotification(req, 'REQUEST_ERROR', err.message);
        next();
    });
  }

  private processFile(req: Request, part: Part, file: any, pending: Promise<void>[], filesList: UploadFile[]) {
      const p = new Promise<void>((resolve) => {
          // Wrap stream to check limits
          const limit = this.options.limits?.fileSize;
          if (limit) {
              let bytes = 0;
              part.stream.on('data', (chunk: Buffer) => {
                  bytes += chunk.length;
                  if (bytes > limit) {
                      part.stream.emit('error', new Error('LIMIT_FILE_SIZE'));
                  }
              });
          }

          file.stream = part.stream; // Pass the stream to storage
          this.options.storage!._handleFile(req, file, (err: any, info: any) => {
              if (err) {
                  const code = err.message === 'LIMIT_FILE_SIZE' ? 'LIMIT_FILE_SIZE' : 'STORAGE_ERROR';
                  this.addNotification(req, code, err.message);
                  resolve();
                  return;
              }
              // Merge info
              Object.assign(file, info);
              delete file.stream; // cleanup
              filesList.push(file);
              resolve();
          });
      });
      pending.push(p);
  }

  private finalizeRequest(req: Request, mode: string, config: any, filesList: UploadFile[]) {
      if (mode === 'single') {
          req.file = filesList.find(f => f.fieldname === config.fieldname);
      } else if (mode === 'array') {
          req.files = filesList.filter(f => f.fieldname === config.fieldname);
      } else if (mode === 'fields') {
           const result: any = {};
           filesList.forEach(f => {
               if (!result[f.fieldname]) result[f.fieldname] = [];
               result[f.fieldname].push(f);
           });
           req.files = result;
      } else if (mode === 'any') {
           req.files = filesList;
      }
  }

  private getBoundary(contentType: string): string | null {
    const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    return match ? (match[1] || match[2]) : null;
  }

  private addNotification(req: Request, code: string, message: string) {
      req.notifications = req.notifications || [];
      req.notifications.push({
          code,
          message,
          timestamp: new Date().toISOString()
      });
  }
}

export const uploadify = (options?: UploadifyOptions) => new Uploadify(options);
export const diskStorage = (options: any) => new DiskStorage(options);
export const memoryStorage = () => new MemoryStorage();
