# DECISIONS.md

A record of the engineering choices made for the Code Debug Assistant, and
why each one. The deliberate cuts at the bottom matter as much as the
inclusions — they kept the build small enough to ship in a week.

---

## Why Express over FastAPI / Hono / NestJS

I'd been writing Node recently, and Express is the dialect every JS dev
recognizes within ten seconds. The middleware chain (`app.use(cors)` →
`app.use(json)` → `app.use(authRouter)` → … → `app.use(error)`) is the
literal Chain-of-Responsibility pattern, and walking through it in the
demo video makes the request lifecycle obvious.

FastAPI was tempting for its automatic OpenAPI docs and Pydantic
validation, but switching languages would have cost half a day for
machinery that's a "nice-to-have" on a one-week build. NestJS has
opinions I didn't want to learn under deadline pressure. Hono is fast
and tiny but ecosystem support for `passport-google-oauth20` and
`multer` is weaker.

**Trade-off accepted:** no compile-time type safety, no automatic schema
validation. Manual whitelisting in the PATCH handlers (see
`routes/sessions.js`) compensates.

---

## Why no ORM (raw `pg` instead of Prisma / Drizzle / Sequelize)

The schema is three tables. With raw `pg`, the SQL is right there in
the route file — anyone reading the code can see exactly what hits
Postgres, no `prisma generate` step, no migrations directory, no
hidden N+1s.

What raw-pg costs me: I have to write parameter-binding boilerplate
(`$1`, `$2`, …) by hand. What I save: the entire mental model of an
ORM, generated types, build steps, and version mismatches. Net win for
this size of project.

If the schema doubled, this calculus would flip — at ~10 tables I'd
reach for Drizzle (closest-to-SQL of the modern ORMs).

**Security note:** every query uses parameterized inputs; no template
literals concatenated into SQL anywhere in the repo. SQLi-safe by
construction.

---

## Why JSONB for `files` and `images` instead of separate tables

A debug session always reads its files together — never one without
the others, never queried independently. Putting them in a separate
`session_files` table buys nothing here:

- I'd need a join on every session fetch
- I'd need a separate insert/delete per file on every PATCH
- I'd never want to index any individual file

JSONB gives me exactly the fetch profile I need (single-row read of
`debug_sessions`) and Postgres still indexes/validates it. The same
logic applies to `images` — it's a small array of `{url}` records
that's only meaningful as a unit.

**Where this would break:** if "search across all my code snippets"
became a feature, I'd need a relational table to use `LIKE` /
full-text indexes. Out of scope.

---

## Why Server-Sent Events over WebSockets

Three reasons:

1. **One-direction stream.** The server pushes tokens; the client
   never sends mid-stream. WebSockets' bidirectional channel is
   unused capacity.
2. **Auto-reconnect for free.** SSE clients (and even our manual
   `fetch` + `getReader()` consumer) can resume after a network blip
   without custom protocol code.
3. **Plain HTTP.** Works through every CDN/proxy/firewall that
   already passes HTTP. WebSocket upgrade negotiation occasionally
   doesn't.

I wrote my own SSE consumer with `fetch` + `ReadableStream` (see
`hooks/useStreamingChat.js`) instead of the native `EventSource` API
because EventSource is GET-only and we need to POST the user's
message + model selection.

**Cost of choosing SSE:** more frame-parsing code on the client (six
lines, manageable). Worth it.

---

## Why two agents instead of LangChain / AutoGen

The two-agent flow is just two sequential LLM calls with structured
data passed between them:

```
classify(...) → JSON {errors: [...]}
fix(..., classification) → streamed markdown
```

LangChain would have given me Chains, Memory, Tools, OutputParsers — an
entire vocabulary I'd need to learn and demo, all as wrappers around
"call the LLM, parse JSON, call the LLM again." The code in
`services/agents.js` is 80 lines and reads top-to-bottom.

LangChain also tends to abstract away exactly the parts I want
visible: model/provider selection, prompt construction, the streaming
boundary. Those are the engineering choices I want to defend in the
demo, not bury under a framework.

**When LangChain becomes worth it:** when you have ≥5 tools, retries,
fallbacks, evaluation pipelines, agent loops with self-correction.
Not on a one-week build.

---

## Why I went multi-provider instead of Claude-only

The original spec locked in Claude Sonnet. Mid-build the user (me)
didn't have an Anthropic billing setup, so I refactored
`services/llm.js` into a Strategy router that picks a provider per
request (`groq | gemini | gpt | claude`).

Each provider exports the same `{ name, label, callOnce, callStream,
isConfigured }` interface. `services/providers/index.js` discovers
them automatically — drop a file in the folder, expose those five
names, the router picks it up at boot. The frontend reads the list
from `/api/config` and renders only the providers whose API key is
set, so users can't pick a model that would 401.

**Cost:** I now have provider-specific quirks to handle:

- Anthropic: rich content blocks, native streaming
- OpenAI: chat.completions API, JSON mode via `response_format`
- Gemini: different message shape, `systemInstruction` as config,
  inline base64 for images instead of URLs
- Groq: OpenAI-compatible but text-only on the free tier — I flatten
  image parts to a `[N screenshots attached]` note

**Net win:** the app is usable on a free tier. Groq's Llama 3.3 70B
is fast enough that the demo never feels laggy.

