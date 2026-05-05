import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setToken } from '../lib/auth.js'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    const t = params.get('token')
    if (t) {
      setToken(t)
      navigate('/chat', { replace: true })
    } else {
      navigate('/login?error=oauth', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="pixel-label">SIGNING YOU IN…</div>
    </div>
  )
}
