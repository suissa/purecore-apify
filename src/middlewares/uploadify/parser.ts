import { PassThrough } from 'node:stream';

export type Part = {
  headers: any;
  name: string;
  filename?: string;
  encoding: string;
  mimetype: string;
  stream: PassThrough;
};

export class MultipartParser {
  boundary: string;
  delimiter: Buffer;
  buffer: Buffer;
  state: 'PREAMBLE' | 'HEADERS' | 'BODY' = 'PREAMBLE';
  currentStream: PassThrough | null = null;
  onPart: (part: Part) => void;
  onField: (name: string, value: string) => void;

  constructor(boundary: string, onPart: (part: Part) => void, onField: (name: string, value: string) => void) {
    this.boundary = boundary;
    this.delimiter = Buffer.from(`--${boundary}`);
    this.buffer = Buffer.alloc(0);
    this.onPart = onPart;
    this.onField = onField;
  }

  write(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.process();
  }

  process() {
    let loop = true;
    while (loop) { 
        if (this.state === 'PREAMBLE') {
             const idx = this.buffer.indexOf(this.delimiter);
             if (idx !== -1) {
                 this.buffer = this.buffer.subarray(idx + this.delimiter.length);
                 this.state = 'HEADERS';
                 // The delimiter for subsequent boundaries includes \r\n
                 this.delimiter = Buffer.from(`\r\n--${this.boundary}`); 
             } else {
                 // Keep a tail to ensure we don't miss split boundary
                 const tailLen = this.delimiter.length - 1;
                 if (this.buffer.length > tailLen) {
                     this.buffer = this.buffer.subarray(this.buffer.length - tailLen);
                 }
                 loop = false;
             }
        } 
        
        else if (this.state === 'HEADERS') {
             // Check for end of stream markers first
             // Usually it's \r\n--boundary-- or just -- (if we came from delimiter)
             
             // Note: When we switch from PREAMBLE or BODY, we consumed the delimiter.
             // So we are at the char immediately after boundary.
             // Standard is: --boundary\r\nHEADERS...
             // OR: --boundary-- (Finish)

             // If we look at the first 2 bytes:
             if (this.buffer.length >= 2) {
                const start = this.buffer.subarray(0, 2).toString();
                if (start === '--') {
                     // End of multipart
                     this.buffer = Buffer.alloc(0);
                     loop = false;
                     return;
                }
                if (start === '\r\n') {
                    // Skip the newline after boundary
                    this.buffer = this.buffer.subarray(2);
                }
             } else {
                 loop = false;
                 return; // Need more data
             }

             const idx = this.buffer.indexOf('\r\n\r\n');
             if (idx !== -1) {
                 const headersRaw = this.buffer.subarray(0, idx).toString();
                 this.buffer = this.buffer.subarray(idx + 4);
                 
                 const headers = this.parseHeaders(headersRaw);
                 
                 const disposition = headers['content-disposition'] || '';
                 const nameMatch = disposition.match(/name="([^"]+)"/);
                 const filenameMatch = disposition.match(/filename="([^"]+)"/);
                 
                 const name = nameMatch ? nameMatch[1] : '';
                 const filename = filenameMatch ? filenameMatch[1] : undefined;
                 
                  if (filename) {
                     const part: Part = {
                         headers,
                         name,
                         filename,
                         encoding: headers['content-transfer-encoding'] || '7bit',
                         mimetype: headers['content-type'] || 'application/octet-stream',
                         stream: new PassThrough()
                     };
                     this.currentStream = part.stream;
                     this.onPart(part);
                  } else {
                      // Field
                      this.currentStream = new PassThrough(); 
                      const chunks: Buffer[] = [];
                      const stream = this.currentStream;
                      stream.on('data', c => chunks.push(c));
                      // We need to capture 'name' in closure
                      const fieldName = name; 
                      stream.on('end', () => {
                          this.onField(fieldName, Buffer.concat(chunks).toString());
                      });
                  }
                 
                 this.state = 'BODY';
             } else {
                 loop = false;
             }
        }
        
        else if (this.state === 'BODY') {
             const idx = this.buffer.indexOf(this.delimiter);
             if (idx !== -1) {
                 const content = this.buffer.subarray(0, idx);
                 if (this.currentStream) {
                     this.currentStream.write(content);
                     this.currentStream.end();
                     this.currentStream = null;
                 }
                 this.buffer = this.buffer.subarray(idx + this.delimiter.length);
                 this.state = 'HEADERS';
             } else {
                 // Push buffer content but keep tail
                 const safeLen = this.buffer.length - (this.delimiter.length + 4); 
                 if (safeLen > 0) {
                     const content = this.buffer.subarray(0, safeLen);
                     if (this.currentStream) this.currentStream.write(content);
                     this.buffer = this.buffer.subarray(safeLen);
                 }
                 loop = false;
             }
        }
    }
  }

  parseHeaders(raw: string) {
      const headers: any = {};
      raw.split('\r\n').forEach(line => {
          const parts = line.split(':');
          const key = parts.shift()?.trim().toLowerCase();
          const value = parts.join(':').trim();
          if (key && value) headers[key] = value;
      });
      return headers;
  }
}
