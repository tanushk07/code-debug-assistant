import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { clearToken } from '../lib/auth.js'

export default function Profile() {
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
  }, [])

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

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="pixel-label">LOADING…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-xl mx-auto pixel-card p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="pixel-h1">PROFILE</h1>
          <Link to="/chat" className="pixel-btn">← BACK</Link>
        </div>

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
            <img src={avatar} alt="avatar" className="w-16 h-16 border-2 border-black object-cover" />
          )}
          {msg && <p className="font-terminal text-lg">[ {msg} ]</p>}

          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="pixel-btn-primary flex-1">
              {saving ? 'SAVING…' : 'SAVE'}
            </button>
            <button onClick={logout} className="pixel-btn flex-1">LOG OUT</button>
          </div>
        </div>
      </div>
    </div>
  )
}
