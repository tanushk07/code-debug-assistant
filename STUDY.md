# STUDY.md — Pre-flight reading + design patterns in this repo

A consolidated list of what to watch / read **before** filling in each file,
and which classical design patterns show up where. Don't watch all of these
in one sitting — read the file you're about to code, watch the matching
video, then code.

---

## 1. Foundations (watch these once, the rest builds on them)

| Topic | Suggested resource | Time |
|---|---|---|
| Express middleware mental model | "Express JS Crash Course" — Traversy Media | 30 min |
| Middleware deep dive | "What is middleware?" — Web Dev Simplified | 10 min |
| JWT in 100 seconds | Fireship | 2 min |
| JWT auth tutorial (Node) | Web Dev Simplified | 30 min |
| `pg` Pool basics | node-postgres docs > "Pool" (read, don't watch) | 10 min |
| Connection pools, generally | Hussein Nasser — "What is a connection pool?" | 15 min |

## 2. Frontend essentials

| Topic | Suggested resource |
|---|---|
| React Router v6/v7 | Cosden Solutions — "React Router v6 in 1 hour" |
| Custom hooks (the *why*) | Cosden Solutions — "Stop using useEffect for this" |
| `useRef` vs `useState` | Web Dev Simplified — "useRef explained" |
| Tailwind setup + utility-first mindset | Tailwind docs > "Utility-First Fundamentals" (5 min) |
| Monaco in React | `@monaco-editor/react` README quickstart |
| react-konva basics | Konva docs > "React quickstart" + 1 short YT video |
| react-markdown + syntax highlight | react-markdown README — `components.code` example |

## 3. The hard parts of THIS app

| Topic | Why it matters here | Resource |
|---|---|---|
| Server-Sent Events | The streaming chat hinges on this | Theo — "SSE vs WebSockets"; Hussein Nasser SSE crash course |
| Streaming via `fetch` (not EventSource) | Native EventSource is GET-only; we POST | MDN — "Using ReadableStream" |
| Anthropic streaming API | Async iterator pattern + content_block_delta | Anthropic SDK docs > "Streaming" |
| Anthropic vision input | Image content blocks for screenshots | Anthropic SDK docs > "Vision" |
| Passport Google OAuth | The strategy callback shape is non-obvious | Anson the Developer — "Google OAuth with Passport" |
| multer memory storage | Why not disk on free Render | multer README, 5 min |
| Cloudflare R2 with S3 SDK | Custom endpoint, region "auto" | Cloudflare docs > "Use the S3 API" |

## 4. Optional / extra credit

- **Where to store JWT** — Hussein Nasser. (We use localStorage; understand why that's a trade-off.)
- **OWASP Top 10** — at least skim. The relevant ones here: SQLi (we use parameterised queries), IDOR (every query scopes by `user_id`), XSS (react-markdown sanitises by default but verify), broken auth.
- **CRDT / Yjs** — only if you plan to mention realtime collab in the "future work" section of the video.

---

# Design patterns visible in this codebase

The classic GoF count is 23 patterns. Here are the ones that actually show up
here — knowing the name doesn't make the code better, but it makes it easier
to talk about during the demo / interview.

| Pattern | Where in this repo | One-line meaning |
|---|---|---|
| **Singleton** | `Backend/src/db.js` (Pool), `services/providers/*.js` (one client per vendor), `services/storage.js` (S3Client) | One shared instance per process |
| **Adapter** | `services/providers/*.js`, `services/storage.js` | Hide a vendor SDK behind a stable interface |
| **Factory / Strategy** | `services/llm.js` + `services/providers/index.js` | Auto-discover providers, route per request |
| **Facade** | `Frontend/.../lib/api.js` | One simple call (`api(path)`) hiding fetch+auth+JSON+errors |
| **Strategy** | Passport strategies (Google, plus your own local handler) | Interchangeable algorithms behind a common slot |
| **Chain of Responsibility** | Express middleware chain | Each handler decides to act or pass on |
| **Decorator** | `requireAuth` adding `req.user` | Wrap an object with extra capability |
| **Observer** | SSE consumer in `useStreamingChat.js` | Subscribers get notified when something happens |
| **Pipeline (Pipes & Filters)** | Classifier → Fixer in `services/agents.js` | Linear flow; each stage's output is the next's input |
| **Repository** (informal) | `routes/sessions.js` keeps SQL for `debug_sessions` | One table → one place that knows its shape |
| **Service Layer** (Fowler, not GoF) | The whole `routes / services / db` split | Routes thin, services own logic |
| **Higher-Order Component** | `<RequireAuth>` in `App.jsx` | A component that wraps another to add behaviour (auth gate) |
| **Controlled Component** (React idiom) | `CodeEditor`, `ErrorLog`, every form input | State lives in React, not the DOM |

### Patterns to consciously NOT use here

- **Factory Method / Abstract Factory** — overkill for two LLM clients.
- **Visitor** — tempting for traversing classifier output, but a `for…of` loop is enough.
- **Mediator / Event Bus** — React props + a couple of hooks already coordinate things. Don't add Redux.
- **Repository with full DAO layer** — overkill for ~5 tables. Keep SQL inside route files until repetition justifies extracting.

---

## A reading order if you only have a few hours

1. Express middleware crash course → bcrypt + JWT tutorial
2. node-postgres Pool docs (just the page)
3. SSE crash course (Theo or Hussein Nasser)
4. Anthropic SDK quickstart + Streaming section
5. React Router v6/v7 — only the chapters on routes + protected routes
6. `@monaco-editor/react` README
7. Cloudflare R2 "Use the S3 API" page

Everything else is on-demand: open the file, read its header comment, watch
exactly the video it cites, then code.
