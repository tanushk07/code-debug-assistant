// Same-origin image proxy.
//
// pub-*.r2.dev doesn't send Access-Control-Allow-Origin, so loading those
// images with crossOrigin='anonymous' fails — and loading them WITHOUT
// crossOrigin taints the canvas, which then can't be exported via
// toDataURL(). The annotation overlay routes image loads through here so
// the bytes arrive same-origin and the canvas stays exportable.
//
// SSRF guard: only URLs whose prefix matches R2_PUBLIC_URL or this server's
// own /uploads/ path are accepted.

const router = require('express').Router();

function isAllowed(url, req) {
  const r2 = process.env.R2_PUBLIC_URL;
  if (r2 && url.startsWith(r2.replace(/\/$/, '') + '/')) return true;

  const host = req.get('host');
  if (host) {
    if (url.startsWith(`http://${host}/uploads/`)) return true;
    if (url.startsWith(`https://${host}/uploads/`)) return true;
  }
  return false;
}

router.get('/', async (req, res, next) => {
  try {
    const target = req.query.url;
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ error: 'Missing url parameter' });
    }
    if (!isAllowed(target, req)) {
      return res.status(400).json({ error: 'URL not allowed' });
    }

    const upstream = await fetch(target);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
    }

    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'application/octet-stream',
    );
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
