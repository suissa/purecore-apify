import { uploadify } from './middlewares/uploadify';
import { Request, Response } from './types';
import { Readable } from 'node:stream';

async function testUploadify() {
  console.log('🚀 Iniciando teste do Uploadify (Nativo)...');

  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const content = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="user"',
    '',
    'suissa',
    `--${boundary}`,
    'Content-Disposition: form-data; name="avatar"; filename="test.txt"',
    'Content-Type: text/plain',
    '',
    'Conteúdo do arquivo de teste nativo!',
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const req = Readable.from([Buffer.from(content)]) as any as Request;
  req.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': content.length.toString()
  };
  req.method = 'POST';
  req.body = {};

  const res = {
    status: (code: number) => {
      console.log(`Response Status: ${code}`);
      return res;
    },
    json: (data: any) => console.log('Response JSON:', data),
    setHeader: () => {},
    end: () => {}
  } as any as Response;

  const next = (err?: any) => {
    if (err) console.error('Next error:', err);
    console.log('✅ Middleware finalizado com sucesso.');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    console.log('Notifications:', req.notifications);
  };

  const middleware = uploadify().single('avatar');
  await middleware(req, res, next);
}

testUploadify().catch(console.error);
