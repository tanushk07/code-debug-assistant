// GET /api/config — public, unauthenticated.
//
// Returns the runtime capability map the frontend needs to render itself
// correctly:
//
//   {
//     "providers":  [{ "id": "groq", "label": "GROQ" }, ...],
//     "googleAuth": false
//   }
//
// `providers` lists the LLMs whose API key is currently set in Backend/.env.
// `googleAuth` tells the login/signup pages whether to render the Google button.
//
// Nothing here is secret — we only expose vendor names and capability bits.

const router = require('express').Router();
const { listConfigured } = require('../services/llm');

router.get('/', (req, res) => {
  res.json({
    providers: listConfigured(),
    googleAuth: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
  });
});

module.exports = router;
