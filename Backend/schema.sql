-- =====================================================================
--  Code Debug Assistant — DB schema (Postgres on Neon)
--  Run this once in Neon's SQL editor (or psql) to create tables.
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR UNIQUE NOT NULL,
  name          VARCHAR,
  password_hash VARCHAR,                  -- NULL for OAuth-only users
  google_id     VARCHAR UNIQUE,            -- NULL for email/password-only users
  avatar_url    VARCHAR,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- One row per debug session = persistent context the AI re-reads every turn.
-- `files` is JSONB because we always read it together with the session row;
-- never independently. Keeping it nested avoids joins.
CREATE TABLE IF NOT EXISTS debug_sessions (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR DEFAULT 'Untitled session',
  files       JSONB   DEFAULT '[]',       -- [{ name, language, content }]
  error_log   TEXT,
  image_path  VARCHAR,                     -- LEGACY: single image URL, kept for compat
  images      JSONB   DEFAULT '[]',        -- [{ url }] — supports multiple screenshots
  share_token VARCHAR,                     -- NULL until owner enables read-only public share
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON debug_sessions(user_id);

-- Idempotent migration for databases created before share_token existed.
ALTER TABLE debug_sessions ADD COLUMN IF NOT EXISTS share_token VARCHAR;

-- Partial unique index: many NULLs allowed, unique on actual tokens.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_share_token
  ON debug_sessions(share_token) WHERE share_token IS NOT NULL;

-- One row per chat message. Assistant messages also store the
-- classifier's structured output (Agent 1) as JSONB.
CREATE TABLE IF NOT EXISTS session_messages (
  id              SERIAL PRIMARY KEY,
  session_id      INT REFERENCES debug_sessions(id) ON DELETE CASCADE,
  role            VARCHAR NOT NULL,        -- 'user' | 'assistant'
  content         TEXT NOT NULL,
  model_used      VARCHAR,                 -- 'groq' | 'gemini' | 'gpt' | 'claude' | NULL
  classification  JSONB,                   -- Agent 1 output; NULL on user rows
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON session_messages(session_id);
