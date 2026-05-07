// Owner-side share toggle. Lives in the chat header.
// Modal opens on click; lazy-fetches existing share state once per open.
import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

export default function ShareButton({ sessionId }) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState('')          // '' = none active, string = active
  const [fetched, setFetched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // On modal open, ask the backend whether this session is already shared.
  useEffect(() => {
    if (!open || !sessionId || fetched) return
    setLoading(true)
    api(`/api/sessions/${sessionId}/share`)
      .then((d) => setToken(d.token || ''))
      .catch(() => setToken(''))
      .finally(() => {
        setFetched(true)
        setLoading(false)
      })
  }, [open, sessionId, fetched])

  // If the session changes, reset cached share state.
  useEffect(() => {
    setFetched(false)
    setToken('')
  }, [sessionId])

  async function enable() {
    setLoading(true)
    try {
      const d = await api(`/api/sessions/${sessionId}/share`, { method: 'POST' })
      setToken(d.token || '')
    } catch {
      // Swallow — user will see the unchanged "GENERATE" button and can retry.
    } finally {
      setLoading(false)
    }
  }

  async function revoke() {
    if (!confirm('Revoke this share link? Anyone with the URL will lose access.')) return
    setLoading(true)
    try {
      await api(`/api/sessions/${sessionId}/share`, { method: 'DELETE' })
      setToken('')
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!token) return
    const url = `${window.location.origin}/share/${token}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for non-secure contexts (older browsers, http://).
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const url = token ? `${window.location.origin}/share/${token}` : ''

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="pixel-label hover:underline"
        title="Share this session as a read-only live link"
      >
        SHARE
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="pixel-card max-w-lg w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-3">
              <span className="pixel-h2">SHARE SESSION</span>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto pixel-label hover:underline"
                aria-label="Close"
              >
                CLOSE
              </button>
            </div>

            <p className="font-terminal text-lg mb-4 leading-snug">
              Generate a public link. Anyone with the link can watch this chat
              live, including new messages as they stream. Watchers cannot send
              messages, edit your code, or see your other sessions.
            </p>

            {loading ? (
              <div className="pixel-label pixel-loading">WORKING</div>
            ) : token ? (
              <>
                <div className="border-2 border-black p-2 mb-3 bg-white font-mono text-xs break-all select-all">
                  {url}
                </div>
                <div className="flex gap-2">
                  <button onClick={copy} className="pixel-btn-primary flex-1">
                    {copied ? 'COPIED!' : 'COPY LINK'}
                  </button>
                  <button onClick={revoke} className="pixel-btn">
                    REVOKE
                  </button>
                </div>
              </>
            ) : (
              <button onClick={enable} className="pixel-btn-primary w-full">
                GENERATE SHARE LINK
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
