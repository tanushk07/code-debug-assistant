// GET /api/providers — public, unauthenticated.
//
// Returns the list of LLM providers whose API key is currently set in
// Backend/.env, e.g.:
//   [{ "id": "groq", "label": "GROQ" }, { "id": "gemini", "label": "GEMINI" }]
//
// The frontend uses this to populate the model dropdown so users only see
// providers they can actually use.
//
// We deliberately do NOT require auth here — the response only reveals which
// vendors the operator has plugged in, not any secret.

const router = require('express').Router();
const { listConfigured } = require('../services/llm');

router.get('/', (req, res) => {
  res.json(listConfigured());
});

module.exports = router;
