# Deployment Guide

Two paths: **local Docker** (for testing) and **Render** (for the live URL the rubric asks for).

---

## A. Local Docker — verify the production build before deploying

Prereqs: Docker + Docker Compose installed.

```bash
# 1. Make sure Backend/.env is filled (copy from Backend/.env.example).
# 2. Build + run both containers
docker compose up --build

# 3. Open
#    http://localhost:8080      ← the app (frontend nginx)
#    nginx proxies /api/* → backend container automatically (no CORS)
```

Stop with `Ctrl+C`, then `docker compose down` to clean up.

To rebuild from scratch (after dependency changes):
```bash
docker compose build --no-cache && docker compose up
```

---

## B. Render — production hosting

Render's free tier is enough for a demo. Three pieces:

| Piece | Render type | Free tier note |
|---|---|---|
| Backend (Docker) | **Web Service** | 750 hrs/mo, sleeps after 15 min idle |
| Frontend (Vite build) | **Static Site** | Unlimited, served via CDN |
| Database | Already on Neon — keep using it |

You don't need Cloudflare R2 to deploy (image upload just won't work without it). But if you set it up, the rest works.

### Step 1 — Push your latest code to GitHub
The repo is already at https://github.com/tanushk07/code-debug-assistant. Render watches a branch and auto-deploys on push.

### Step 2 — Deploy the backend (Docker Web Service)

1. Go to https://dashboard.render.com → **New +** → **Web Service**
2. Connect your GitHub account, pick `tanushk07/code-debug-assistant`
3. Settings:
   - **Name:** `cda-backend` (or whatever — this becomes part of the URL)
   - **Region:** choose closest to you (Singapore for ap-south users)
   - **Branch:** `main`
   - **Root Directory:** `Backend`
   - **Runtime:** **Docker** (auto-detected from `Backend/Dockerfile`)
   - **Instance Type:** Free
4. **Environment variables** — click "Advanced" → "Add Environment Variable" and add each:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Neon pooled connection string |
   | `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` output |
   | `GROQ_API_KEY` | your Groq key |
   | `GEMINI_API_KEY` | your Gemini key (optional) |
   | `OPENAI_API_KEY` | your OpenAI key (optional) |
   | `ANTHROPIC_API_KEY` | your Claude key (optional) |
   | `DEFAULT_LLM` | `groq` |
   | `FRONTEND_URL` | `https://cda-frontend.onrender.com` *(fill after Step 3)* |
   | `GOOGLE_CLIENT_ID` | (optional, for Google OAuth) |
   | `GOOGLE_CLIENT_SECRET` | (optional) |
   | `GOOGLE_CALLBACK_URL` | `https://cda-backend.onrender.com/api/auth/google/callback` |
   | `R2_ACCOUNT_ID` etc. | (optional, for screenshot upload) |
   | `PORT` | `3001` (Render injects this; keep for clarity) |

5. **Health check path:** `/api/health` (Render uses this to know when the container is ready)
6. Click **Create Web Service**. First build takes ~5 minutes.
7. Once green, copy the URL — something like `https://cda-backend.onrender.com`.

### Step 3 — Apply the schema to Neon (one-time)

Open Neon's SQL editor and run the contents of `Backend/schema.sql`. Same as local — tables `users`, `debug_sessions`, `session_messages` get created.

### Step 4 — Deploy the frontend (Static Site)

1. Render dashboard → **New +** → **Static Site**
2. Same repo
3. Settings:
   - **Name:** `cda-frontend`
   - **Branch:** `main`
   - **Root Directory:** `Frontend/client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. **Environment variables:**

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://cda-backend.onrender.com` *(your backend URL from Step 2)* |

5. Click **Create Static Site**. Build takes ~2 minutes.
6. URL will be `https://cda-frontend.onrender.com`.

### Step 4b — Configure SPA Routing (Crucial for React!)

Because this is a Single Page Application, direct links to pages (like `/login` or `/auth/callback`) will return a 404 Not Found error unless you tell Render to send those requests to `index.html`.

1. Go to the **Redirects/Rewrites** tab in your Render frontend service.
2. Add a new rule:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** `Rewrite`
3. Click **Save Changes**.

### Step 5 — Wire the two together

1. Go back to the **backend** service → **Environment** → set `FRONTEND_URL` to your frontend's URL (e.g. `https://cda-frontend.onrender.com`). This unlocks CORS.
2. Click **Save, rebuild and deploy**.

### Step 6 — (Optional) Google OAuth

If you want Google sign-in to work in production:

1. https://console.cloud.google.com → your OAuth consent screen
2. Credentials → your OAuth 2.0 Client → **Authorized redirect URIs**, add:
   - `https://cda-backend.onrender.com/api/auth/google/callback`
3. The backend's `GOOGLE_CALLBACK_URL` env var must match this exactly.

### Step 7 — (Optional) Keep the free dyno warm

Free Render Web Services sleep after 15 min idle; first request after sleep takes ~30s. Set up a free uptime ping every 10 minutes:

- https://uptimerobot.com → Add Monitor → HTTP(s) → URL = `https://cda-backend.onrender.com/api/health` → 5 min interval.

---

## Common deploy issues

| Symptom | Likely cause |
|---|---|
| 502 / "service unavailable" | First boot — wait 60s. After that, check logs in Render dashboard. |
| `relation "users" does not exist` | Skipped Step 3. Run `schema.sql` against Neon. |
| Login works locally, fails in prod | `FRONTEND_URL` on backend doesn't match the actual frontend URL → CORS blocks login. |
| Streaming chat freezes mid-response | Render sometimes buffers; backend already sets `X-Accel-Buffering: no`. If still happens, the issue is the LLM provider — try a different model. |
| Image upload returns 500 | R2 keys not set, or bucket doesn't have public access enabled. |
| Google OAuth redirect_uri_mismatch | Step 6 — the redirect URI in Google Cloud must match the backend's `GOOGLE_CALLBACK_URL` byte-for-byte. |

---

## Updating after first deploy

`git push` to `main` and Render auto-deploys both services. No manual step.
