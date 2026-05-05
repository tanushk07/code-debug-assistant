import { useRef, useState } from 'react'
import { getToken } from '../lib/auth.js'

export function useStreamingChat(sessionId, onComplete) {
  const [streaming, setStreaming]           = useState(false)
  const [draft, setDraft]                   = useState('')
  const [classification, setClassification] = useState(null)
  const [error, setError]                   = useState(null)
  const abortRef = useRef(null)

  async function send(userMessage, modelId = 'claude') {
    setStreaming(true); setDraft(''); setClassification(null); setError(null)
    abortRef.current = new AbortController()

    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ user_message: userMessage, model_id: modelId }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        let msg = res.statusText
        try { msg = (await res.json()).error || msg } catch {}
        throw new Error(msg)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split('\n\n')
        buffer = frames.pop()
        for (const frame of frames) parseFrame(frame)
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message)
    } finally {
      setStreaming(false)
      setDraft('')
      setClassification(null)
      onComplete?.()
    }
  }

  function parseFrame(frame) {
    let event = 'message', data = ''
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data = line.slice(5).trim()
    }
    if (!data) return
    let payload
    try { payload = JSON.parse(data) } catch { return }
    if      (event === 'classification') setClassification(payload)
    else if (event === 'token')          setDraft((d) => d + payload.text)
    else if (event === 'error')          setError(payload.error)
  }

  function abort() { abortRef.current?.abort() }

  return { streaming, draft, classification, error, send, abort }
}
