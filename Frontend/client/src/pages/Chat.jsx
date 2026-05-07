import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SessionSidebar from '../components/SessionSidebar.jsx'
import CodeEditor from '../components/CodeEditor.jsx'
import ErrorLog from '../components/ErrorLog.jsx'
import ImageUpload from '../components/ImageUpload.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import ProfileModal from '../components/ProfileModal.jsx'
import ShareButton from '../components/ShareButton.jsx'
import { useSession } from '../hooks/useSession.js'
import { api } from '../lib/api.js'
import { clearToken } from '../lib/auth.js'

export default function Chat() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const creating = useRef(false)
  const [showProfile, setShowProfile] = useState(false)

  // ---- Resizable panel sizes (persisted to localStorage) ----
  const [sidebarW, setSidebarW] = useState(() => parseInt(localStorage.getItem('cda.sidebarW')) || 288)
  const [chatW, setChatW] = useState(() => parseInt(localStorage.getItem('cda.chatW')) || 384)
  const [errorH, setErrorH] = useState(() => parseInt(localStorage.getItem('cda.errorH')) || 160)
  const dragging = useRef(null)

  useEffect(() => { localStorage.setItem('cda.sidebarW', sidebarW) }, [sidebarW])
  useEffect(() => { localStorage.setItem('cda.chatW', chatW) }, [chatW])
  useEffect(() => { localStorage.setItem('cda.errorH', errorH) }, [errorH])

  // Global mousemove / mouseup for drag-resize
  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return
      e.preventDefault()
      const d = dragging.current
      if (d.type === 'sidebar') {
        setSidebarW(Math.max(180, Math.min(480, d.startVal + (e.clientX - d.startX))))
      } else if (d.type === 'chat') {
        setChatW(Math.max(260, Math.min(640, d.startVal - (e.clientX - d.startX))))
      } else if (d.type === 'error') {
        setErrorH(Math.max(60, Math.min(400, d.startVal - (e.clientY - d.startY))))
      }
    }
    function onMouseUp() {
      if (!dragging.current) return
      dragging.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const startDrag = useCallback((type, startVal, e) => {
    dragging.current = { type, startX: e.clientX, startY: e.clientY, startVal }
    document.body.style.cursor = type === 'error' ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  // No sessionId in URL → create one and redirect.
  useEffect(() => {
    if (sessionId || creating.current) return
    creating.current = true
      ; (async () => {
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

  const { session, messages, save, refetch, loading } = useSession(sessionId)

  function logout() {
    clearToken()
    navigate('/')
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="pixel-label pixel-loading">CREATING SESSION</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white relative">
      {loading && (
        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
          <div className="pixel-card px-8 py-6">
            <span className="font-pixel text-lg uppercase tracking-wider pixel-loading">LOADING SESSION</span>
          </div>
        </div>
      )}

      {/* ---- Sidebar ---- */}
      <div style={{ width: sidebarW }} className="flex-shrink-0 h-full overflow-hidden">
        <SessionSidebar activeId={sessionId} refreshKey={messages.length} />
      </div>

      <div
        className="resize-handle-h"
        onMouseDown={(e) => startDrag('sidebar', sidebarW, e)}
      />

      {/* ---- Middle: Code + Error + Image ---- */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <header className="border-b-2 border-black h-9 flex items-center px-3 bg-gray-50 gap-3 flex-shrink-0">
          <input
            value={session?.title || ''}
            onChange={(e) => save({ title: e.target.value })}
            placeholder="UNTITLED SESSION"
            className="font-pixel text-[10px] uppercase tracking-wider bg-transparent outline-none flex-1 placeholder:opacity-40"
          />
          <ShareButton sessionId={sessionId} />
          <button onClick={() => setShowProfile(true)} className="pixel-label hover:underline">PROFILE</button>
          <button onClick={logout} className="pixel-label hover:underline">LOGOUT</button>
        </header>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <CodeEditor
              files={session?.files || []}
              onChange={(files) => save({ files })}
            />
          </div>

          <div
            className="resize-handle-v"
            onMouseDown={(e) => startDrag('error', errorH, e)}
          />

          <div style={{ height: errorH }} className="flex-shrink-0 overflow-hidden">
            <ErrorLog
              value={session?.error_log || ''}
              onChange={(error_log) => save({ error_log })}
            />
          </div>

          <ImageUpload
            value={session?.images}
            onChange={(images) => save({ images })}
          />
        </div>
      </div>

      <div
        className="resize-handle-h"
        onMouseDown={(e) => startDrag('chat', chatW, e)}
      />

      {/* ---- Chat Panel ---- */}
      <div style={{ width: chatW }} className="flex-shrink-0 h-full overflow-hidden">
        <ChatPanel
          sessionId={sessionId}
          messages={messages}
          onMessageComplete={refetch}
        />
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  )
}
