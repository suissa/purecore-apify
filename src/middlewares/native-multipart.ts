import { IncomingMessage } from 'node:http';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AsyncResource } from 'node:async_hooks';
import { Readable } from 'node:stream';
import { StorageEngine, DiskStorageEngine, FileInfo } from './storage-engines.js';

/**
 * Middleware nativo para upload de arquivos usando Node.js 20+
 * Substitui bibliotecas como busboy/multer
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

export interface MultipartOptions {
  uploadDir?: string;
  maxFileSize?: number;
  maxFiles?: number;
  allowedMimeTypes?: string[];
  preserveAsyncContext?: boolean;
  charset?: string;
  storage?: StorageEngine;
}

export class NativeMultipartParser {
  private options: Required<Omit<MultipartOptions, 'storage'>> & { storage: StorageEngine };
  private asyncResource?: AsyncResource;

  constructor(options: MultipartOptions = {}) {
    this.options = {
      uploadDir: options.uploadDir || './uploads',
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles || 10,
      allowedMimeTypes: options.allowedMimeTypes || [],
      preserveAsyncContext: options.preserveAsyncContext ?? true,
      charset: options.charset || 'utf8',
      storage: options.storage || new DiskStorageEngine({
        destination: options.uploadDir || './uploads'
      })
    };

    // Cria AsyncResource para preservar contexto assíncrono
    if (this.options.preserveAsyncContext) {
      this.asyncResource = new AsyncResource('NativeMultipartParser');
    }
  }

  async parse(req: IncomingMessage): Promise<{ fields: Record<string, string>, files: UploadedFile[] }> {
    const contentType = req.headers['content-type'];
    
    if (!contentType?.includes('multipart/form-data')) {
      throw new Error('Content-Type deve ser multipart/form-data');
    }

    const boundary = this.extractBoundary(contentType);
    if (!boundary) {
      throw new Error('Boundary não encontrado no Content-Type');
    }

    // Preserva contexto assíncrono se habilitado
    if (this.asyncResource) {
      return this.asyncResource.runInAsyncScope(async () => {
        return this.parseWithAsyncContext(req, boundary);
      });
    }

    return this.parseWithAsyncContext(req, boundary);
  }

  private async parseWithAsyncContext(req: IncomingMessage, boundary: string): Promise<{ fields: Record<string, string>, files: UploadedFile[] }> {
    const chunks: Buffer[] = [];
    
    // Coleta todos os chunks
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    return this.parseMultipartBuffer(buffer, boundary);
  }

  private extractBoundary(contentType: string): string | null {
    const match = contentType.match(/boundary=(.+)$/);
    return match ? match[1].replace(/"/g, '') : null;
  }

  private async parseMultipartBuffer(buffer: Buffer, boundary: string): Promise<{ fields: Record<string, string>, files: UploadedFile[] }> {
    const fields: Record<string, string> = {};
    const files: UploadedFile[] = [];
    
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = this.splitBuffer(buffer, boundaryBuffer);

    for (const part of parts) {
      if (part.length === 0) continue;

      const { headers, body } = this.parsePartHeaders(part);
      const disposition = headers['content-disposition'];
      
      if (!disposition) continue;

      const nameMatch = disposition.match(/name="([^"]+)"/);
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      
      if (!nameMatch) continue;

      const fieldName = nameMatch[1];

      if (filenameMatch) {
        // É um arquivo
        const filename = filenameMatch[1];
        const contentType = headers['content-type'] || 'application/octet-stream';
        
        if (this.options.allowedMimeTypes.length > 0 && 
            !this.options.allowedMimeTypes.includes(contentType)) {
          throw new Error(`Tipo de arquivo não permitido: ${contentType}`);
        }

        if (body.length > this.options.maxFileSize) {
          throw new Error(`Arquivo muito grande: ${body.length} bytes`);
        }

        const savedFile = await this.saveFileWithStorage(body, filename, contentType, fieldName);
        files.push(savedFile);
      } else {
        // É um campo de texto - aplica charset configurado
        const textValue = this.options.charset === 'utf8' 
          ? body.toString('utf8')
          : body.toString(this.options.charset as BufferEncoding);
        fields[fieldName] = textValue;
      }
    }

    return { fields, files };
  }

  private splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
    const parts: Buffer[] = [];
    let start = 0;
    let pos = 0;

    while (pos < buffer.length) {
      const found = buffer.indexOf(delimiter, pos);
      if (found === -1) break;

      if (found > start) {
        parts.push(buffer.subarray(start, found));
      }

      pos = found + delimiter.length;
      start = pos;
    }

    return parts;
  }

  private parsePartHeaders(part: Buffer): { headers: Record<string, string>, body: Buffer } {
    const headerEndIndex = part.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) {
      return { headers: {}, body: part };
    }

    const headerSection = part.subarray(0, headerEndIndex).toString('utf8');
    const body = part.subarray(headerEndIndex + 4);

    const headers: Record<string, string> = {};
    const headerLines = headerSection.split('\r\n');

    for (const line of headerLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).toLowerCase().trim();
        const value = line.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }

    return { headers, body };
  }

  private async saveFileWithStorage(buffer: Buffer, originalName: string, mimeType: string, fieldName: string): Promise<UploadedFile> {
    return new Promise((resolve, reject) => {
      // Cria stream do buffer
      const stream = Readable.from(buffer);
      
      const fileInfo: FileInfo = {
        fieldname: fieldName,
        originalname: originalName,
        encoding: '7bit',
        mimetype: mimeType,
        stream
      };

      // Usa o storage engine configurado
      this.options.storage._handleFile(null, fileInfo, (error, info) => {
        if (error) {
          reject(error);
          return;
        }

        const uploadedFile: UploadedFile = {
          fieldname: fieldName,
          originalname: originalName,
          encoding: '7bit',
          mimetype: mimeType,
          size: buffer.length,
          destination: info?.destination || this.options.uploadDir,
          filename: info?.filename || `${Date.now()}-${randomUUID()}-${originalName}`,
          path: info?.path,
          buffer: info?.buffer,
          location: info?.location
        };

        resolve(uploadedFile);
      });
    });
  }
}

/**
 * Middleware factory para usar o parser nativo
 */
export function nativeMultipart(options?: MultipartOptions) {
  const parser = new NativeMultipartParser(options);

  return async (req: any, res: any, next: any) => {
    try {
      const result = await parser.parse(req);
      req.body = result.fields;
      req.files = result.files;
      next();
    } catch (error) {
      next(error);
    }
  };
}