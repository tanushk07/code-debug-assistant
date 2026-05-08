require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const passport = require('passport');

const authRouter = require('./routes/auth');
const meRouter = require('./routes/me');
const sessionsRouter = require('./routes/sessions');
const uploadRouter = require('./routes/upload');
const imageProxyRouter = require('./routes/image-proxy');
const configRouter = require('./routes/config');
const shareRouter = require('./routes/share');
const errorMiddleware = require('./middleware/error');
const { UPLOADS_DIR, activeBackend } = require('./services/storage');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(passport.initialize());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Serve uploaded screenshots when the local-disk fallback is in use.
// (Harmless when R2 is configured — the directory just stays empty.)
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (err) {
  console.warn(`⚠ Could not create ${UPLOADS_DIR}: ${err.message} (OK if using R2)`);
}
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    immutable: true,
    maxAge: '1y',
    setHeaders: (res) => res.setHeader('Access-Control-Allow-Origin', '*'),
  }),
);

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/image-proxy', imageProxyRouter);
app.use('/api/config', configRouter);
app.use('/api/share', shareRouter); // public — no auth

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}  (storage: ${activeBackend()})`);
});
