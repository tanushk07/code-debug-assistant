// Storage router — R2 if configured, else local disk.
//
//  Cloudflare R2 (production)       — set R2_* in .env
//  Local disk fallback (dev)        — files written under Backend/uploads/
//                                     and served by Express at /uploads/*
//
//  The local fallback returns an absolute URL (http://host:port/uploads/key)
//  so it works for <img> tags AND for the LLM providers that fetch the
//  image server-side (e.g. Gemini). For internet-reachable URLs (Claude /
//  GPT vision in prod), use R2.
//
//  Pattern: Strategy. The route never knows which backend ran.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// ---- R2 ---------------------------------------------------------------
const r2Configured = () =>
  Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_URL,
  );

let _s3;
const s3 = () =>
  (_s3 ??= new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  }));

async function uploadToR2(buffer, mime, key) {
  await s3().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mime,
    }),
  );
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

// ---- Local disk -------------------------------------------------------
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');

function uploadToLocal(buffer, mime, key, req) {
  const filepath = path.join(UPLOADS_DIR, key);
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, buffer);

  // Build an absolute URL the browser can reach.
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const host = req.get('host');
  return `${proto}://${host}/uploads/${key}`;
}

// ---- Public API -------------------------------------------------------
async function uploadImage(buffer, mime, userId, req) {
  const ext = (mime.split('/')[1] || 'png').toLowerCase();
  const key = `u${userId}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  return r2Configured() ? uploadToR2(buffer, mime, key) : uploadToLocal(buffer, mime, key, req);
}

function activeBackend() {
  return r2Configured() ? 'r2' : 'local';
}

module.exports = { uploadImage, activeBackend, UPLOADS_DIR };
