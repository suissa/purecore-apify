/**
 * Memory storage engine compatible with Multer
 */

import type { StorageEngine, Request, File, FileInfo, MemoryStorageOptions } from '../types.js';

export class MemoryStorage implements StorageEngine {
  constructor(options: MemoryStorageOptions = {}) {
    // Memory storage doesn't need specific options
  }

  _handleFile(req: Request, file: FileInfo, callback: (error?: any, info?: Partial<File>) => void): void {
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

  // Memory storage doesn't need file removal
}

/**
 * Create a memory storage engine
 */
export function memoryStorage(options?: MemoryStorageOptions): MemoryStorage {
  return new MemoryStorage(options);
}