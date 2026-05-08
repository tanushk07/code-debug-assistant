const router = require('express').Router();
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const { uploadImage } = require('../services/storage');

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      const err = new Error('Unsupported image — PNG, JPEG, WEBP, or GIF only');
      err.status = 415;
      return cb(err);
    }
    cb(null, true);
  },
});

function uploadSingle(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      err.status = 413;
      err.message = `Image too large — 5 MB max`;
    } else if (!err.status) {
      err.status = 400;
    }
    next(err);
  });
}

router.post('/', requireAuth, uploadSingle, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file attached' });
    const url = await uploadImage(req.file.buffer, req.file.mimetype, req.user.id, req);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
