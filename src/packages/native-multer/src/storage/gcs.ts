/**
 * Google Cloud Storage engine (simulation - compatible with Multer GCS)
 */

import type { StorageEngine, Request, File, FileInfo, GCSStorageOptions } from '../types.js';

export class GCSStorage implements StorageEngine {
  private bucketName: string;
  private filenameGenerator: string | ((req: Request, file: File) => string);
  private metadataGenerator: { [key: string]: string } | ((req: Request, file: File) => { [key: string]: string });

  constructor(options: GCSStorageOptions) {
    this.bucketName = options.bucket;
    this.filenameGenerator = options.filename || this.defaultFilenameGenerator;
    this.metadataGenerator = options.metadata || {};
  }

  private defaultFilenameGenerator(req: Request, file: File): string {
    return `uploads/${Date.now()}-${file.originalname}`;
  }

  _handleFile(req: Request, file: FileInfo, callback: (error?: any, info?: Partial<File>) => void): void {
    const filename = typeof this.filenameGenerator === 'function'
      ? this.filenameGenerator(req, file as unknown as File)
      : this.filenameGenerator;

    const metadata = typeof this.metadataGenerator === 'function'
      ? this.metadataGenerator(req, file as unknown as File)
      : this.metadataGenerator;

    const chunks: Buffer[] = [];
    let size = 0;

    file.stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
    });

    file.stream.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        
        // Simulation of GCS upload
        // In production, this would use @google-cloud/storage:
        // const file = storage.bucket(this.bucketName).file(filename);
        // await file.save(buffer, {
        //   metadata: {
        //     contentType: file.mimetype,
        //     metadata: metadata
        //   }
        // });

        const location = `https://storage.googleapis.com/${this.bucketName}/${filename}`;
        
        callback(undefined, {
          size,
          bucket: this.bucketName,
          filename,
          location
        });
      } catch (error) {
        callback(error);
      }
    });

    file.stream.on('error', callback);
  }

  _removeFile(req: Request, file: File, callback: (error?: any) => void): void {
    // Simulation of GCS deletion
    // In production:
    // const gcsFile = storage.bucket(this.bucketName).file(file.filename);
    // gcsFile.delete(callback);
    
    callback(); // Simulation of success
  }
}

/**
 * Create a Google Cloud Storage engine
 */
export function gcsStorage(options: GCSStorageOptions): GCSStorage {
  return new GCSStorage(options);
}