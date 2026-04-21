/**
 * Example usage with Express.js
 */

const express = require('express');
const multer = require('@purecore/native-multer');
const path = require('path');

const app = express();
const PORT = 3000;

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Routes
app.get('/', (req, res) => {
  res.send(`
    <h1>@purecore/native-multer Example</h1>
    <h2>Single File Upload</h2>
    <form action="/upload/single" method="post" enctype="multipart/form-data">
      <input type="file" name="avatar" accept="image/*" required>
      <button type="submit">Upload</button>
    </form>
    
    <h2>Multiple Files Upload</h2>
    <form action="/upload/multiple" method="post" enctype="multipart/form-data">
      <input type="file" name="photos" accept="image/*" multiple required>
      <button type="submit">Upload</button>
    </form>
    
    <h2>Mixed Fields Upload</h2>
    <form action="/upload/fields" method="post" enctype="multipart/form-data">
      <input type="text" name="title" placeholder="Title" required><br><br>
      <input type="file" name="avatar" accept="image/*"><br><br>
      <input type="file" name="gallery" accept="image/*" multiple><br><br>
      <button type="submit">Upload</button>
    </form>
  `);
});

// Single file upload
app.post('/upload/single', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    message: 'File uploaded successfully',
    file: {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
});

// Multiple files upload
app.post('/upload/multiple', upload.array('photos', 12), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  res.json({
    message: `${req.files.length} files uploaded successfully`,
    files: req.files.map(file => ({
      originalname: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype
    }))
  });
});

// Mixed fields upload
app.post('/upload/fields', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'gallery', maxCount: 8 }
]), (req, res) => {
  res.json({
    message: 'Upload completed',
    body: req.body,
    files: req.files
  });
});

// Memory storage example
const memoryUpload = multer({ storage: multer.memoryStorage() });

app.post('/upload/memory', memoryUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    message: 'File uploaded to memory',
    file: {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      bufferSize: req.file.buffer.length
    }
  });
});

// S3 storage example (simulation)
const s3Upload = multer({
  storage: multer.s3Storage({
    bucket: 'my-app-uploads',
    region: 'us-east-1',
    key: (req, file) => `uploads/${Date.now()}-${file.originalname}`
  })
});

app.post('/upload/s3', s3Upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    message: 'File uploaded to S3 (simulated)',
    file: {
      originalname: req.file.originalname,
      size: req.file.size,
      location: req.file.location,
      bucket: req.file.bucket,
      key: req.file.key
    }
  });
});

// Error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field' });
    }
  }
  
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📁 Upload directory: ./uploads/');
  console.log('🎯 Try uploading some files!');
});