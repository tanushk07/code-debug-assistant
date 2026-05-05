require('dotenv').config();

const express = require('express');
const cors = require('cors');
const passport = require('passport');

const authRouter = require('./routes/auth');
const meRouter = require('./routes/me');
const sessionsRouter = require('./routes/sessions');
const uploadRouter = require('./routes/upload');
const configRouter = require('./routes/config');
const errorMiddleware = require('./middleware/error');

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

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/config', configRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
