/**
 * JWT sign helpers.
 *
 *  Keep secret + expiry in ONE place so rotating them is a single edit.
 */

const jwt = require('jsonwebtoken');

/**
 * Sign a token for a freshly authenticated user.
 *  - `sub` (subject) is the canonical JWT claim for the user id
 *  - 24h expiry per spec; tweak if you want shorter-lived tokens
 */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' },
  );
}

module.exports = { signToken };
