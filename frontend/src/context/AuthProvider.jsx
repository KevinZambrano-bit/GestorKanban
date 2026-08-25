import { useState, useEffect, useCallback } from 'react'
import AuthContext from './AuthContext'
import api from '../services/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      localStorage.removeItem('user')
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      if (!localStorage.getItem('token')) {
        setLoading(false)
        return
      }

      try {
        const profile = await api.get('/auth/profile')
        if (!cancelled) setUser(profile)
      } catch {
        if (!cancelled) {
          localStorage.removeItem('token')
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user))
    else localStorage.removeItem('user')
  }, [user])

  const saveTokenAndLoadProfile = useCallback(async (accessToken) => {
    if (!accessToken) throw new Error('No se recibió un token de autenticación')
    localStorage.setItem('token', accessToken)
    const profile = await api.get('/auth/profile')
    setUser(profile)
    return profile
  }, [])

  async function login(email, password) {
    setLoading(true)
    try {
      const data = await api.post('/auth/login', { email, password })
      const profile = await saveTokenAndLoadProfile(data.access_token)
      return { ...data, user: profile }
    } finally {
      setLoading(false)
    }
  }

  async function register(name, email, password) {
    setLoading(true)
    try {
      const data = await api.post('/auth/register', { name, email, password })
      const profile = await saveTokenAndLoadProfile(data.access_token)
      return { ...data, user: profile }
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const loginWithGoogleToken = useCallback(async (accessToken) => {
    setLoading(true)
    try {
      return await saveTokenAndLoadProfile(accessToken)
    } catch (error) {
      localStorage.removeItem('token')
      setUser(null)
      throw error
    } finally {
      setLoading(false)
    }
  }, [saveTokenAndLoadProfile])

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogleToken, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
