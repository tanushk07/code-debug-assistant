# ARCHITECTURE.md

## Three-layer split inside the backend

```
src/routes/   → handle HTTP, validate input, return JSON. NO business logic.
src/services/ → business logic, LLM calls, agent orchestration, R2 uploads.
src/db.js     → raw SQL via pg. NO business logic.
```

This is Martin Fowler's **Service Layer** pattern. Routes are thin. Services
are testable in isolation. Data access is one file.

---

## Request lifecycle: `POST /api/sessions/:id/messages`

```
┌────────┐    POST /api/sessions/:id/messages     ┌──────────────┐
│ Client │ ─────────────────────────────────────▶│ Express app  │
└────────┘                                       └──────┬───────┘
                                                        ▼
                                              [ cors → json → router ]
                                                        ▼
                                              middleware/auth.js
                                              (verifies JWT, sets req.user)
                                                        ▼
                                              routes/sessions.js
                                                        ▼
                                              routes/messages.js
                                                        │
                                                        │  loads session + history
                                                        ▼
                                              services/agents.js
                                              (runAgents)
                                                ┌───────┴───────┐
                                                ▼               ▼
                                           classify (Claude) → fix (Claude, streaming)
                                                ▲               │
                                                └── classification, tokens
                                                                ▼
                                                       SSE writes to res
                                                                │
                                              On stream end → INSERT assistant row
                                                                ▼
                                                          res.end()
```

---

## Auth flows

### Email/password
1. Client → `POST /signup` or `/login` with credentials
2. Server hashes (signup) or compares (login) via bcrypt
3. Server signs a JWT (`{ sub, email }`, exp 24h)
4. Client stores JWT in localStorage; sends `Authorization: Bearer <jwt>` on every protected request

### Google OAuth
1. Client clicks "Continue with Google" → full-page nav to `/api/auth/google`
2. Server (passport) redirects to Google consent screen
3. User approves → Google redirects to `/api/auth/google/callback?code=...`
4. Server exchanges code for profile, finds-or-creates user row
5. Server signs JWT, redirects to `<FRONTEND_URL>/auth/callback?token=...`
6. Client (AuthCallback page) plucks token from URL, stores it, navigates to `/chat`

---

## Multi-agent pipeline

```
context = priorMessages + files + errorLog + image + userMessage
                │
                ▼
   ┌──────── Agent 1: Classifier ────────┐
   │ system: "return JSON {errors:[...]}"│
   │ output: parsed JSON (saved as JSONB)│
   └─────────────────┬───────────────────┘
                     ▼  (forwarded as evidence to Agent 2)
   ┌──────── Agent 2: Fixer (streaming) ─┐
   │ system: "write fix in markdown"     │
   │ output: text deltas → SSE → client  │
   └─────────────────┬───────────────────┘
                     ▼
            INSERT session_messages
            (role='assistant', content=full text, classification=JSONB)
```

Pipeline / Pipes-and-Filters pattern — each filter has one job; the bus
between them is structured data.
