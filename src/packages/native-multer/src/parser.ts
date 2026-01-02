/**
 * Native multipart parser implementation
 */

import { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import { AsyncResource } from 'node:async_hooks';
import { MulterError } from './errors.js';
import type { Request, File, Field, Limits, FileInfo } from './types.js';

export interface ParserOptions {
  limits?: Limits;
  preserveAsyncContext?: boolean;
}

export class NativeMultipartParser {
  private limits: Required<Limits>;
  private asyncResource?: AsyncResource;

  constructor(options: ParserOptions = {}) {
    this.limits = {
      fieldNameSize: options.limits?.fieldNameSize || 100,
      fieldSize: options.limits?.fieldSize || 1024 * 1024, // 1MB
      fields: options.limits?.fields || Infinity,
      fileSize: options.limits?.fileSize || Infinity,
      files: options.limits?.files || Infinity,
      parts: options.limits?.parts || Infinity,
      headerPairs: options.limits?.headerPairs || 2000
    };

    if (options.preserveAsyncContext !== false) {
      this.asyncResource = new AsyncResource('NativeMultipartParser');
    }
  }

  async parse(req: IncomingMessage): Promise<{ fields: Field[], files: FileInfo[] }> {
    const contentType = req.headers['content-type'];
    
    if (!contentType?.includes('multipart/form-data')) {
      throw new MulterError('INVALID_CONTENT_TYPE');
    }

    const boundary = this.extractBoundary(contentType);
    if (!boundary) {
      throw new MulterError('INVALID_BOUNDARY');
    }

    if (this.asyncResource) {
      return this.asyncResource.runInAsyncScope(async () => {
        return this.parseWithAsyncContext(req, boundary);
      });
    }

    return this.parseWithAsyncContext(req, boundary);
  }

  private async parseWithAsyncContext(req: IncomingMessage, boundary: string): Promise<{ fields: Field[], files: FileInfo[] }> {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    
    // Collect all chunks with size limit
    for await (const chunk of req) {
      totalSize += chunk.length;
      if (totalSize > this.limits.fieldSize * this.limits.fields + this.limits.fileSize * this.limits.files) {
        throw new MulterError('LIMIT_PART_COUNT');
      }
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    return this.parseMultipartBuffer(buffer, boundary);
  }

  private extractBoundary(contentType: string): string | null {
    const match = contentType.match(/boundary=(.+)$/);
    return match ? match[1].replace(/"/g, '') : null;
  }

  private parseMultipartBuffer(buffer: Buffer, boundary: string): { fields: Field[], files: FileInfo[] } {
    const fields: Field[] = [];
    const files: FileInfo[] = [];
    
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = this.splitBuffer(buffer, boundaryBuffer);

    let partCount = 0;
    let fieldCount = 0;
    let fileCount = 0;

    for (const part of parts) {
      if (part.length === 0) continue;

      partCount++;
      if (partCount > this.limits.parts) {
        throw new MulterError('LIMIT_PART_COUNT');
      }

      const { headers, body } = this.parsePartHeaders(part);
      const disposition = headers['content-disposition'];
      
      if (!disposition) continue;

      const nameMatch = disposition.match(/name="([^"]+)"/);
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      
      if (!nameMatch) {
        throw new MulterError('MISSING_FIELD_NAME');
      }

      const fieldName = nameMatch[1];

      if (fieldName.length > this.limits.fieldNameSize) {
        throw new MulterError('LIMIT_FIELD_KEY', fieldName);
      }

      if (filenameMatch) {
        // It's a file
        fileCount++;
        if (fileCount > this.limits.files) {
          throw new MulterError('LIMIT_FILE_COUNT', fieldName);
        }

        if (body.length > this.limits.fileSize) {
          throw new MulterError('LIMIT_FILE_SIZE', fieldName);
        }

        const filename = filenameMatch[1];
        const contentType = headers['content-type'] || 'application/octet-stream';
        
        const stream = Readable.from(body);
        
        files.push({
          fieldname: fieldName,
          originalname: filename,
          encoding: '7bit',
          mimetype: contentType,
          stream
        });
      } else {
        // It's a text field
        fieldCount++;
        if (fieldCount > this.limits.fields) {
          throw new MulterError('LIMIT_FIELD_COUNT', fieldName);
        }

        if (body.length > this.limits.fieldSize) {
          throw new MulterError('LIMIT_FIELD_VALUE', fieldName);
        }

        fields.push({
          name: fieldName,
          value: body.toString('utf8')
        });
      }
    }

    return { fields, files };
  }

  private splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
    const parts: Buffer[] = [];
    let start = 0;
    let pos = 0;

    while (pos < buffer.length) {
      const found = buffer.indexOf(delimiter, pos);
      if (found === -1) break;

      if (found > start) {
        parts.push(buffer.subarray(start, found));
      }

      pos = found + delimiter.length;
      start = pos;
    }

    return parts;
  }

  private parsePartHeaders(part: Buffer): { headers: Record<string, string>, body: Buffer } {
    const headerEndIndex = part.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) {
      return { headers: {}, body: part };
    }

    const headerSection = part.subarray(0, headerEndIndex).toString('utf8');
    const body = part.subarray(headerEndIndex + 4);

    const headers: Record<string, string> = {};
    const headerLines = headerSection.split('\r\n');

    let headerPairCount = 0;
    for (const line of headerLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        headerPairCount++;
        if (headerPairCount > this.limits.headerPairs) {
          throw new MulterError('LIMIT_PART_COUNT');
        }

        const key = line.substring(0, colonIndex).toLowerCase().trim();
        const value = line.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }

    return { headers, body };
  }
}