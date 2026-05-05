const { GoogleGenAI } = require('@google/genai');

let _client;
const client = () => (_client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

const isConfigured = () => !!process.env.GEMINI_API_KEY;
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Gemini wants images inline as base64 (or via the Files API for big ones).
// Our session.image_path is a public R2 URL — fetch + base64 it.
async function fetchAsInlineData(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get('content-type') || 'image/png';
  return { mimeType, data: buf.toString('base64') };
}

async function toGeminiContents(messages) {
  const out = [];
  for (const m of messages) {
    const parts = [];
    for (const p of m.parts) {
      if (p.type === 'image') {
        const inlineData = await fetchAsInlineData(p.url);
        parts.push({ inlineData });
      } else {
        parts.push({ text: p.text });
      }
    }
    out.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
  }
  return out;
}

async function callOnce({ system, messages, expectJson /* signal not honoured by SDK */ }) {
  const contents = await toGeminiContents(messages);
  const config = {};
  if (system) config.systemInstruction = system;
  if (expectJson) config.responseMimeType = 'application/json';
  const res = await client().models.generateContent({
    model: MODEL(),
    contents,
    config: Object.keys(config).length ? config : undefined,
  });
  return res.text || '';
}

async function* callStream({ system, messages }) {
  const contents = await toGeminiContents(messages);
  const stream = await client().models.generateContentStream({
    model: MODEL(),
    contents,
    config: system ? { systemInstruction: system } : undefined,
  });
  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}

module.exports = {
  name: 'gemini',
  label: 'GEMINI',
  callOnce,
  callStream,
  isConfigured,
};
