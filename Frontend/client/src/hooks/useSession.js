import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'

export function useSession(sessionId) {
  const [session, setSession]   = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const timer = useRef(null)
  const pending = useRef({})

  const refetch = useCallback(async () => {
    if (!sessionId) return
    try {
      const data = await api(`/api/sessions/${sessionId}`)
      setSession(data.session)
      setMessages(data.messages)
    } catch {
      // ignore — stale session id, expired token, etc.
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      setSession(null); setMessages([]); setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    api(`/api/sessions/${sessionId}`)
      .then((data) => {
        if (!alive) return
        setSession(data.session)
        setMessages(data.messages)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [sessionId])

  function save(patch) {
    setSession((prev) => ({ ...(prev || {}), ...patch }))
    pending.current = { ...pending.current, ...patch }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const toSend = pending.current
      pending.current = {}
      try {
        await api(`/api/sessions/${sessionId}`, { method: 'PATCH', body: toSend })
      } catch {}
    }, 500)
  }

  return { session, messages, setMessages, loading, save, refetch }
}
