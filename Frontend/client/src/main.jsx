/**
 * React entry — mounts <App/> inside <BrowserRouter/>.
 *
 *  We wrap with BrowserRouter ONCE here (not in App.jsx) so testing utilities
 *  can wrap their own router for tests if you ever add them.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import DesktopGate from './components/DesktopGate.jsx'
import './lib/theme.js'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DesktopGate>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DesktopGate>
  </StrictMode>,
)
