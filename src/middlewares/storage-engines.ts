/**
 * Storage Engines para upload de arquivos
 * Permite diferentes backends de armazenamento
 */

import { createWriteStream, WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
  location?: string; // Para cloud storage
}

export interface StorageEngine {
  _handleFile(req: any, file: FileInfo, callback: (error?: Error, info?: Partial<UploadedFile>) => void): void;
  _removeFile?(req: any, file: UploadedFile, callback: (error?: Error) => void): void;
}

export interface FileInfo {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  stream: Readable;
}

/**
 * Disk Storage Engine - Armazena arquivos no sistema de arquivos local
 */
export class DiskStorageEngine implements StorageEngine {
  private destination: string | ((req: any, file: FileInfo) => string);
  private filename: string | ((req: any, file: FileInfo) => string);

  constructor(options: {
    destination?: string | ((req: any, file: FileInfo) => string);
    filename?: string | ((req: any, file: FileInfo) => string);
  } = {}) {
    this.destination = options.destination || './uploads';
    this.filename = options.filename || ((req, file) => `${Date.now()}-${randomUUID()}-${file.originalname}`);
  }

  _handleFile(req: any, file: FileInfo, callback: (error?: Error, info?: Partial<UploadedFile>) => void): void {
    const destination = typeof this.destination === 'function' 
      ? this.destination(req, file) 
      : this.destination;
    
    const filename = typeof this.filename === 'function'
      ? this.filename(req, file)
      : this.filename;

    const filepath = join(destination, filename);

    // Cria diretório se não existir
    mkdir(destination, { recursive: true })
      .then(() => {
        const writeStream = createWriteStream(filepath);
        let size = 0;

        // Conta bytes durante o upload
        file.stream.on('data', (chunk: Buffer) => {
          size += chunk.length;
        });

        // Pipeline para salvar arquivo
        pipeline(file.stream, writeStream)
          .then(() => {
            callback(undefined, {
              destination,
              filename,
              path: filepath,
              size
            });
          })
          .catch(callback);
      })
      .catch(callback);
  }

  _removeFile(req: any, file: UploadedFile, callback: (error?: Error) => void): void {
    if (!file.path) {
      return callback(new Error('File path not found'));
    }

    import('node:fs').then(({ unlink }) => {
      unlink(file.path!, callback);
    }).catch(callback);
  }
}

/**
 * Memory Storage Engine - Armazena arquivos em memória
 */
export class MemoryStorageEngine implements StorageEngine {
  _handleFile(req: any, file: FileInfo, callback: (error?: Error, info?: Partial<UploadedFile>) => void): void {
    const chunks: Buffer[] = [];
    let size = 0;

    file.stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
    });

    file.stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      callback(undefined, {
        buffer,
        size
      });
    });

    file.stream.on('error', callback);
  }
}

/**
 * S3 Storage Engine - Armazena arquivos no Amazon S3
 * Simulação - em produção usaria AWS SDK
 */
export class S3StorageEngine implements StorageEngine {
  private bucket: string;
  private region: string;
  private keyGenerator: (req: any, file: FileInfo) => string;

  constructor(options: {
    bucket: string;
    region?: string;
    key?: (req: any, file: FileInfo) => string;
  }) {
    this.bucket = options.bucket;
    this.region = options.region || 'us-east-1';
    this.keyGenerator = options.key || ((req, file) => `uploads/${Date.now()}-${file.originalname}`);
  }

  _handleFile(req: any, file: FileInfo, callback: (error?: Error, info?: Partial<UploadedFile>) => void): void {
    const key = this.keyGenerator(req, file);
    const chunks: Buffer[] = [];
    let size = 0;

    file.stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
    });

    file.stream.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        
        // Simulação de upload para S3
        // Em produção, usaria AWS SDK:
        // const result = await s3.upload({
        //   Bucket: this.bucket,
        //   Key: key,
        //   Body: buffer,
        //   ContentType: file.mimetype
        // }).promise();

        const location = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
        
        callback(undefined, {
          size,
          location,
          filename: key
        });
      } catch (error) {
        callback(error as Error);
      }
    });

    file.stream.on('error', callback);
  }

  _removeFile(req: any, file: UploadedFile, callback: (error?: Error) => void): void {
    // Simulação de remoção do S3
    // Em produção:
    // s3.deleteObject({
    //   Bucket: this.bucket,
    //   Key: file.filename
    // }, callback);
    
    callback(); // Simulação de sucesso
  }
}

/**
 * Google Cloud Storage Engine - Armazena arquivos no Google Cloud Storage
 * Simulação - em produção usaria @google-cloud/storage
 */
export class GCSStorageEngine implements StorageEngine {
  private bucketName: string;
  private keyGenerator: (req: any, file: FileInfo) => string;

  constructor(options: {
    bucket: string;
    key?: (req: any, file: FileInfo) => string;
  }) {
    this.bucketName = options.bucket;
    this.keyGenerator = options.key || ((req, file) => `uploads/${Date.now()}-${file.originalname}`);
  }

  _handleFile(req: any, file: FileInfo, callback: (error?: Error, info?: Partial<UploadedFile>) => void): void {
    const filename = this.keyGenerator(req, file);
    const chunks: Buffer[] = [];
    let size = 0;

    file.stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
    });

    file.stream.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        
        // Simulação de upload para GCS
        // Em produção:
        // const file = storage.bucket(this.bucketName).file(filename);
        // await file.save(buffer, {
        //   metadata: { contentType: file.mimetype }
        // });

        const location = `https://storage.googleapis.com/${this.bucketName}/${filename}`;
        
        callback(undefined, {
          size,
          location,
          filename
        });
      } catch (error) {
        callback(error as Error);
      }
    });

    file.stream.on('error', callback);
  }
}

/**
 * Factory para criar storage engines
 */
export class StorageEngineFactory {
  static disk(options?: {
    destination?: string | ((req: any, file: FileInfo) => string);
    filename?: string | ((req: any, file: FileInfo) => string);
  }): DiskStorageEngine {
    return new DiskStorageEngine(options);
  }

  static memory(): MemoryStorageEngine {
    return new MemoryStorageEngine();
  }

  static s3(options: {
    bucket: string;
    region?: string;
    key?: (req: any, file: FileInfo) => string;
  }): S3StorageEngine {
    return new S3StorageEngine(options);
  }

  static gcs(options: {
    bucket: string;
    key?: (req: any, file: FileInfo) => string;
  }): GCSStorageEngine {
    return new GCSStorageEngine(options);
  }
}

/**
 * Utilitários para storage engines
 */
export class StorageUtils {
  /**
   * Gera nome de arquivo seguro
   */
  static safeFilename(originalname: string): string {
    const ext = originalname.split('.').pop() || '';
    const name = originalname.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    return `${name}_${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`;
  }

  /**
   * Valida tipo MIME
   */
  static isValidMimeType(mimetype: string, allowedTypes: string[]): boolean {
    if (allowedTypes.length === 0) return true;
    
    return allowedTypes.some(allowed => {
      if (allowed.endsWith('/*')) {
        const category = allowed.slice(0, -2);
        return mimetype.startsWith(category + '/');
      }
      return mimetype === allowed;
    });
  }

  /**
   * Formata tamanho de arquivo
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}