import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

export default function SessionSidebar({ activeId, refreshKey, onCollapse }) {
  const [sessions, setSessions] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api('/api/sessions').then(setSessions).catch(() => {})
  }, [refreshKey])

  async function newSession() {
    try {
      const { id } = await api('/api/sessions', { method: 'POST' })
      setSessions((s) => [{ id, title: 'Untitled session', updated_at: new Date() }, ...s])
      navigate(`/chat/${id}`)
    } catch {}
  }

  async function deleteSession(id, e) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this session permanently?')) return
    try {
      await api(`/api/sessions/${id}`, { method: 'DELETE' })
      setSessions((s) => s.filter((x) => x.id !== id))
      if (String(id) === String(activeId)) navigate('/chat')
    } catch {}
  }

  return (
    <aside className="bg-white flex flex-col h-full">
      <div className="px-3 py-3 border-b-2 border-black flex items-center gap-2 h-12">
        <span className="pixel-label flex-1">SESSIONS</span>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="pixel-label px-1 hover:underline"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            «
          </button>
        )}
      </div>

      <div className="px-3 pt-3 pb-2">
        <button onClick={newSession} className="pixel-btn-primary w-full">
          + NEW SESSION
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <div className="px-3 py-6 font-terminal text-lg opacity-50 text-center">
            No sessions yet.
          </div>
        )}
        {sessions.map((s) => {
          const active = String(s.id) === String(activeId)
          return (
            <Link
              key={s.id}
              to={`/chat/${s.id}`}
              className={
                'block px-3 py-2 border-b border-black/30 group relative ' +
                (active ? 'bg-black text-white' : 'hover:bg-gray-100')
              }
            >
              <div className="font-terminal text-lg truncate pr-6">
                {s.title || 'Untitled'}
              </div>
              <div className={'pixel-label ' + (active ? 'opacity-70' : 'opacity-50')}>
                {new Date(s.updated_at).toLocaleDateString()}
              </div>
              <button
                onClick={(e) => deleteSession(s.id, e)}
                className={
                  'absolute right-2 top-2 font-pixel text-[10px] px-1 ' +
                  (active ? 'opacity-70' : 'opacity-0 group-hover:opacity-70 hover:opacity-100')
                }
                aria-label="Delete"
                title="Delete session"
              >
                X
              </button>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
