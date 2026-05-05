// Provider router. Picks a provider based on the requested model_id, with a
// graceful fallback to whatever IS configured if the requested one isn't.
//
// Pattern: Strategy (the providers) + Factory (the registry that builds them).

const { byName, configured } = require('./providers');

function pick(modelId) {
  const requested = byName(modelId);
  if (requested && requested.isConfigured()) return requested;

  const envDefault = byName(process.env.DEFAULT_LLM);
  if (envDefault && envDefault.isConfigured()) return envDefault;

  const first = configured()[0];
  if (first) return first;

  const err = new Error(
    'No LLM provider configured. Set GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in Backend/.env',
  );
  err.status = 500;
  throw err;
}

async function callOnce({ system, messages, model, signal, expectJson }) {
  return pick(model).callOnce({ system, messages, signal, expectJson });
}

async function* callStream({ system, messages, model, signal }) {
  yield* pick(model).callStream({ system, messages, signal });
}

/** Used by /api/providers — returns [{ id, label }] for everything with a key. */
function listConfigured() {
  return configured().map((p) => ({ id: p.name, label: p.label }));
}

module.exports = { callOnce, callStream, listConfigured };
