// mergeParams lets us read :id from the parent (sessions) router.
const router = require('express').Router({ mergeParams: true });
const requireAuth = require('../middleware/auth');
const { query } = require('../db');
const { runAgents } = require('../services/agents');

router.use(requireAuth);

router.post('/', async (req, res, next) => {
  const sessionId = req.params.id;
  const { user_message, model_id = 'claude' } = req.body || {};
  if (!user_message) return res.status(400).json({ error: 'user_message required' });

  let sseStarted = false;
  const abort = new AbortController();

  try {
    // 1. Authorise + load context
    const { rows: srows } = await query(
      'SELECT * FROM debug_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, req.user.id],
    );
    if (!srows[0]) return res.status(404).json({ error: 'Not found' });
    const session = srows[0];

    const { rows: priorMessages } = await query(
      'SELECT * FROM session_messages WHERE session_id = $1 ORDER BY created_at',
      [sessionId],
    );

    // 2. Persist user message immediately
    await query(
      `INSERT INTO session_messages (session_id, role, content)
       VALUES ($1, 'user', $2)`,
      [sessionId, user_message],
    );

    // 2b. Auto-title on first turn — runs BEFORE agents so the title sticks
    //     even if the LLM call later fails (quota, overload, etc.).
    if (priorMessages.length === 0) {
      const newTitle =
        user_message.slice(0, 60).replace(/\s+/g, ' ').trim() || 'Untitled session';
      await query(
        'UPDATE debug_sessions SET title = $1 WHERE id = $2 AND title = $3',
        [newTitle, sessionId, 'Untitled session'],
      );
    }

    // 3. Open SSE stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    sseStarted = true;

    const send = (event, data) =>
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    req.on('close', () => abort.abort());

    // 4. Run two-agent pipeline
    const { classification, assistantText } = await runAgents({
      session,
      priorMessages,
      userMessage: user_message,
      model: model_id,
      signal: abort.signal,
      onClassification: (c) => send('classification', c),
      onToken: (t) => send('token', { text: t }),
    });

    // 5. Persist assistant message + bump session timestamp
    await query(
      `INSERT INTO session_messages (session_id, role, content, model_used, classification)
       VALUES ($1, 'assistant', $2, $3, $4)`,
      [sessionId, assistantText, model_id, classification],
    );
    await query('UPDATE debug_sessions SET updated_at = NOW() WHERE id = $1', [sessionId]);

    send('done', { ok: true });
    res.end();
  } catch (err) {
    if (sseStarted) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message || 'Stream failed' })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
});

module.exports = router;
