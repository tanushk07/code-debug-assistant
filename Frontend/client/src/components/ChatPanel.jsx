import { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { useStreamingChat } from '../hooks/useStreamingChat.js'
import { getConfig } from '../lib/config.js'

export default function ChatPanel({ sessionId, messages, onMessageComplete }) {
  const { streaming, draft, classification, error, send, abort } =
    useStreamingChat(sessionId, onMessageComplete)
  const [input, setInput]         = useState('')
  const [providers, setProviders] = useState([])   // [{ id, label }]
  const [model, setModel]         = useState(() => localStorage.getItem('cda.model') || '')
  const bottomRef = useRef()
  const taRef     = useRef()

  // Discover which LLM providers the backend has keys for.
  useEffect(() => {
    getConfig().then((cfg) => {
      const list = cfg.providers || []
      setProviders(list)
      setModel((prev) => (list.find((p) => p.id === prev) ? prev : list[0]?.id || ''))
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, draft])

  useEffect(() => {
    if (model) localStorage.setItem('cda.model', model)
  }, [model])

  function onSend() {
    const text = input.trim()
    if (!text || streaming || !sessionId) return
    send(text, model)
    setInput('')
    taRef.current?.focus()
  }

  function onKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onSend()
    }
  }

  const noProviders = providers.length === 0

  return (
    <aside className="flex flex-col h-full border-l-2 border-black bg-white min-h-0">
      <div className="border-b-2 border-black h-9 flex items-center px-3 bg-gray-50">
        <span className="pixel-label">CHAT</span>
        {streaming && <span className="ml-auto pixel-label opacity-60">STREAMING…</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && !streaming && (
          <p className="font-terminal text-lg opacity-50">
            No messages yet. Add your code, error log, and a screenshot if you have one — then ask a question below.
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id || i}
            role={m.role}
            content={m.content}
            classification={m.classification}
          />
        ))}
        {streaming && (
          <MessageBubble role="assistant" content={draft} classification={classification} live />
        )}
        {error && (
          <div className="font-terminal text-red-700 text-lg">[ {error} ]</div>
        )}
        {noProviders && (
          <div className="font-terminal text-red-700 text-lg">
            [ no LLM provider configured — set a key in Backend/.env ]
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t-2 border-black p-3 space-y-2">
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask about your code… (Ctrl+Enter to send)"
          className="pixel-input font-mono text-sm resize-none"
          rows={3}
          disabled={!sessionId || noProviders}
        />
        <div className="flex gap-2 items-center">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={noProviders}
            className="border-2 border-black bg-white font-pixel text-[10px] px-2 py-2 uppercase disabled:opacity-50"
            title="Pick the LLM provider"
          >
            {noProviders ? (
              <option>NONE CONFIGURED</option>
            ) : (
              providers.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))
            )}
          </select>
          {streaming ? (
            <button onClick={abort} className="pixel-btn flex-1">STOP</button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim() || !sessionId || noProviders}
              className="pixel-btn-primary flex-1"
            >
              SEND
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
