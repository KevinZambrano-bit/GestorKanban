import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export default function OAuthCallback() {
  const { loginWithGoogleToken } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [error, setError] = useState(() => (
    token ? '' : 'No se recibió el token de Google'
  ))

  useEffect(() => {
    if (!token) return

    loginWithGoogleToken(token)
      .then(() => {
        // Si se inició sesión desde una invitación, volvemos a ella para
        // poder aceptarla.
        const pendingInvitation = localStorage.getItem('pendingInvitation')
        if (pendingInvitation) {
          localStorage.removeItem('pendingInvitation')
          navigate(`/invitacion/${pendingInvitation}`, { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      })
      .catch((authError) => setError(authError.message))
  }, [loginWithGoogleToken, navigate, token])

  if (error) {
    return (
      <main className="centered-page">
        <p className="error">{error}</p>
        <button type="button" onClick={() => navigate('/login', { replace: true })}>
          Volver al login
        </button>
      </main>
    )
  }

  return <main className="centered-page"><p>Completando inicio de sesión...</p></main>
}