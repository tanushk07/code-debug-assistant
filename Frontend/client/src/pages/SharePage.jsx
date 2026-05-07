// Public read-only viewer for a shared session.
// Loads a snapshot, then opens an SSE connection that pushes live events.
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import MessageBubble from '../components/MessageBubble.jsx'

const API = import.meta.env.VITE_API_URL || ''

export default function SharePage() {
  const { token } = useParams()
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [draftClassification, setDraftClassification] = useState(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef()

  // 1. Load snapshot
  useEffect(() => {
    let cancelled = false
    fetch(`${API}/api/share/${token}`)
      .then((r) =>
        r.ok ? r.json() : r.json().then((j) => Promise.reject(new Error(j.error || 'Not found'))),
      )
      .then((d) => {
        if (cancelled) return
        setSession(d.session)
        setMessages(d.messages || [])
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Failed to load shared session.')
      })
    return () => { cancelled = true }
  }, [token])

  // 2. Open SSE for live updates
  useEffect(() => {
    if (error) return
    const es = new EventSource(`${API}/api/share/${token}/stream`)

    es.addEventListener('hello', () => setConnected(true))

    es.addEventListener('user_message', (e) => {
      const data = JSON.parse(e.data)
      setMessages((prev) => [...prev, {
        id: `live-u-${Date.now()}`,
        role: 'user',
        content: data.content,
        created_at: data.created_at,
      }])
    })

    es.addEventListener('classification', (e) => {
      setStreaming(true)
      setDraftClassification(JSON.parse(e.data))
    })

    es.addEventListener('token', (e) => {
      setStreaming(true)
      const { text } = JSON.parse(e.data)
      setDraft((prev) => prev + text)
    })

    es.addEventListener('assistant_message', (e) => {
      const data = JSON.parse(e.data)
      // Append the persisted message first, THEN clear the streaming preview,
      // so the watcher never sees a flicker between the two.
      setMessages((prev) => [...prev, {
        id: `live-a-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        classification: data.classification,
        model_used: data.model_used,
        created_at: data.created_at,
      }])
      setDraft('')
      setDraftClassification(null)
      setStreaming(false)
    })

    es.addEventListener('done', () => {
      setStreaming(false)
    })

    es.onerror = () => setConnected(false)

    return () => es.close()
  }, [token, error])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, draft])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="pixel-card p-6 max-w-md w-full text-center">
          <div className="pixel-h2 mb-3">SHARE NOT AVAILABLE</div>
          <p className="font-terminal text-lg leading-snug">{error}</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="pixel-label pixel-loading">LOADING SHARED SESSION</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b-2 border-black h-12 flex items-center px-4 gap-3 bg-gray-50 flex-shrink-0">
        <span className="pixel-h2 truncate">{session.title || 'UNTITLED SESSION'}</span>
        <span className="pixel-label opacity-60 hidden sm:inline">SHARED · READ ONLY</span>
        <span className="ml-auto flex items-center gap-2">
          <span
            className={
              'inline-block w-3 h-3 ' +
              (connected ? 'bg-green-600 animate-pulse' : 'bg-gray-400')
            }
            aria-hidden="true"
          />
          <span className="pixel-label">{connected ? 'LIVE' : 'OFFLINE'}</span>
        </span>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3 max-w-4xl mx-auto w-full">
        {messages.length === 0 && !streaming && (
          <p className="font-terminal text-lg opacity-50">
            No messages yet. Waiting for the owner to send the first prompt…
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role}
            content={m.content}
            classification={m.classification}
          />
        ))}
        {streaming && (draft || draftClassification) && (
          <MessageBubble
            role="assistant"
            content={draft}
            classification={draftClassification}
            live
          />
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="border-t-2 border-black p-2 bg-gray-50 text-center flex-shrink-0">
        <span className="pixel-label opacity-60">CODE DEBUG ASSISTANT · READ-ONLY SHARE</span>
      </footer>
    </div>
  )
}
