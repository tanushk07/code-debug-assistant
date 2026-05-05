/**
 * Postgres connection pool (singleton).
 *
 *  Why a Pool, not a Client?
 *    A pool keeps a small set of TCP connections open and lends them to
 *    requests. Without it every query pays a TLS handshake; under load you
 *    blow past Neon's connection cap.
 *
 *  Pattern in use:  Singleton — exactly one pool per Node process.
 *
 *  Study:
 *    - node-postgres docs > "Pool" (very short, official)
 *    - Hussein Nasser, "What is a connection pool?" (~15m)
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL. rejectUnauthorized:false is fine for the connection
  // string Neon hands you — its cert chain is implicit.
  ssl: { rejectUnauthorized: false },
});

// Surface unexpected drops instead of crashing silently.
pool.on('error', (err) => {
  console.error('Unexpected pg pool error', err);
});

/**
 * Thin helper so callers don't import the Pool directly.
 * Always pass parameters as the second arg — never string-concat user input.
 *
 *   const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
 */
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
