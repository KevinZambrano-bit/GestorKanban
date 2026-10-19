import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import AuthLayout from '../components/auth/AuthLayout'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Sin token no hay nada que enviar: el enlace del correo llega con él.
  if (!token) {
    return (
      <AuthLayout
        title="Enlace no válido"
        subtitle="Falta el token en el enlace que abriste."
      >
        <p className="error">Solicita un enlace nuevo para continuar.</p>
        <Link to="/forgot-password" className="btn btn-primary btn-block">
          Solicitar un enlace
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Elige una nueva contraseña"
      subtitle="Mínimo 8 caracteres."
    >
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Nueva contraseña
          <div className="input-with-action">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.84 2.84M9.88 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a13.16 13.16 0 0 1-2.67 3.68M6.61 6.61C4.13 8.14 1 12 1 12s4 8 11 8a9.77 9.77 0 0 0 5.39-1.61" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        <label>
          Repite la contraseña
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? <span className="btn-spinner" aria-hidden="true" /> : 'Guardar contraseña'}
        </button>
      </form>
    </AuthLayout>
  )
}
