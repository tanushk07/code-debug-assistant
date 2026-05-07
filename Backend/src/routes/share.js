// Public, no-auth routes that let anyone with a share link watch a session
// in read-only mode. Mounted at /api/share in index.js.
const router = require('express').Router();
const { query } = require('../db');
const { subscribe } = require('../services/sessionEvents');

// GET /api/share/:token — initial snapshot (session metadata + all messages so far)
router.get('/:token', async (req, res, next) => {
  try {
    const { rows: srows } = await query(
      `SELECT id, title, created_at, updated_at
       FROM debug_sessions WHERE share_token = $1`,
      [req.params.token],
    );
    if (!srows[0]) {
      return res.status(404).json({ error: 'Share link not found or revoked.' });
    }
    const session = srows[0];
    const sessionId = session.id;

    const { rows: messages } = await query(
      `SELECT id, role, content, model_used, classification, created_at
       FROM session_messages WHERE session_id = $1 ORDER BY created_at`,
      [sessionId],
    );

    // Don't leak the internal numeric session id to a public viewer.
    delete session.id;
    res.json({ session, messages });
  } catch (err) {
    next(err);
  }
});

// GET /api/share/:token/stream — live SSE stream of new events for this session
router.get('/:token/stream', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id FROM debug_sessions WHERE share_token = $1',
      [req.params.token],
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Share link not found or revoked.' });
    }
    const sessionId = rows[0].id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (event, data) =>
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    // Heartbeat comment frame every 15s to defeat proxy idle timeouts.
    const heartbeat = setInterval(() => res.write(':\n\n'), 15000);

    const unsubscribe = subscribe(sessionId, ({ event, data }) => {
      send(event, data);
    });

    send('hello', { ok: true });

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
