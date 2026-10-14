// src/middleware/imageUpload.js
//
// Multipart parsing for admin photo uploads. Mount this AFTER
// authenticate + requireRole('admin') so unauthenticated callers can never
// make the server buffer an upload. Files are held in memory (never
// written to disk — Render's disk is ephemeral and a temp file is one more
// thing to clean up/secure) and capped well below the JSON body limit.
//
// This layer only enforces size/shape. The browser-declared mimetype is a
// cheap early reject, NOT a security check — the real validation is the
// decode in utils/imageProcessing.js.

import multer from 'multer';
import {
  MAX_UPLOAD_BYTES,
  ALLOWED_INPUT_MIME_TYPES,
  ImageValidationError,
} from '../utils/imageProcessing.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 0, // the photo is the only thing in the form
    parts: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_INPUT_MIME_TYPES.has(file.mimetype)) {
      return cb(new ImageValidationError('Unsupported image type. Please upload a JPG, PNG or WebP photo.'));
    }
    cb(null, true);
  },
});

const singleImage = upload.single('image');

export function uploadSingleImage(req, res, next) {
  singleImage(req, res, (err) => {
    if (!err) return next();

    if (err instanceof ImageValidationError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'That photo is too large. Please use one under 5 MB.' });
      }
      return res.status(400).json({ success: false, message: 'Invalid upload. Please send a single photo.' });
    }
    // Malformed multipart bodies etc. — never leak parser internals.
    console.error('Image upload parse error:', err);
    return res.status(400).json({ success: false, message: 'Invalid upload. Please try again.' });
  });
}
