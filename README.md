# Code Debug Assistant

> Multimodal AI debugging assistant — paste broken code, error logs, and screenshots; chat for fixes.

**Live URL:** _TBD_
**GitHub:** _TBD_

---

## Quick start

```bash
# 1. Install everything (root + Backend + Frontend/client)
npm run install:all

# 2. Configure secrets — see Backend/.env (template already in repo)
#    Generate JWT secret:  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 3. Apply schema once on your Neon database
#    Open Neon SQL editor → paste Backend/schema.sql → run

# 4. Start both client (5173) and server (3001)
npm run dev
```

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full breakdown.

```
┌──────────────┐   HTTP   ┌──────────────┐   SQL    ┌──────────────┐
│  React+Vite  │─────────▶│   Express    │─────────▶│  Postgres    │
│   (Vercel)   │          │  (Render)    │          │   (Neon)     │
└──────────────┘          └──────┬───────┘          └──────────────┘
                                 │
                       ┌─────────┴─────────┐
                       ▼                   ▼
                 ┌──────────┐        ┌────────────┐
                 │  Claude  │        │ Cloudflare │
                 │   API    │        │     R2     │
                 └──────────┘        └────────────┘
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite, React Router 7, Tailwind, Monaco, react-konva |
| Backend  | Express 4 + Node 20, raw `pg`, JWT, Passport (Google) |
| AI       | `@anthropic-ai/sdk` — Claude Sonnet 4.6 (vision-capable) |
| Storage  | Cloudflare R2 (S3-compatible) |
| DB       | PostgreSQL on Neon |

---

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | email/password |
| POST | `/api/auth/login` | email/password |
| GET  | `/api/auth/google` + `/callback` | OAuth |
| GET  | `/api/me` / PATCH | profile |
| GET / POST  | `/api/sessions` | list / create |
| GET / PATCH / DELETE | `/api/sessions/:id` | session detail |
| POST | `/api/sessions/:id/messages` | streamed AI reply (SSE) |
| POST | `/api/upload` | image → R2 |

---

## Known limitations / future work

- No real-time multi-user collab (out of scope).
- Annotations on screenshots are transient (not persisted to DB).
- No conversation summarization — relies on Claude's 200k context window.
- localStorage for JWT (not HttpOnly cookies).

See [DECISIONS.md](./DECISIONS.md) for trade-off rationale.
