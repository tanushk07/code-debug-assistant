import { useEffect, useState, useRef, useCallback } from 'react'
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

  // ── OTP step state ──────────────────────────────────────────────────
  const [step, setStep]               = useState(1) // 1 = form, 2 = OTP
  const [otpDigits, setOtpDigits]     = useState(['', '', '', '', '', ''])
  const [cooldown, setCooldown]       = useState(0)
  const inputRefs = useRef([])
  const cooldownRef = useRef(null)

  useEffect(() => {
    getConfig().then((c) => setGoogleAuth(Boolean(c.googleAuth)))
  }, [])

  // Clean up cooldown timer on unmount
  useEffect(() => () => clearInterval(cooldownRef.current), [])

  // ── Start cooldown countdown ────────────────────────────────────────
  const startCooldown = useCallback(() => {
    setCooldown(60)
    clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }, [])

  // ── Step 1: Send verification code ──────────────────────────────────
  async function onSendCode(e) {
    e.preventDefault()
    setErr(null)
    if (password.length < 8) { setErr('password must be at least 8 characters'); return }
    setBusy(true)
    try {
      await api('/api/auth/send-code', {
        method: 'POST',
        body: { name, email, password },
      })
      setStep(2)
      startCooldown()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  // ── Step 2: Verify code & create account ────────────────────────────
  async function onVerify(e) {
    e.preventDefault()
    setErr(null)
    const code = otpDigits.join('')
    if (code.length !== 6) { setErr('enter the full 6-digit code'); return }
    setBusy(true)
    try {
      const { token } = await api('/api/auth/signup', {
        method: 'POST',
        body: { email, code },
      })
      setToken(token)
      navigate('/chat')
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  // ── Resend code ─────────────────────────────────────────────────────
  async function onResend() {
    setErr(null)
    setBusy(true)
    try {
      await api('/api/auth/send-code', {
        method: 'POST',
        body: { name, email, password },
      })
      setOtpDigits(['', '', '', '', '', ''])
      startCooldown()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  // ── OTP digit input handler ─────────────────────────────────────────
  function handleOtpChange(index, value) {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return
    const next = [...otpDigits]
    next[index] = value
    setOtpDigits(next)
    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...otpDigits]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || ''
    setOtpDigits(next)
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="pixel-card w-full max-w-md p-8 space-y-6">
        <div>
          <h1 className="pixel-h1">SIGN&nbsp;UP</h1>
          <div className="pixel-label opacity-60 mt-1">
            {step === 1 ? '/ NEW PLAYER' : '/ VERIFY EMAIL'}
          </div>
        </div>

        {/* ── STEP 1: Credentials form ─────────────────────────────── */}
        {step === 1 && (
          <>
            <form onSubmit={onSendCode} className="space-y-4">
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
                {busy ? <span className="pixel-loading">SENDING CODE</span> : 'SEND VERIFICATION CODE'}
              </button>
            </form>

            {googleAuth && (
              <div className="border-t-2 border-black pt-4">
                <a href={`${import.meta.env.VITE_API_URL || ''}/api/auth/google`} className="pixel-btn w-full text-center block">
                  CONTINUE WITH GOOGLE
                </a>
              </div>
            )}
          </>
        )}

        {/* ── STEP 2: OTP verification ─────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={onVerify} className="space-y-5">
            <div className="font-terminal text-center space-y-2">
              <p className="text-lg">Verification code sent to</p>
              <p className="font-bold text-lg" style={{ wordBreak: 'break-all' }}>{email}</p>
              <p className="text-sm opacity-60">[ check your inbox &amp; spam folder ]</p>
            </div>

            {/* 6-digit OTP inputs */}
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                  className="pixel-input text-center font-bold"
                  style={{
                    width: '48px',
                    height: '56px',
                    fontSize: '24px',
                    padding: '0',
                    letterSpacing: '0',
                  }}
                />
              ))}
            </div>

            {err && <p className="font-terminal text-red-700 text-lg text-center">[ {err} ]</p>}

            <button type="submit" disabled={busy} className="pixel-btn-primary w-full">
              {busy ? <span className="pixel-loading">VERIFYING</span> : 'VERIFY & CREATE ACCOUNT'}
            </button>

            <div className="flex items-center justify-between font-terminal text-sm">
              <button
                type="button"
                onClick={() => { setStep(1); setErr(null); setOtpDigits(['', '', '', '', '', '']) }}
                className="underline opacity-60 hover:opacity-100"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={onResend}
                disabled={cooldown > 0 || busy}
                className={`underline ${cooldown > 0 ? 'opacity-40 cursor-not-allowed' : 'opacity-60 hover:opacity-100'}`}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        <p className="font-terminal text-center text-lg">
          Already have one? <Link to="/login" className="underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
