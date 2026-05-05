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
    const allowed = ['title', 'error_log', 'image_path', 'files'];
    const sets = [];
    const values = [];
    let i = 1;
    for (const k of allowed) {
      if (k in req.body) {
        sets.push(`${k} = $${i++}`);
        // pg accepts a JS object for JSONB, but stringify keeps it explicit.
        values.push(k === 'files' ? JSON.stringify(req.body[k]) : req.body[k]);
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

router.use('/:id/messages', messagesRouter);

module.exports = router;
