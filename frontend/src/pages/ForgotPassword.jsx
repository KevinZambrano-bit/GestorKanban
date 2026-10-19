import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import AuthLayout from '../components/auth/AuthLayout'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // El backend responde igual exista o no la cuenta, así que el mensaje
      // de éxito no revela qué correos están registrados.
      await api.post('/auth/forgot-password', { email: email.trim() })
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout
        title="Revisa tu correo"
        subtitle="Si esa cuenta existe, te enviamos un enlace para cambiar la contraseña."
      >
        <div className="auth-notice">
          <p>
            El enlace es válido durante 30 minutos y solo puede usarse una vez.
            Si no lo ves, revisa la carpeta de spam.
          </p>
        </div>

        <Link to="/login" className="btn btn-primary btn-block">
          Volver al inicio de sesión
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Recupera tu acceso"
      subtitle="Te enviamos un enlace para que elijas una contraseña nueva."
    >
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            autoComplete="email"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? <span className="btn-spinner" aria-hidden="true" /> : 'Enviar enlace'}
        </button>
      </form>

      <p className="auth-switch">
        ¿Recordaste la contraseña? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthLayout>
  )
}
