// Cached runtime capability map from GET /api/config.
//
// Pages that need it (Login, Signup, ChatPanel) call getConfig() — the
// first call hits the API; subsequent calls return the cached promise.

let _cache

export function getConfig() {
  if (!_cache) {
    _cache = fetch('/api/config')
      .then((r) => (r.ok ? r.json() : { providers: [], googleAuth: false }))
      .catch(() => ({ providers: [], googleAuth: false }))
  }
  return _cache
}
