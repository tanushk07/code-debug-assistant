const router = require('express').Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { query } = require('../db');
const { signToken } = require('../utils/jwt');

// Google strategy is configured at module load. Passport uses session=false
// everywhere — we exchange Google's profile for our own JWT immediately.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;
          const avatar = profile.photos?.[0]?.value;

          // Already linked?
          let { rows } = await query(
            'SELECT * FROM users WHERE google_id = $1',
            [googleId],
          );
          let user = rows[0];

          // Otherwise: link to email match, or create.
          if (!user) {
            const emailHit = await query(
              'SELECT * FROM users WHERE email = $1',
              [email],
            );
            if (emailHit.rows[0]) {
              const updated = await query(
                `UPDATE users
                   SET google_id = $1,
                       avatar_url = COALESCE(avatar_url, $2),
                       name = COALESCE(name, $3)
                 WHERE id = $4
                 RETURNING *`,
                [googleId, avatar, name, emailHit.rows[0].id],
              );
              user = updated.rows[0];
            } else {
              const created = await query(
                `INSERT INTO users (email, name, google_id, avatar_url)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [email, name, googleId, avatar],
              );
              user = created.rows[0];
            }
          }
          done(null, user);
        } catch (err) {
          done(err);
        }
      },
    ),
  );
}

const stripHash = ({ password_hash, ...rest }) => rest;

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, name required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows[0]) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3) RETURNING *`,
      [email, name, password_hash],
    );
    const user = rows[0];
    const token = signToken(user);
    res.json({ token, user: stripHash(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    // Same response for both branches — don't leak which one failed.
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: stripHash(user) });
  } catch (err) {
    next(err);
  }
});

// Block these routes cleanly when Google OAuth isn't configured, instead of
// letting passport throw an opaque "Unknown authentication strategy" error.
function requireGoogleConfigured(req, res, next) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res
      .status(503)
      .json({ error: 'Google OAuth is not configured on this server.' });
  }
  next();
}

router.get(
  '/google',
  requireGoogleConfigured,
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

router.get(
  '/google/callback',
  requireGoogleConfigured,
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth`,
  }),
  (req, res) => {
    const token = signToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  },
);

module.exports = router;
