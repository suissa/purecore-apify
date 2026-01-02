/**
 * @purecore/native-multer
 * Native Node.js multipart/form-data parser
 * Drop-in replacement for Multer with superior performance and zero dependencies
 */

export { MulterError } from "./errors.js";
export {
  diskStorage,
  memoryStorage,
  s3Storage,
  gcsStorage,
} from "./storage/index.js";
export { default } from "./multer.js";

// Re-export types for compatibility
export type {
  Request,
  File,
  Field,
  Options,
  StorageEngine,
  DiskStorageOptions,
  MemoryStorageOptions,
  S3StorageOptions,
  GCSStorageOptions,
  FileFilterCallback,
  Limits,
} from "./types.js";
