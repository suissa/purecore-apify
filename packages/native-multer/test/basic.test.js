/**
 * Basic tests for @purecore/native-multer
 */

import { describe, it } from 'node:test';
import { strictEqual, ok, throws } from 'node:assert';
import multer from '../dist/index.js';

describe('@purecore/native-multer', () => {
  it('should create multer instance', () => {
    const upload = multer();
    ok(upload);
    ok(typeof upload.single === 'function');
    ok(typeof upload.array === 'function');
    ok(typeof upload.fields === 'function');
    ok(typeof upload.none === 'function');
    ok(typeof upload.any === 'function');
  });

  it('should create disk storage', () => {
    const storage = multer.diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => cb(null, file.originalname)
    });
    ok(storage);
  });

  it('should create memory storage', () => {
    const storage = multer.memoryStorage();
    ok(storage);
  });

  it('should create S3 storage', () => {
    const storage = multer.s3Storage({
      bucket: 'test-bucket'
    });
    ok(storage);
  });

  it('should create GCS storage', () => {
    const storage = multer.gcsStorage({
      bucket: 'test-bucket'
    });
    ok(storage);
  });

  it('should handle options correctly', () => {
    const upload = multer({
      dest: './uploads',
      limits: {
        fileSize: 1024 * 1024,
        files: 5
      }
    });
    ok(upload);
  });

  it('should export MulterError', () => {
    ok(multer.MulterError);
    const error = new multer.MulterError('LIMIT_FILE_SIZE');
    ok(error instanceof Error);
    strictEqual(error.name, 'MulterError');
    strictEqual(error.code, 'LIMIT_FILE_SIZE');
  });
});

console.log('✅ Basic tests completed successfully');