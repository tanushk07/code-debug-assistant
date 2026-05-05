const OpenAI = require('openai');

let _client;
const client = () => (_client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

const isConfigured = () => !!process.env.OPENAI_API_KEY;
const MAX_TOKENS = 4096;
const MODEL = () => process.env.OPENAI_MODEL || 'gpt-4o-mini';

function toOpenAIMessages(system, messages) {
  const out = [];
  if (system) out.push({ role: 'system', content: system });
  for (const m of messages) {
    out.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.parts.map((p) =>
        p.type === 'image'
          ? { type: 'image_url', image_url: { url: p.url } }
          : { type: 'text', text: p.text },
      ),
    });
  }
  return out;
}

async function callOnce({ system, messages, signal, expectJson }) {
  const opts = {
    model: MODEL(),
    max_tokens: MAX_TOKENS,
    messages: toOpenAIMessages(system, messages),
  };
  if (expectJson) opts.response_format = { type: 'json_object' };
  const res = await client().chat.completions.create(opts, { signal });
  return res.choices[0]?.message?.content || '';
}

async function* callStream({ system, messages, signal }) {
  const stream = await client().chat.completions.create(
    {
      model: MODEL(),
      max_tokens: MAX_TOKENS,
      stream: true,
      messages: toOpenAIMessages(system, messages),
    },
    { signal },
  );
  for await (const chunk of stream) {
    const t = chunk.choices[0]?.delta?.content;
    if (t) yield t;
  }
}

module.exports = {
  name: 'gpt',
  label: 'GPT',
  callOnce,
  callStream,
  isConfigured,
};
