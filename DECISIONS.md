# DECISIONS.md

A record of the key choices made during this build, and why.

---

## Why Express, not FastAPI / Hono / Fastify
_(Fill in: familiarity, ecosystem fit, deadline pressure.)_

## Why no ORM (raw `pg`)
_(Fill in: schema is small, want SQL transparency, avoid Prisma generation step.)_

## Why JSONB for files instead of a separate `files` table
_(Fill in: always read together with the session row → no joins, fewer round-trips.
Trade-off: can't index individual files, but we never query into them.)_

## Why two agents instead of one Claude call
_(Fill in: structured intermediate (classification JSONB), separation of concerns,
auditability for the demo video.)_

## Why SSE, not WebSockets
_(Fill in: one-direction stream, native reconnect, no upgrade handshake,
simpler proxying. WebSockets would be overkill.)_

## Why Cloudflare R2 over S3
_(Fill in: free tier with zero egress, S3-compatible API.)_

## Why JWTs in localStorage instead of HttpOnly cookies
_(Fill in: fewer moving parts (no CSRF token), acceptable for an MVP.
Documented as a known limitation.)_

## What was deliberately cut and why
- Email verification, password reset, 2FA → not on rubric
- Realtime collab (CRDT/Yjs) → time
- LangChain/AutoGen → unnecessary indirection for two LLM calls
- RAG → context fits in 200k tokens
- Conversation summarization → same reason as above
- Repo upload / file tree UI → time
