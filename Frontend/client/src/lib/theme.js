// Theme state lives on <html class="dark"> + localStorage.
// Side-effecting import: applies the saved theme before React renders.
import { useEffect, useState } from 'react'

const KEY = 'cda.theme'
const EVT = 'cda:themechange'

export function getTheme() {
  const v = localStorage.getItem(KEY)
  if (v === 'dark' || v === 'light') return v
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(t) {
  document.documentElement.classList.toggle('dark', t === 'dark')
}

export function setTheme(t) {
  localStorage.setItem(KEY, t)
  applyTheme(t)
  window.dispatchEvent(new CustomEvent(EVT, { detail: t }))
}

export function useTheme() {
  const [t, set] = useState(getTheme)
  useEffect(() => {
    const handler = (e) => set(e.detail)
    window.addEventListener(EVT, handler)
    return () => window.removeEventListener(EVT, handler)
  }, [])
  return [t, setTheme]
}

applyTheme(getTheme())
