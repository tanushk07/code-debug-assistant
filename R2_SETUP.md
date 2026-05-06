# Cloudflare R2 setup — for production-ready screenshots

The app uses local-disk storage by default (under `Backend/uploads/`).
That's fine for dev, but for hosted demos the disk is ephemeral — and
LLM providers like Claude / GPT-4o need an internet-reachable URL to
"see" the image. Cloudflare R2 gives you both, free.

**Free tier:** 10 GB storage, 1M Class A ops, 10M Class B ops per month,
**zero egress fees**. Card on file required to enable, never charged on
the free plan.

---

## 1. Sign up for Cloudflare

https://dash.cloudflare.com/sign-up — email + password, free.

## 2. Enable R2

- Sidebar → **R2 Object Storage** → click **Enable R2**
- Cloudflare asks for a card on file (free tier still applies)

## 3. Create a bucket

- **Create bucket** button
- Name: `debug-assistant-uploads` (must be unique within your account)
- Location hint: closest region (e.g. `Asia Pacific - APAC` for India)
- Storage class: **Standard**
- Click **Create bucket**

## 4. Make the bucket publicly readable

The simplest path:

- Open the bucket → **Settings** tab → **Public access** section
- Find **Public R2.dev Bucket URL** → click **Allow Access**
- Cloudflare gives you a URL like `https://pub-3a4b5c....r2.dev`
- **Copy this URL** — it's your `R2_PUBLIC_URL`

## 5. Create an API token

- Top right of the R2 page → **Manage R2 API Tokens** → **Create API Token**
- Token name: `code-debug-assistant`
- Permissions: **Object Read & Write**
- Bucket scope: **Apply to specific bucket** → pick yours
- TTL: **Forever** (or whatever your security policy dictates)
- Click **Create API Token**
- The next page shows three values **once** — copy them now:

  | Cloudflare label                | Goes into `.env` as       |
  |---------------------------------|---------------------------|
  | Access Key ID                   | `R2_ACCESS_KEY_ID`        |
  | Secret Access Key               | `R2_SECRET_ACCESS_KEY`    |
  | (S3 endpoint URL — host part)   | use to derive `R2_ACCOUNT_ID` |

  The S3 endpoint looks like `https://<account_id>.r2.cloudflarestorage.com`.
  The hex string before `.r2.cloudflarestorage.com` is your **Account ID**.
  You can also find Account ID in the right sidebar on any R2 dashboard page.

## 6. Paste into `Backend/.env`

```
R2_ACCOUNT_ID=<32-char hex from the endpoint URL or sidebar>
R2_ACCESS_KEY_ID=<from step 5>
R2_SECRET_ACCESS_KEY=<from step 5>
R2_BUCKET=debug-assistant-uploads
R2_PUBLIC_URL=https://pub-3a4b5c....r2.dev
```

## 7. Restart the backend

The dev server's `node --watch` will pick the change up automatically.
On the next boot you'll see:

```
API listening on http://localhost:3001  (storage: r2)
```

If you still see `(storage: local)`, one of the five `R2_*` env vars is
missing or empty — the storage router falls back to local disk if any
single one is unset.

## 8. Test it

Upload a screenshot in the UI → check the URL in the thumbnail's
DevTools `<img src=...>`:

- **Working:** `https://pub-3a4b5c....r2.dev/u<id>/<timestamp>-<rand>.png`
- **Fallback active:** `http://localhost:3001/uploads/...`

That's it. Once R2 is live, Claude and GPT-4o vision will work too —
they'll fetch the image straight from `pub-….r2.dev`.

---

## Going to prod (Render)

When you deploy to Render, paste the same five `R2_*` env vars into the
Render web service's Environment tab. No code changes needed — the same
`storage.js` routes via env detection.

## Cost in practice

For an internship demo: probably zero. Free tier covers thousands of
screenshots before you'd hit any limit. If you ever do go over, R2 is
$0.015/GB/month for storage and **no egress fee**, which is much cheaper
than S3 if your screenshots get viewed a lot.
