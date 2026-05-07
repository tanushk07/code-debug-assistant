/**
 * Top-level router.
 *
 *  Public routes:
 *    /                    Landing
 *    /login               Login form
 *    /signup              Signup form
 *    /auth/callback       OAuth lands here with ?token=...
 *
 *  Protected routes (wrap in <RequireAuth/>):
 *    /chat                creates new session, redirects to /chat/:id
 *    /chat/:sessionId     main 3-column UI
 *    /profile             edit profile
 *
 *  Pattern in use:
 *    Higher-Order Component (HOC) / wrapper-component for route guards.
 *
 *  Study:
 *    - "React Router v6/v7 in 1 hour" — Cosden Solutions
 *    - "Protected routes in React Router" — short tutorial, 10–15 min
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import Chat from './pages/Chat.jsx'
import SharePage from './pages/SharePage.jsx'
import { isAuthed } from './lib/auth.js'

function RequireAuth({ children }) {
  // If no token, bounce to /login. `replace` so the back button doesn't loop.
  return isAuthed() ? children : <Navigate to="/login" replace />
}

function RedirectIfAuthed({ children }) {
  // If already logged in, skip the landing/login pages and go straight to the app.
  return isAuthed() ? <Navigate to="/chat" replace /> : children
}

export default function App() {
  return (
    <Routes>
      {/* Public (redirect to app if already logged in) */}
      <Route path="/"               element={<RedirectIfAuthed><Landing /></RedirectIfAuthed>} />
      <Route path="/login"          element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      <Route path="/signup"         element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
      <Route path="/auth/callback"  element={<AuthCallback />} />

      {/* Public read-only share viewer (no auth) */}
      <Route path="/share/:token"   element={<SharePage />} />

      {/* Protected */}
      <Route path="/chat"            element={<RequireAuth><Chat /></RequireAuth>} />
      <Route path="/chat/:sessionId" element={<RequireAuth><Chat /></RequireAuth>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
