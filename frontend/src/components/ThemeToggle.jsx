import useTheme from '../hooks/useTheme'

const SUN = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" />
  </svg>
)

const MOON = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a7 7 0 0 0 10.8 10.8z" />
  </svg>
)

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme()
  const label = isDark ? 'Usar tema claro' : 'Usar tema oscuro'

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      {isDark ? SUN : MOON}
    </button>
  )
}