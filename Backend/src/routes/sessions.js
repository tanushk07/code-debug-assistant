const crypto = require('node:crypto');
const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { query } = require('../db');
const messagesRouter = require('./messages');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, title, updated_at
       FROM debug_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    // 1. Re-use an empty session if one already exists for this user.
    // "Empty" = default title, no code files, no error logs, no images, and no messages.
    const emptyCheck = await query(
      `SELECT s.id
       FROM debug_sessions s
       LEFT JOIN session_messages m ON s.id = m.session_id
       WHERE s.user_id = $1
         AND s.title = 'Untitled session'
         AND (s.files = '[]'::jsonb OR s.files IS NULL)
         AND (s.error_log IS NULL OR s.error_log = '')
         AND (s.images = '[]'::jsonb OR s.images IS NULL)
         AND (s.image_path IS NULL OR s.image_path = '')
       GROUP BY s.id
       HAVING COUNT(m.id) = 0
       ORDER BY s.updated_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (emptyCheck.rows.length > 0) {
      return res.status(200).json({ id: emptyCheck.rows[0].id });
    }

    // 2. Otherwise create a new one
    const { rows } = await query(
      `INSERT INTO debug_sessions (user_id) VALUES ($1) RETURNING id`,
      [req.user.id],
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows: srows } = await query(
      'SELECT * FROM debug_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );
    if (!srows[0]) return res.status(404).json({ error: 'Not found' });

    const { rows: mrows } = await query(
      'SELECT * FROM session_messages WHERE session_id = $1 ORDER BY created_at',
      [req.params.id],
    );
    res.json({ session: srows[0], messages: mrows });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['title', 'error_log', 'image_path', 'files', 'images'];
    const jsonbCols = new Set(['files', 'images']);
    const sets = [];
    const values = [];
    let i = 1;
    for (const k of allowed) {
      if (k in req.body) {
        sets.push(`${k} = $${i++}`);
        // pg accepts a JS object for JSONB, but stringify keeps it explicit.
        values.push(jsonbCols.has(k) ? JSON.stringify(req.body[k]) : req.body[k]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    sets.push(`updated_at = NOW()`);
    values.push(req.params.id, req.user.id);
    const result = await query(
      `UPDATE debug_sessions SET ${sets.join(', ')}
       WHERE id = $${i++} AND user_id = $${i}
       RETURNING *`,
      values,
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM debug_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---- Read-only share toggle (owner-side) ----

// GET /:id/share — returns { token: string|null }
router.get('/:id/share', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT share_token FROM debug_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ token: rows[0].share_token });
  } catch (err) {
    next(err);
  }
});

// POST /:id/share — enables sharing if not already; returns { token }
router.post('/:id/share', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT share_token FROM debug_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    let token = rows[0].share_token;
    if (!token) {
      token = crypto.randomBytes(16).toString('hex'); // 128 bits, unguessable
      await query(
        'UPDATE debug_sessions SET share_token = $1 WHERE id = $2',
        [token, req.params.id],
      );
    }
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id/share — revokes the share link
router.delete('/:id/share', async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE debug_sessions SET share_token = NULL WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.use('/:id/messages', messagesRouter);

module.exports = router;
