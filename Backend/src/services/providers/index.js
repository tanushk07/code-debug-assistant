// Provider registry — Factory pattern.
//
// Auto-discovers every sibling .js file at boot. Each provider self-registers
// by exporting:
//
//   { name, label, callOnce, callStream, isConfigured }
//
// Drop a new file in this folder, expose those five symbols, and it's
// available to the router and the UI dropdown — no other code change needed.

const fs = require('node:fs');
const path = require('node:path');

const registry = {};

for (const file of fs.readdirSync(__dirname)) {
  if (file === 'index.js' || !file.endsWith('.js')) continue;
  const provider = require(path.join(__dirname, file));
  if (provider?.name) registry[provider.name] = provider;
}

/** All registered providers (configured or not), keyed by `name`. */
function all() {
  return registry;
}

/** Only providers whose API key is set in env. Preserves a stable display order. */
function configured() {
  const ORDER = ['groq', 'gemini', 'gpt', 'claude'];
  return ORDER.map((n) => registry[n]).filter((p) => p?.isConfigured());
}

/** Lookup by name, including a few aliases (anthropic→claude, openai→gpt, …). */
function byName(name) {
  const ALIASES = {
    anthropic: 'claude',
    openai: 'gpt',
    google: 'gemini',
    llama: 'groq',
  };
  const k = (name || '').toLowerCase();
  return registry[ALIASES[k] || k];
}

module.exports = { all, configured, byName };
