/**
 * Disk storage engine compatible with Multer
 */

import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import type { StorageEngine, Request, File, FileInfo, DiskStorageOptions } from '../types.js';

export class DiskStorage implements StorageEngine {
  private destination: string | ((req: Request, file: File, callback: (error: Error | null, destination: string) => void) => void);
  private filename: string | ((req: Request, file: File, callback: (error: Error | null, filename: string) => void) => void);

  constructor(options: DiskStorageOptions = {}) {
    this.destination = options.destination || './uploads';
    this.filename = options.filename || this.defaultFilename;
  }

  private defaultFilename(req: Request, file: File, callback: (error: Error | null, filename: string) => void): void {
    const uniqueName = `${Date.now()}-${randomUUID()}-${file.originalname}`;
    callback(null, uniqueName);
  }

  _handleFile(req: Request, file: FileInfo, callback: (error?: any, info?: Partial<File>) => void): void {
    this.getDestination(req, file as unknown as File, (err, destination) => {
      if (err) return callback(err);

      this.getFilename(req, file as unknown as File, (err, filename) => {
        if (err) return callback(err);

        const filepath = join(destination, filename);

        // Create directory if it doesn't exist
        mkdir(destination, { recursive: true })
          .then(() => {
            const writeStream = createWriteStream(filepath);
            let size = 0;

            // Count bytes during upload
            file.stream.on('data', (chunk: Buffer) => {
              size += chunk.length;
            });

            // Pipeline to save file
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
      });
    });
  }

  _removeFile(req: Request, file: File, callback: (error?: any) => void): void {
    if (!file.path) {
      return callback(new Error('File path not found'));
    }

    import('node:fs').then(({ unlink }) => {
      unlink(file.path!, callback);
    }).catch(callback);
  }

  private getDestination(req: Request, file: File, callback: (error: Error | null, destination: string) => void): void {
    if (typeof this.destination === 'function') {
      this.destination(req, file, callback);
    } else {
      callback(null, this.destination);
    }
  }

  private getFilename(req: Request, file: File, callback: (error: Error | null, filename: string) => void): void {
    if (typeof this.filename === 'function') {
      this.filename(req, file, callback);
    } else {
      this.defaultFilename(req, file, callback);
    }
  }
}

/**
 * Create a disk storage engine
 */
export function diskStorage(options?: DiskStorageOptions): DiskStorage {
  return new DiskStorage(options);
}