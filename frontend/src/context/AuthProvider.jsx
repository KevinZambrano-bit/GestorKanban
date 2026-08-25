import { useState, useEffect } from 'react'
import AuthContext from './AuthContext'
import api from '../services/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    localStorage.setItem('user', JSON.stringify(user))
  }, [user])

  async function login(email, password) {
    setLoading(true)
    try {
      const data = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.access_token)
      setUser(data.user)
      return data
    } finally {
      setLoading(false)
    }
  }

  async function register(name, email, password) {
    setLoading(true)
    try {
      const data = await api.post('/auth/register', { name, email, password })
      localStorage.setItem('token', data.access_token)
      setUser(data.user)
      return data
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
