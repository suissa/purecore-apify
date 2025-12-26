import { Request } from '../../types';
import { unlink, mkdirSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { Stream } from 'node:stream';

export interface StorageEngine {
  _handleFile(req: Request, file: any, cb: (err: any, info?: any) => void): void;
  _removeFile(req: Request, file: any, cb: (err: any) => void): void;
}

export type DestinationCallback = (req: Request, file: any, cb: (error: Error | null, destination: string) => void) => void;
export type FilenameCallback = (req: Request, file: any, cb: (error: Error | null, filename: string) => void) => void;

export interface DiskStorageOptions {
  destination?: string | DestinationCallback;
  filename?: FilenameCallback;
}

export class DiskStorage implements StorageEngine {
  getDestination: DestinationCallback;
  getFilename: FilenameCallback;

  constructor(opts: DiskStorageOptions = {}) {
    if (typeof opts.destination === 'string') {
        mkdirSync(opts.destination, { recursive: true });
        this.getDestination = function(_req, _file, cb) { cb(null, opts.destination as string) }
    } else if (opts.destination) {
        this.getDestination = opts.destination as DestinationCallback;
    } else {
         // Default destination usually is os specific, but here we can defaults to /tmp
         this.getDestination = function(_req, _file, cb) { cb(null, '/tmp') } 
    }

    this.getFilename = opts.filename || function(_req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      // Attempt to guess extension if possible or just use no extension?
      // Multer docs say: "Multer will not append any file extension for you"
      cb(null, file.fieldname + '-' + uniqueSuffix) 
    }
  }

  _handleFile(req: Request, file: any, cb: (err: any, info?: any) => void) {
    this.getDestination(req, file, (err, destination) => {
      if (err) return cb(err);
      this.getFilename(req, file, (err, filename) => {
        if (err) return cb(err);
        const finalPath = join(destination, filename);
        const outStream = createWriteStream(finalPath);
        
        file.stream.pipe(outStream);
        outStream.on('error', cb);
        outStream.on('finish', function() {
          cb(null, {
            destination: destination,
            filename: filename,
            path: finalPath,
            size: outStream.bytesWritten
          })
        });
      });
    });
  }

  _removeFile(req: Request, file: any, cb: (err: any) => void) {
    const path = file.path;
    delete file.destination;
    delete file.filename;
    delete file.path;
    if (path) {
        unlink(path, cb);
    } else {
        cb(null);
    }
  }
}

export class MemoryStorage implements StorageEngine {
    _handleFile(req: Request, file: any, cb: (err: any, info?: any) => void) {
        const chunks: Buffer[] = [];
        file.stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        file.stream.on('error', cb);
        file.stream.on('end', () => {
             const buffer = Buffer.concat(chunks);
             cb(null, {
                 buffer: buffer,
                 size: buffer.length
             });
        });
    }

    _removeFile(req: Request, file: any, cb: (err: any) => void) {
        delete file.buffer;
        cb(null);
    }
}
