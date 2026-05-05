const { callOnce, callStream } = require('./llm');

const CLASSIFIER_SYSTEM = `You are an error classifier. Read the user's code, error log, and (optional) screenshot.
Return ONLY valid JSON. No prose, no markdown fences. Exact shape:
{ "errors": [ { "type": "...", "location": "file:line", "summary": "..." } ] }
If you cannot identify any clear error, return {"errors": []}.`;

const FIXER_SYSTEM = `You are a senior debugging assistant. You will be given the user's code, error log, optional screenshot, and a JSON list of errors classified in a prior step.
Write a clear, actionable fix in markdown. Show diffs as fenced code blocks with the appropriate language tag. Be concise; assume the reader is a competent developer.`;

// Internal portable IR. Each provider in services/providers/* converts this
// into its own SDK shape.
//   messages: [{ role: 'user'|'assistant', parts: [{type:'text',text}|{type:'image',url}] }]
function buildContextMessages(session, priorMessages, userMessage) {
  const messages = priorMessages.map((m) => ({
    role: m.role,
    parts: [{ type: 'text', text: m.content }],
  }));

  const turn = [];

  if (Array.isArray(session.files) && session.files.length) {
    const filesText = session.files
      .map((f) => `// === ${f.name} (${f.language || 'plaintext'}) ===\n${f.content || ''}`)
      .join('\n\n');
    turn.push({ type: 'text', text: `<files>\n${filesText}\n</files>` });
  }

  if (session.error_log) {
    turn.push({ type: 'text', text: `<error_log>\n${session.error_log}\n</error_log>` });
  }

  if (session.image_path) {
    turn.push({ type: 'image', url: session.image_path });
  }

  turn.push({ type: 'text', text: userMessage });
  messages.push({ role: 'user', parts: turn });
  return messages;
}

async function classify({ session, priorMessages, userMessage, model, signal }) {
  const messages = buildContextMessages(session, priorMessages, userMessage);
  const text = await callOnce({
    system: CLASSIFIER_SYSTEM,
    messages,
    model,
    signal,
    expectJson: true,
  });
  // Strip markdown fences and extract the first JSON object even when the
  // model wraps it in prose.
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed.errors) ? parsed : { errors: [] };
  } catch {
    return { errors: [] };
  }
}

async function* fix({ session, priorMessages, userMessage, classification, model, signal }) {
  const messages = buildContextMessages(session, priorMessages, userMessage);
  const last = messages[messages.length - 1];
  last.parts.push({
    type: 'text',
    text: `<classification>${JSON.stringify(classification)}</classification>`,
  });
  yield* callStream({ system: FIXER_SYSTEM, messages, model, signal });
}

async function runAgents({
  session,
  priorMessages,
  userMessage,
  model,
  signal,
  onClassification,
  onToken,
}) {
  const classification = await classify({
    session, priorMessages, userMessage, model, signal,
  });
  onClassification(classification);

  let assistantText = '';
  for await (const token of fix({
    session, priorMessages, userMessage, classification, model, signal,
  })) {
    assistantText += token;
    onToken(token);
  }
  return { classification, assistantText };
}

module.exports = { runAgents };