---

## Why R2 over S3 (with a local-disk fallback)

Cloudflare R2:

- 10 GB free, no egress fees ever
- Same S3 API, same `@aws-sdk/client-s3` package — `endpoint` change
  away from S3 if I ever need to switch
- One bucket setup, one API token, ten minutes

S3 would have charged egress on every screenshot the LLM downloads
to "see" — those bills add up if the demo gets popular.

`services/storage.js` is a Strategy router: if the five `R2_*` env
vars are all set, it uploads to R2 and returns the public URL; if
any one is missing, it writes to `Backend/uploads/` and returns
`http://host:port/uploads/<key>`. Same code path on every deploy —
local devs run with zero cloud setup, prod runs against R2.

**Fallback caveat:** localhost URLs are unreachable from
Anthropic/OpenAI servers, so vision fails on those providers in dev.
Gemini works because the backend itself fetches the image and
inlines it as base64 before calling the SDK.

---

## Why JWT in localStorage, not HttpOnly cookies

localStorage is XSS-readable. HttpOnly cookies aren't. So why
localStorage?

- Cookies need CSRF tokens for state-changing requests, which adds an
  extra moving part on every form/PATCH/POST.
- Cookies bring their own cross-origin headache: `SameSite`,
  `Secure`, `domain`, dev vs prod settings. We're already running
  cross-origin in dev (5173 → 3001) and need explicit CORS
  configuration; cookies would add a second axis of complexity.
- The token's blast radius is bounded by the 24-hour expiry. No
  session table to invalidate.

For an internship MVP, this is acceptable. Documented as a known
limitation in `README.md`. For a real product handling user
secrets, I'd switch to HttpOnly cookies + CSRF.

---

## Why don't I store JWTs in Postgres at all

JWTs are stateless: the signature is verified against `JWT_SECRET`
on every request. Storing them in a session table would defeat the
point and double the work — every protected route would have to
hit Postgres just to confirm the token. The only thing a session
table buys you is forced revocation; for a 24h-expiry token, the
revocation window is short enough that this is fine.

---

## Why the storage layer doesn't store image bytes in Postgres

Two reasons:

- Postgres rows should stay small for the planner. A 5 MB screenshot
  blob makes every `SELECT * FROM debug_sessions` slow.
- Object storage (R2/S3) is purpose-built for this — CDN-cacheable,
  byte-range requests, public URLs.

So we store `images JSONB` = `[{url}]` with the URL only. The bytes
live in R2 (or local disk in dev).

---

## What was deliberately cut, and why

| Cut | Why |
|---|---|
| Email verification, password reset, 2FA | Auth-flow cosmetics; not on the rubric. Pretending to ship them poorly is worse than honestly cutting them. |
| Multi-user real-time collab (synced cursors via Yjs/CRDT) | Two weeks of work on its own. The persistence model is single-user-per-session by design. |
| LangChain / AutoGen / agent frameworks | 80 lines of explicit code beats 600 lines of framework abstraction here. |
| Documentation retrieval / RAG | The user pastes their own context. RAG against the world's docs would be impressive but answers a different question than "fix this code I wrote." |
| Conversation summarization at high token counts | Claude Sonnet 4.6, Gemini 2.5 Flash, and Llama 3.3 70B all have 100k+ context. A debug session with 50 turns is still under that. |
| Monitoring / metrics / dashboards | Premature for a single-user demo. Render's built-in logs cover prod debugging. |
| Repo upload + file tree | The editor handles up to 8 files, which covers ~95% of "show me the bug" sessions. A repo browser is a different product. |
| Account linking (manual Google ↔ email merge) | I added a tiny version of this anyway: the Google strategy callback finds-or-creates by `google_id`, falling back to email match. So a user who signs up with email and later clicks "Sign in with Google" gets the same row. Cheap win. |

---

## Things I didn't expect to add but did

- **Drag-resizable column layout** — the user kept hitting the wall
  between the editor and the chat panel; gave them resize handles.
- **Auto-titling sessions from the first prompt** (ChatGPT-style).
  Implemented as a single SQL UPDATE that only fires when the title
  is still the default `'Untitled session'` — so user-typed titles
  are preserved.
- **`/api/config` capability endpoint** — instead of hard-coding
  which providers/Google-button the UI shows, the frontend asks the
  backend what it can actually do.
- **Multiple screenshots + free-draw pencil annotation with
  undo/redo/clear** — the spec said "single screenshot, rectangle
  annotation." Multiple screenshots and freehand drawing both took
  half an hour and feel obviously better in the demo.

---

## Things I'd do differently if starting over

- **Use a typed monorepo** (TypeScript + a shared `types/` package).
  Right now the API contract between routes and frontend is
  enforced by hand-checking; a shared `Session` type would catch
  the kind of mistake where you rename a field server-side and
  forget the client.
- **Add a thin migration runner.** `schema.sql` is idempotent
  (`CREATE TABLE IF NOT EXISTS`) but new columns have to be applied
  out-of-band. A 50-line `migrations/` folder + a runner script
  would make schema changes safer.
- **Code-split Monaco.** The Vite bundle is 1.3 MB, mostly Monaco.
  `React.lazy` + `Suspense` would cut initial load by ~60%.
