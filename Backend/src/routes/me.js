const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { query } = require('../db');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, email, name, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch('/', async (req, res, next) => {
  try {
    const allowed = ['name', 'avatar_url'];
    const sets = [];
    const values = [];
    let i = 1;
    for (const k of allowed) {
      if (k in req.body) {
        sets.push(`${k} = $${i++}`);
        values.push(req.body[k]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.user.id);
    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')}
       WHERE id = $${i}
       RETURNING id, email, name, avatar_url`,
      values,
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
