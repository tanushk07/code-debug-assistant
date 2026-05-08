const crypto = require('node:crypto');
const router = require('express').Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { query } = require('../db');
const { signToken } = require('../utils/jwt');
const { sendVerificationCode } = require('../services/mailer');

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

// ── Step 1: Send a 6-digit verification code ──────────────────────────
router.post('/send-code', async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, name required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'invalid email format' });
    }

    // Already registered?
    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows[0]) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password now so we never store plaintext, even temporarily.
    const password_hash = await bcrypt.hash(password, 10);

    // Generate a 6-digit code.
    const code = crypto.randomInt(100_000, 999_999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove any stale pending verification for this email.
    await query('DELETE FROM pending_verifications WHERE email = $1', [email]);

    await query(
      `INSERT INTO pending_verifications (email, code, name, password_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, code, name, password_hash, expiresAt],
    );

    await sendVerificationCode(email, code);

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    next(err);
  }
});

// ── Step 2: Verify code and create the account ────────────────────────
router.post('/signup', async (req, res, next) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: 'email and code required' });
    }

    // Look up a valid, non-expired pending verification.
    const { rows: pvRows } = await query(
      `SELECT * FROM pending_verifications
        WHERE email = $1 AND code = $2 AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1`,
      [email, code],
    );
    const pv = pvRows[0];
    if (!pv) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Create the user from the stored payload.
    const { rows } = await query(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3) RETURNING *`,
      [pv.email, pv.name, pv.password_hash],
    );
    const user = rows[0];

    // Clean up all pending rows for this email.
    await query('DELETE FROM pending_verifications WHERE email = $1', [email]);

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
