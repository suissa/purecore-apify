/**
 * Error classes compatible with Multer
 */

export class MulterError extends Error {
  public code: string;
  public field?: string;
  public storageErrors?: Error[];

  constructor(code: string, field?: string) {
    super();
    this.name = 'MulterError';
    this.code = code;
    this.field = field;

    // Set appropriate error messages
    switch (code) {
      case 'LIMIT_PART_COUNT':
        this.message = 'Too many parts';
        break;
      case 'LIMIT_FILE_SIZE':
        this.message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        this.message = 'Too many files';
        break;
      case 'LIMIT_FIELD_KEY':
        this.message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        this.message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        this.message = 'Too many fields';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        this.message = 'Unexpected field';
        break;
      case 'MISSING_FIELD_NAME':
        this.message = 'Field name missing';
        break;
      case 'INVALID_MULTIPART':
        this.message = 'Invalid multipart form data';
        break;
      case 'INVALID_CONTENT_TYPE':
        this.message = 'Invalid content type';
        break;
      case 'INVALID_BOUNDARY':
        this.message = 'Invalid boundary';
        break;
      default:
        this.message = `Multer error: ${code}`;
    }

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MulterError);
    }
  }
}

// Error codes constants for easy reference
export const ERROR_CODES = {
  LIMIT_PART_COUNT: 'LIMIT_PART_COUNT',
  LIMIT_FILE_SIZE: 'LIMIT_FILE_SIZE',
  LIMIT_FILE_COUNT: 'LIMIT_FILE_COUNT',
  LIMIT_FIELD_KEY: 'LIMIT_FIELD_KEY',
  LIMIT_FIELD_VALUE: 'LIMIT_FIELD_VALUE',
  LIMIT_FIELD_COUNT: 'LIMIT_FIELD_COUNT',
  LIMIT_UNEXPECTED_FILE: 'LIMIT_UNEXPECTED_FILE',
  MISSING_FIELD_NAME: 'MISSING_FIELD_NAME',
  INVALID_MULTIPART: 'INVALID_MULTIPART',
  INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE',
  INVALID_BOUNDARY: 'INVALID_BOUNDARY'
} as const;