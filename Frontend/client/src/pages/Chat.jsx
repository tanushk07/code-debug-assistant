import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SessionSidebar from '../components/SessionSidebar.jsx'
import CodeEditor    from '../components/CodeEditor.jsx'
import ErrorLog      from '../components/ErrorLog.jsx'
import ImageUpload   from '../components/ImageUpload.jsx'
import ChatPanel     from '../components/ChatPanel.jsx'
import { useSession } from '../hooks/useSession.js'
import { api } from '../lib/api.js'
import { clearToken } from '../lib/auth.js'

export default function Chat() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const creating = useRef(false)

  // No sessionId in URL → create one and redirect.
  useEffect(() => {
    if (sessionId || creating.current) return
    creating.current = true
    ;(async () => {
      try {
        const { id } = await api('/api/sessions', { method: 'POST' })
        navigate(`/chat/${id}`, { replace: true })
      } catch {
        clearToken()
        navigate('/login')
      } finally {
        creating.current = false
      }
    })()
  }, [sessionId, navigate])

  const { session, messages, save, refetch } = useSession(sessionId)

  function logout() {
    clearToken()
    navigate('/')
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="pixel-label">CREATING SESSION…</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[18rem_1fr_24rem] h-screen overflow-hidden bg-white">
      <SessionSidebar activeId={sessionId} refreshKey={messages.length} />

      <div className="flex flex-col min-h-0 overflow-hidden border-l-2 border-black">
        <header className="border-b-2 border-black h-9 flex items-center px-3 bg-gray-50 gap-3">
          <input
            value={session?.title || ''}
            onChange={(e) => save({ title: e.target.value })}
            placeholder="UNTITLED SESSION"
            className="font-pixel text-[10px] uppercase tracking-wider bg-transparent outline-none flex-1 placeholder:opacity-40"
          />
          <Link to="/profile" className="pixel-label hover:underline">PROFILE</Link>
          <button onClick={logout} className="pixel-label hover:underline">LOGOUT</button>
        </header>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <CodeEditor
              files={session?.files || []}
              onChange={(files) => save({ files })}
            />
          </div>
          <ErrorLog
            value={session?.error_log || ''}
            onChange={(error_log) => save({ error_log })}
          />
          <ImageUpload
            value={session?.image_path}
            onChange={(image_path) => save({ image_path })}
          />
        </div>
      </div>

      <ChatPanel
        sessionId={sessionId}
        messages={messages}
        onMessageComplete={refetch}
      />
    </div>
  )
}
