// Groq — free, fast, OpenAI-compatible. Uses the openai SDK pointed at Groq's
// endpoint. Default model is text-only Llama 3.3 70B; if the user uploads a
// screenshot, we flatten the image into a text placeholder note so the request
// still works (Groq's free models are mostly text-only).
const OpenAI = require('openai');

let _client;
const client = () =>
  (_client ??= new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  }));

const isConfigured = () => !!process.env.GROQ_API_KEY;
const MODEL = () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function toMessages(system, messages) {
  const out = [];
  if (system) out.push({ role: 'system', content: system });
  for (const m of messages) {
    const text = m.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('\n');
    const imgNote = m.parts.some((p) => p.type === 'image')
      ? '\n[user attached a screenshot — this model is text-only and cannot view it]'
      : '';
    out.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: text + imgNote,
    });
  }
  return out;
}

async function callOnce({ system, messages, signal, expectJson }) {
  const opts = { model: MODEL(), messages: toMessages(system, messages) };
  if (expectJson) opts.response_format = { type: 'json_object' };
  const res = await client().chat.completions.create(opts, { signal });
  return res.choices[0]?.message?.content || '';
}

async function* callStream({ system, messages, signal }) {
  const stream = await client().chat.completions.create(
    { model: MODEL(), stream: true, messages: toMessages(system, messages) },
    { signal },
  );
  for await (const chunk of stream) {
    const t = chunk.choices[0]?.delta?.content;
    if (t) yield t;
  }
}

module.exports = {
  name: 'groq',
  label: 'GROQ',
  callOnce,
  callStream,
  isConfigured,
};
