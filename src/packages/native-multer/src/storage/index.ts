/**
 * Storage engines compatible with Multer
 */

export { DiskStorage, diskStorage } from './disk.js';
export { MemoryStorage, memoryStorage } from './memory.js';
export { S3Storage, s3Storage } from './s3.js';
export { GCSStorage, gcsStorage } from './gcs.js';

export type {
  DiskStorageOptions,
  MemoryStorageOptions,
  S3StorageOptions,
  GCSStorageOptions
} from '../types.js';