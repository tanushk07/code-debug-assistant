import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { setToken } from '../lib/auth.js'
import { getConfig } from '../lib/config.js'

export default function Signup() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr]           = useState(null)
  const [busy, setBusy]         = useState(false)
  const [googleAuth, setGoogleAuth] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getConfig().then((c) => setGoogleAuth(Boolean(c.googleAuth)))
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    if (password.length < 8) { setErr('password must be at least 8 characters'); return }
    setBusy(true)
    try {
      const { token } = await api('/api/auth/signup', {
        method: 'POST',
        body: { name, email, password },
      })
      setToken(token)
      navigate('/chat')
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="pixel-card w-full max-w-md p-8 space-y-6">
        <div>
          <h1 className="pixel-h1">SIGN&nbsp;UP</h1>
          <div className="pixel-label opacity-60 mt-1">/ NEW PLAYER</div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="pixel-label block mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="pixel-input"
            />
          </div>
          <div>
            <label className="pixel-label block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pixel-input"
            />
          </div>
          <div>
            <label className="pixel-label block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="pixel-input"
            />
            <p className="font-terminal text-sm opacity-60 mt-1">[ min 8 characters ]</p>
          </div>
          {err && <p className="font-terminal text-red-700 text-lg">[ {err} ]</p>}
          <button type="submit" disabled={busy} className="pixel-btn-primary w-full">
            {busy ? 'CREATING…' : 'CREATE ACCOUNT'}
          </button>
        </form>

        {googleAuth && (
          <div className="border-t-2 border-black pt-4">
            <a href="/api/auth/google" className="pixel-btn w-full text-center block">
              CONTINUE WITH GOOGLE
            </a>
          </div>
        )}

        <p className="font-terminal text-center text-lg">
          Already have one? <Link to="/login" className="underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
