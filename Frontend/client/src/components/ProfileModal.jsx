import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { clearToken } from '../lib/auth.js'

export default function ProfileModal({ onClose }) {
  const [me, setMe]         = useState(null)
  const [name, setName]     = useState('')
  const [avatar, setAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api('/api/me')
      .then((u) => { setMe(u); setName(u.name || ''); setAvatar(u.avatar_url || '') })
      .catch(() => navigate('/login'))
  }, [navigate])

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const updated = await api('/api/me', {
        method: 'PATCH',
        body: { name, avatar_url: avatar || null },
      })
      setMe(updated)
      setMsg('saved.')
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    clearToken()
    navigate('/')
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white/50 backdrop-blur-[2px] flex items-center justify-center p-6">
      <div className="w-full max-w-xl pixel-card p-8 space-y-6 relative shadow-pixel-lg">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 pixel-btn px-2 py-1"
          aria-label="Close"
        >
          X
        </button>

        <div className="flex items-center justify-between gap-4">
          <h1 className="pixel-h1">PROFILE</h1>
        </div>

        {!me ? (
          <div className="py-8 text-center">
            <span className="font-pixel text-lg uppercase tracking-wider pixel-loading">LOADING</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="pixel-label block mb-1">Email (read-only)</label>
              <input value={me.email} readOnly className="pixel-input opacity-70" />
            </div>
            <div>
              <label className="pixel-label block mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="pixel-input" />
            </div>
            <div>
              <label className="pixel-label block mb-1">Avatar URL</label>
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://…"
                className="pixel-input"
              />
            </div>
            {avatar && (
              <img
                src={avatar}
                alt="avatar preview"
                referrerPolicy="no-referrer"
                className="w-16 h-16 border-2 border-black object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
            {msg && <p className="font-terminal text-lg">[ {msg} ]</p>}

            <div className="flex gap-3 pt-4 border-t-2 border-black">
              <button onClick={save} disabled={saving} className="pixel-btn-primary flex-1">
                {saving ? <span className="pixel-loading">SAVING</span> : 'SAVE'}
              </button>
              <button onClick={logout} className="pixel-btn flex-1">LOG OUT</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
