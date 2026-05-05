const Anthropic = require('@anthropic-ai/sdk');

let _client;
const client = () => (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

const isConfigured = () => !!process.env.ANTHROPIC_API_KEY;
const MAX_TOKENS = 4096;
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

function toAnthropicMessages(messages) {
  return messages.map((m) => ({
    role: m.role,
    content: m.parts.map((p) =>
      p.type === 'image'
        ? { type: 'image', source: { type: 'url', url: p.url } }
        : { type: 'text', text: p.text },
    ),
  }));
}

async function callOnce({ system, messages, signal /* expectJson via prompt only */ }) {
  const res = await client().messages.create(
    {
      model: MODEL(),
      max_tokens: MAX_TOKENS,
      system,
      messages: toAnthropicMessages(messages),
    },
    { signal },
  );
  return res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

async function* callStream({ system, messages, signal }) {
  const stream = client().messages.stream(
    {
      model: MODEL(),
      max_tokens: MAX_TOKENS,
      system,
      messages: toAnthropicMessages(messages),
    },
    { signal },
  );
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

module.exports = {
  name: 'claude',
  label: 'CLAUDE',
  callOnce,
  callStream,
  isConfigured,
};
