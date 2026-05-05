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
  image_path  VARCHAR,                     -- R2 public URL (NEVER store bytes here)
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON debug_sessions(user_id);

-- One row per chat message. Assistant messages also store the
-- classifier's structured output (Agent 1) as JSONB.
CREATE TABLE IF NOT EXISTS session_messages (
  id              SERIAL PRIMARY KEY,
  session_id      INT REFERENCES debug_sessions(id) ON DELETE CASCADE,
  role            VARCHAR NOT NULL,        -- 'user' | 'assistant'
  content         TEXT NOT NULL,
  model_used      VARCHAR,                 -- 'claude' | 'gpt' | NULL
  classification  JSONB,                   -- Agent 1 output; NULL on user rows
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON session_messages(session_id);
