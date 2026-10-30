import { useCallback, useEffect, useState } from 'react'
import ThemeContext from './ThemeContext'

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readPreference() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' ? saved : null
}

function readSystemTheme() {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  // `preference` es la eleccion explicita del usuario (null = seguir al SO).
  // `systemTheme` se actualiza en vivo para que cambiar el tema del sistema se
  // refleje mientras no haya eleccion guardada.
  const [preference, setPreference] = useState(readPreference)
  const [systemTheme, setSystemTheme] = useState(readSystemTheme)

  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY)
    const onChange = (e) => setSystemTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme = preference ?? systemTheme

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const setTheme = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, next)
    setPreference(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const value = { theme, isDark: theme === 'dark', setTheme, toggleTheme }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}