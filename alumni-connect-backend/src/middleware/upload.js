import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// Ensure folders exist
['avatars', 'resumes', 'media'].forEach(sub => {
  const dir = path.join(UPLOAD_ROOT, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ============================================================
// Storage config
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Route-based folder decide
    const url = req.baseUrl || '';
    let folder = 'media';
    if (url.includes('avatar')) folder = 'avatars';
    else if (url.includes('resume')) folder = 'resumes';
    else if (url.includes('media')) folder = 'media';
    cb(null, path.join(UPLOAD_ROOT, folder));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

// ============================================================
// File filter — allow images + PDFs
// ============================================================
const fileFilter = (req, file, cb) => {
  const allowedImage = /image\/(jpeg|jpg|png|webp|gif)/;
  const allowedDoc = /application\/(pdf|msword)/;
  const allowedDocx = /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/;

  if (allowedImage.test(file.mimetype) || allowedDoc.test(file.mimetype) || allowedDocx.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPG, PNG, WEBP, GIF) and documents (PDF, DOCX) allowed.'));
  }
};

// ============================================================
// Export 3 uploaders
// ============================================================
const MAX_SIZE = Number(process.env.MAX_FILE_SIZE) || 15 * 1024 * 1024; // 15MB

export const uploadAvatar = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } }).single('avatar');
export const uploadResume = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } }).single('resume');
export const uploadMedia = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } }).single('media');