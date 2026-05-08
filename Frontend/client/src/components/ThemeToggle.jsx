import { useTheme } from '../lib/theme.js'

export default function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      onClick={() => setTheme(next)}
      className="pixel-label hover:underline"
      title={`Switch to ${next} mode`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? 'LIGHT' : 'DARK'}
    </button>
  )
}
