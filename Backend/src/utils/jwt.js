// Centralised JWT signing — secret + expiry live in one place so rotation
// is a single edit.

const jwt = require('jsonwebtoken');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' },
  );
}

module.exports = { signToken };
