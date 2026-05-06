const router = require('express').Router();
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const { uploadImage } = require('../services/storage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

router.post('/', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const url = await uploadImage(req.file.buffer, req.file.mimetype, req.user.id, req);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
