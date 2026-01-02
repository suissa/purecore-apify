import { uploadify, diskStorage, memoryStorage } from './middlewares/uploadify';
import { Request, Response } from './types';
import { Readable } from 'node:stream';
import { unlinkSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// --- Helper Utilities ---

function createMultipartRequest(fields: { name: string, value: string | Buffer, filename?: string }[], boundary = '----WebKitFormBoundaryTest') {
  const chunks: Buffer[] = [];
  
  for (const field of fields) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    if (field.filename) {
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${field.name}"; filename="${field.filename}"\r\n`));
      chunks.push(Buffer.from(`Content-Type: application/octet-stream\r\n\r\n`));
    } else {
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${field.name}"\r\n\r\n`));
    }
    
    if (Buffer.isBuffer(field.value)) {
        chunks.push(field.value);
    } else {
        chunks.push(Buffer.from(field.value));
    }
    chunks.push(Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  
  const content = Buffer.concat(chunks);
  
  const req = Readable.from([content]) as any as Request;
  req.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': content.length.toString()
  };
  req.method = 'POST';
  req.body = {};
  
  return req;
}

function createMockResponse() {
    return {
        status: (code: number) => ({ json: (d: any) => {} }),
        json: (d: any) => {},
        setHeader: () => {},
        end: () => {}
    } as any as Response;
}

async function runMiddleware(middleware: any, req: Request) {
    return new Promise<void>((resolve) => {
        middleware(req, createMockResponse(), (err?: any) => {
            if (err) console.error('Unexpected next error:', err);
            resolve();
        });
    });
}

// --- Tests ---

async function testDiskStorage() {
    console.log('🧪 Testing DiskStorage .single()...');
    const uploadDir = join(process.cwd(), 'uploads_test');
    const storage = diskStorage({ destination: uploadDir });
    const middleware = uploadify({ storage }).single('msg');
    
    const req = createMultipartRequest([
        { name: 'msg', value: 'Hello Disk', filename: 'hello.txt' }
    ]);
    
    await runMiddleware(middleware, req);
    
    if (req.file && existsSync(req.file.path!) && readFileSync(req.file.path!).toString() === 'Hello Disk') {
        console.log('✅ DiskStorage Success');
        // Cleanup
        unlinkSync(req.file.path!);
    } else {
        console.error('❌ DiskStorage Failed', req.file);
    }
}

async function testArray() {
    console.log('🧪 Testing .array()...');
    const middleware = uploadify({ storage: memoryStorage() }).array('photos', 2);
    
    const req = createMultipartRequest([
        { name: 'photos', value: 'Photo 1', filename: 'p1.jpg' },
        { name: 'photos', value: 'Photo 2', filename: 'p2.jpg' },
        { name: 'other', value: 'Ignored', filename: 'ignored.jpg' } // Should be ignored or notification
    ]);
    
    await runMiddleware(middleware, req);
    
    const files = req.files as any[];
    if (Array.isArray(files) && files.length === 2 && files[0].originalname === 'p1.jpg') {
         console.log('✅ .array() Success');
    } else {
         console.error('❌ .array() Failed', req.files);
    }
}

async function testFields() {
    console.log('🧪 Testing .fields()...');
    const middleware = uploadify({ storage: memoryStorage() }).fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'gallery', maxCount: 2 }
    ]);
    
    const req = createMultipartRequest([
        { name: 'avatar', value: 'Ava', filename: 'ava.png' },
        { name: 'gallery', value: 'Gal 1', filename: 'g1.png' },
        { name: 'gallery', value: 'Gal 2', filename: 'g2.png' }
    ]);
    
    await runMiddleware(middleware, req);
    
    const files = req.files as any;
    if (files['avatar']?.length === 1 && files['gallery']?.length === 2) {
        console.log('✅ .fields() Success');
    } else {
        console.error('❌ .fields() Failed', req.files);
    }
}

async function testAny() {
    console.log('🧪 Testing .any()...');
    const middleware = uploadify({ storage: memoryStorage() }).any();
    
    const req = createMultipartRequest([
        { name: 'f1', value: 'v1', filename: 'f1.txt' },
        { name: 'f2', value: 'v2', filename: 'f2.txt' }
    ]);
    
    await runMiddleware(middleware, req);
    
    if (Array.isArray(req.files) && req.files.length === 2) {
        console.log('✅ .any() Success');
    } else {
        console.error('❌ .any() Failed', req.files);
    }
}

async function testFileSizeLimit() {
    console.log('🧪 Testing limits.fileSize...');
    const middleware = uploadify({ 
        storage: memoryStorage(),
        limits: { fileSize: 5 } // 5 bytes max
    }).single('doc');
    
    const req = createMultipartRequest([
        { name: 'doc', value: '123456', filename: 'big.txt' } // 6 bytes
    ]);
    
    await runMiddleware(middleware, req);
    
    const notif = req.notifications?.find(n => n.code === 'LIMIT_FILE_SIZE');
    if (notif) {
        console.log('✅ fileSize Limit Success (Notification received)');
    } else {
        console.error('❌ fileSize Limit Failed. Notifications:', req.notifications);
    }
}

async function testFieldLimit() {
    console.log('🧪 Testing limits.fieldSize (truncate)...');
    const middleware = uploadify({ 
        storage: memoryStorage(),
        limits: { fieldSize: 3 } 
    }).none();
    
    const req = createMultipartRequest([
        { name: 'username', value: '123456' } // Should be truncated to '123'
    ]);
    
    await runMiddleware(middleware, req);
    
    if (req.body['username'] === '123' && req.notifications?.find(n => n.code === 'LIMIT_FIELD_VALUE')) {
        console.log('✅ fieldSize Limit Success');
    } else {
        console.error('❌ fieldSize Limit Failed', req.body);
    }
}

async function testFileFilter() {
    console.log('🧪 Testing fileFilter...');
    const middleware = uploadify({
        storage: memoryStorage(),
        fileFilter: (req, file, cb) => {
            if (file.mimetype === 'application/pdf') cb(null, true);
            else cb(new Error('Only PDFs allowed'), false);
        }
    }).single('doc');

    const req = createMultipartRequest([
        { name: 'doc', value: 'bad', filename: 'bad.txt' } // default mimetype is octet-stream
    ]);

    await runMiddleware(middleware, req);

    const notif = req.notifications?.find(n => n.code === 'FILE_FILTER_ERROR');
    if (notif) {
        console.log('✅ fileFilter Success (Notification received)');
    } else {
        console.error('❌ fileFilter Failed', req.notifications);
    }
}

async function runAll() {
    console.log('=== Starting Uploadify Comprehensive Test Suite ===');
    try {
        await testDiskStorage();
        await testArray();
        await testFields();
        await testAny();
        await testFileSizeLimit();
        await testFieldLimit();
        await testFileFilter();
        console.log('=== All Tests Completed ===');
    } catch (e) {
        console.error('Global Test Error:', e);
    }
}

runAll();
