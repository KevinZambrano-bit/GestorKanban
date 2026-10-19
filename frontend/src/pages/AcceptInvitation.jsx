import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import useAuth from '../hooks/useAuth'
import { getAvatarUrl } from '../utils/avatar'

export default function AcceptInvitation() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [invitation, setInvitation] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [loading, setLoading] = useState(false)

  // Los datos de la invitación son públicos: se piden antes de iniciar
  // sesión para poder mostrar a qué proyecto te invitaron.
  useEffect(() => {
    let cancelled = false
    api
      .get(`/invitations/${token}`)
      .then((data) => {
        if (!cancelled) setInvitation(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleAccept = async () => {
    setActionError('')
    setLoading(true)
    try {
      const data = await api.post(`/invitations/${token}/accept`)
      navigate(`/projects/${data.projectId}`, { replace: true })
    } catch (err) {
      setActionError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadError) {
    return (
      <main className="centered-page">
        <p className="error">{loadError}</p>
        <Link to="/projects">Ir a mis proyectos</Link>
      </main>
    )
  }

  if (!invitation) {
    return <main className="centered-page"><p className="loading">Cargando invitación...</p></main>
  }

  const roleLabel = invitation.role === 'leader' ? 'líder' : 'miembro'

  return (
    <main className="centered-page">
      <div className="invite-card">
        <p className="invite-kicker">Invitación a proyecto</p>
        <h1 className="invite-title">{invitation.projectName}</h1>
        <p className="invite-text">
          <strong>{invitation.inviterName}</strong> te invitó como{' '}
          <strong>{roleLabel}</strong>. Al aceptar te unas al tablero y podrás
          mover tareas y generar subtareas con IA.
        </p>

        {actionError && <p className="error">{actionError}</p>}

        {user ? (
          <>
            <p className="invite-text">
              Estás entrando como <strong>{user.name}</strong>{' '}
              <span className="invite-avatar">
                <img src={getAvatarUrl(user.email)} alt="" width="24" height="24" />
              </span>
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleAccept}
              disabled={loading}
            >
              {loading ? <span className="btn-spinner" aria-hidden="true" /> : 'Aceptar invitación'}
            </button>
          </>
        ) : (
          <>
            <p className="invite-text invite-hint">
              Esta invitación es para <strong>{invitation.email}</strong>. Inicia
              sesión con esa cuenta o créala para entrar al proyecto.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleAccept}
              disabled={loading}
            >
              {loading ? <span className="btn-spinner" aria-hidden="true" /> : 'Continuar'}
            </button>
            <Link
              to={`/login?invitacion=${token}`}
              className="btn btn-block"
            >
              Iniciar sesión
            </Link>
            <Link
              to={`/register?invitacion=${token}&email=${encodeURIComponent(invitation.email)}`}
              className="btn btn-block"
            >
              Crear mi cuenta
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
