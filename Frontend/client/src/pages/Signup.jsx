import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { setToken } from '../lib/auth.js'
import { getConfig } from '../lib/config.js'

export default function Signup() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
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
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="pixel-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPw ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            <p className="font-terminal text-sm opacity-60 mt-1">[ min 8 characters ]</p>
          </div>
          {err && <p className="font-terminal text-red-700 text-lg">[ {err} ]</p>}
          <button type="submit" disabled={busy} className="pixel-btn-primary w-full">
            {busy ? <span className="pixel-loading">CREATING</span> : 'CREATE ACCOUNT'}
          </button>
        </form>

        {googleAuth && (
          <div className="border-t-2 border-black pt-4">
            <a href={`${import.meta.env.VITE_API_URL || ''}/api/auth/google`} className="pixel-btn w-full text-center block">
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
