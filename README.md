# Code Debug Assistant

> Multimodal AI debugging assistant — paste broken code, error logs, and
> screenshots; chat with an LLM that always sees the full context.

**GitHub:** https://github.com/tanushk07/code-debug-assistant
**Live app:** https://code-debug-assistant-1.onrender.com/

Built for the [Nebula9.ai](https://nebula9.ai) full-stack internship.

---

## Quick start

```bash
# 1. Install everything (root + Backend + Frontend/client)
npm run install:all

# 2. Copy Backend/.env.example → Backend/.env and fill in:
#    - DATABASE_URL  (Neon Postgres connection string)
#    - JWT_SECRET    (node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
#    - ONE of:  GROQ_API_KEY (free, recommended)
#               GEMINI_API_KEY (free)
#               OPENAI_API_KEY (paid)
#               ANTHROPIC_API_KEY (paid)

# 3. Apply schema to Neon (idempotent — safe to re-run after pulling updates)
#    Open Neon SQL editor → paste Backend/schema.sql → run
#    (CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS)

# 4. Start both servers
npm run dev
#    frontend  →  http://localhost:5173
#    backend   →  http://localhost:3001
```

Want to test it without typing any code? See
[`examples/buggy-react-app/`](./examples/buggy-react-app) — 7 deliberate
bugs across 3 files, ready to paste into the editor with a matching
error log and a screenshot you can use.

---

## Architecture

```
┌──────────────┐   HTTP   ┌──────────────┐   SQL    ┌──────────────┐
│  React+Vite  │─────────▶│   Express    │─────────▶│  Postgres    │
│   (Render)   │          │  (Render)    │          │   (Neon)     │
└──────────────┘          └──────┬───────┘          └──────────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  ▼              ▼              ▼
            ┌──────────┐   ┌──────────┐   ┌────────────┐
            │   LLM    │   │   LLM    │   │ Cloudflare │
            │ provider │   │ provider │   │     R2     │
            │  (Groq,  │   │  (any of │   │  (or local │
            │  Claude, │   │  4 via   │   │   disk in  │
            │  Gemini, │   │ factory) │   │    dev)    │
            │   GPT)   │   │          │   │            │
            └──────────┘   └──────────┘   └────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full breakdown.
See [DECISIONS.md](./DECISIONS.md) for why each choice.

### Two-agent pipeline

```
   user message + code + error_log + screenshots + history
                              │
                ┌─────────────┴──────────────┐
                ▼                            ▼
          Agent 1: classify              persist user msg
          → JSON {errors:[…]}                 │
                │                             ▼
                ▼                       send 'classification'
          Agent 2: fix                   over SSE
          → streamed markdown                 │
                │                             ▼
                └─────────► tokens stream over SSE
                              │
                              ▼
              persist assistant msg + classification JSONB
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite, React Router 7, Tailwind, Monaco editor, react-konva |
| Backend  | Express 4 + Node 20, raw `pg` (no ORM), JWT, Passport (Google) |
| AI       | Multi-provider via factory: **Groq** (Llama 3.3 70B), Gemini, OpenAI, Claude |
| Storage  | Cloudflare R2 (S3-compatible) with local-disk fallback for dev |
| Database | PostgreSQL on Neon |
| Streaming| Server-Sent Events |

---

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | email/password registration |
| POST | `/api/auth/login` | email/password login |
| GET  | `/api/auth/google` `/google/callback` | OAuth (gated when not configured) |
| GET / PATCH | `/api/me` | current profile |
| GET / POST  | `/api/sessions` | list / create |
| GET / PATCH / DELETE | `/api/sessions/:id` | session detail |
| POST | `/api/sessions/:id/messages` | streamed AI reply (SSE) |
| POST | `/api/upload` | screenshot → R2 (or local) |
| GET  | `/api/image-proxy?url=` | same-origin proxy for R2 images (annotation canvas CORS) |
| GET / POST / DELETE | `/api/sessions/:id/share` | toggle read-only public share |
| GET  | `/api/share/:token` | public snapshot of a shared session |
| GET  | `/api/share/:token/stream` | public SSE stream of live events |
| GET  | `/api/config` | provider list + googleAuth flag |
| GET  | `/api/health` | uptime probe |

---

## Folder structure

```
repo-root/
├─ Backend/
│  ├─ src/
│  │  ├─ index.js                    Express entry
│  │  ├─ db.js                        pg Pool
│  │  ├─ routes/                      auth, me, sessions, messages, upload,
│  │  │                               config, share (public read-only)
│  │  ├─ services/
│  │  │  ├─ llm.js                    factory router for providers
│  │  │  ├─ providers/                claude, openai, gemini, groq + index (auto-discover)
│  │  │  ├─ agents.js                 classifier + fixer pipeline
│  │  │  ├─ sessionEvents.js          in-memory pub/sub for live share viewers
│  │  │  └─ storage.js                R2 + local-disk fallback
│  │  ├─ middleware/                  auth.js, error.js
│  │  └─ utils/jwt.js
│  ├─ schema.sql                      DB schema (one-shot)
│  ├─ Dockerfile                      multi-stage prod image
│  └─ uploads/                        local-disk storage (gitignored)
├─ Frontend/client/
│  ├─ src/
│  │  ├─ pages/                       Landing, Login, Signup, AuthCallback, Chat,
│  │  │                               Profile, SharePage (public read-only)
│  │  ├─ components/                  SessionSidebar, CodeEditor, ErrorLog,
│  │  │                               ImageUpload, AnnotationOverlay, ChatPanel,
│  │  │                               MessageBubble, ShareButton, ThemeToggle,
│  │  │                               DesktopGate
│  │  ├─ hooks/                       useSession, useStreamingChat
│  │  └─ lib/                         api, auth, config
│  ├─ Dockerfile + nginx.conf         prod image with SPA fallback + /api proxy
│  └─ vite.config.js
├─ docker-compose.yml                 one-command local prod build
├─ examples/buggy-react-app/          paste-in demo with 7 deliberate bugs
├─ README.md  (this file)
├─ DECISIONS.md                       why every choice
├─ ARCHITECTURE.md                    request lifecycles + auth flows
├─ DEPLOY.md                          Render walkthrough (frontend + backend)
├─ R2_SETUP.md                        Cloudflare R2 in 8 steps
└─ STUDY.md                           map of design patterns + reading roadmap
```

---

## Known limitations / future work

- **Annotations are flattened into the saved PNG** rather than stored as
  vector strokes. Means you can't un-annotate after save. Trade-off:
  the LLM gets a real image to look at.
- **JWTs in localStorage** — XSS-readable; HttpOnly cookies would be
  stronger. See [DECISIONS.md](./DECISIONS.md#why-jwt-in-localstorage-not-httponly-cookies).
- **Read-only live share, no two-way collab.** Click SHARE in the chat
  header to mint a public link; viewers see the conversation stream live
  but cannot send messages or edit code. Live events are pushed via an
  in-memory pub/sub, so this works on a single backend instance — a
  multi-instance deploy would need Redis pub/sub or similar.
- **No RAG / doc retrieval** — context fits in modern LLMs' 100k+ windows.
- **Local-disk storage** in dev means Anthropic/OpenAI vision can't
  reach images (server is on `localhost`). Gemini sidesteps this by
  fetching the URL server-side. R2 fixes it for everyone — see
  [R2_SETUP.md](./R2_SETUP.md).

Full rationale + the deliberate cuts list:
[DECISIONS.md](./DECISIONS.md).

---

## License

MIT.
