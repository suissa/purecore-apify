/**
 * Main Multer-compatible interface
 */

import { NativeMultipartParser } from './parser.js';
import { DiskStorage } from './storage/disk.js';
import { MulterError } from './errors.js';
import type { 
  Request, 
  Response, 
  NextFunction, 
  RequestHandler, 
  Options, 
  File, 
  Field, 
  FieldSpec,
  StorageEngine 
} from './types.js';

export class Multer {
  private storage: StorageEngine;
  private options: Options;
  private parser: NativeMultipartParser;

  constructor(options: Options = {}) {
    this.options = options;
    this.storage = options.storage || new DiskStorage({ destination: options.dest || './uploads' });
    this.parser = new NativeMultipartParser({
      limits: options.limits,
      preserveAsyncContext: true
    });
  }

  /**
   * Accept a single file with the given field name
   */
  single(fieldname: string): RequestHandler {
    return this.createMiddleware('single', fieldname);
  }

  /**
   * Accept an array of files, all with the given field name
   */
  array(fieldname: string, maxCount?: number): RequestHandler {
    return this.createMiddleware('array', fieldname, maxCount);
  }

  /**
   * Accept a mix of files, specified by fields
   */
  fields(fields: FieldSpec[]): RequestHandler {
    return this.createMiddleware('fields', fields);
  }

  /**
   * Accept only text fields. If any file upload is made, error with code "LIMIT_UNEXPECTED_FILE" will be issued
   */
  none(): RequestHandler {
    return this.createMiddleware('none');
  }

  /**
   * Accept any files that comes over the wire. An array of files will be stored in req.files
   */
  any(): RequestHandler {
    return this.createMiddleware('any');
  }

  private createMiddleware(type: string, fieldname?: string | FieldSpec[], maxCount?: number): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { fields, files } = await this.parser.parse(req);

        // Process text fields
        if (!req.body) req.body = {};
        for (const field of fields) {
          req.body[field.name] = field.value;
        }

        // Process files based on middleware type
        const processedFiles = await this.processFiles(files, type, fieldname, maxCount);
        
        // Set req.file and req.files based on Multer conventions
        this.setRequestFiles(req, processedFiles, type, fieldname);

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  private async processFiles(
    files: any[], 
    type: string, 
    fieldname?: string | FieldSpec[], 
    maxCount?: number
  ): Promise<File[]> {
    const processedFiles: File[] = [];

    for (const fileInfo of files) {
      // Validate file based on middleware type
      if (!this.validateFile(fileInfo, type, fieldname, maxCount, processedFiles.length)) {
        continue;
      }

      // Apply file filter if specified
      if (this.options.fileFilter) {
        const accepted = await new Promise<boolean>((resolve) => {
          this.options.fileFilter!(
            {} as Request, // req not needed for filter
            fileInfo as File,
            (error, acceptFile) => {
              if (error) throw error;
              resolve(acceptFile || false);
            }
          );
        });

        if (!accepted) continue;
      }

      // Process file through storage engine
      const processedFile = await new Promise<File>((resolve, reject) => {
        this.storage._handleFile({} as Request, fileInfo, (error, info) => {
          if (error) return reject(error);

          const file: File = {
            fieldname: fileInfo.fieldname,
            originalname: fileInfo.originalname,
            encoding: fileInfo.encoding,
            mimetype: fileInfo.mimetype,
            size: info?.size || 0,
            destination: info?.destination,
            filename: info?.filename,
            path: info?.path,
            buffer: info?.buffer,
            location: info?.location,
            etag: info?.etag,
            bucket: info?.bucket,
            key: info?.key
          };

          resolve(file);
        });
      });

      processedFiles.push(processedFile);
    }

    return processedFiles;
  }

  private validateFile(
    fileInfo: any, 
    type: string, 
    fieldname?: string | FieldSpec[], 
    maxCount?: number,
    currentCount?: number
  ): boolean {
    switch (type) {
      case 'single':
        if (typeof fieldname === 'string' && fileInfo.fieldname !== fieldname) {
          throw new MulterError('LIMIT_UNEXPECTED_FILE', fileInfo.fieldname);
        }
        if (currentCount && currentCount >= 1) {
          throw new MulterError('LIMIT_UNEXPECTED_FILE', fileInfo.fieldname);
        }
        return true;

      case 'array':
        if (typeof fieldname === 'string' && fileInfo.fieldname !== fieldname) {
          throw new MulterError('LIMIT_UNEXPECTED_FILE', fileInfo.fieldname);
        }
        if (maxCount && currentCount && currentCount >= maxCount) {
          throw new MulterError('LIMIT_FILE_COUNT', fileInfo.fieldname);
        }
        return true;

      case 'fields':
        if (Array.isArray(fieldname)) {
          const fieldSpec = fieldname.find(f => f.name === fileInfo.fieldname);
          if (!fieldSpec) {
            throw new MulterError('LIMIT_UNEXPECTED_FILE', fileInfo.fieldname);
          }
          // Additional validation for field-specific maxCount would go here
          return true;
        }
        return false;

      case 'none':
        throw new MulterError('LIMIT_UNEXPECTED_FILE', fileInfo.fieldname);

      case 'any':
        return true;

      default:
        return false;
    }
  }

  private setRequestFiles(req: Request, files: File[], type: string, fieldname?: string | FieldSpec[]): void {
    switch (type) {
      case 'single':
        req.file = files[0] || undefined;
        break;

      case 'array':
        req.files = files;
        break;

      case 'fields':
        if (Array.isArray(fieldname)) {
          const filesByField: { [fieldname: string]: File[] } = {};
          for (const file of files) {
            if (!filesByField[file.fieldname]) {
              filesByField[file.fieldname] = [];
            }
            filesByField[file.fieldname].push(file);
          }
          req.files = filesByField;
        }
        break;

      case 'none':
        // No files should be set
        break;

      case 'any':
        req.files = files;
        break;
    }
  }
}

/**
 * Create a Multer instance
 */
function multer(options?: Options): Multer {
  return new Multer(options);
}

// Export the main function as default
export default multer;