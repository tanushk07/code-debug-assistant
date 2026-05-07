// In-memory pub/sub for live read-only share viewers.
//
// Single Node process only — multi-instance deploys would need Redis pub/sub
// or similar. Documented as a known limitation; fine for our single-dyno
// Render setup.
const { EventEmitter } = require('node:events');

const bus = new EventEmitter();
bus.setMaxListeners(0);

const channelOf = (sessionId) => `session:${sessionId}`;

function publish(sessionId, event, data) {
  bus.emit(channelOf(sessionId), { event, data });
}

function subscribe(sessionId, listener) {
  const ch = channelOf(sessionId);
  bus.on(ch, listener);
  return () => bus.off(ch, listener);
}

module.exports = { publish, subscribe };
