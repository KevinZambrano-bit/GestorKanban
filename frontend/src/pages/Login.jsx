import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await login(email, password)
      setSuccess('Inicio de sesión exitoso. Redirigiendo...')
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-page">
      <h1>Iniciar sesión</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <button
          type="button"
          className="google-button"
          onClick={() => {
            window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`
          }}
          disabled={loading}
        >
          Continuar con Google
        </button>
      </form>
      <p className="auth-link">
        ¿No tienes una cuenta? <Link to="/register">Crear cuenta</Link>
      </p>
    </div>
  )
}
