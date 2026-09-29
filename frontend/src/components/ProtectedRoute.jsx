import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import Landing from '../pages/Landing'

export default function ProtectedRoute() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  if (!user) {
    // La raíz "/" es la landing pública; el resto de rutas privadas van al login
    return pathname === '/' ? <Landing /> : <Navigate to="/login" replace />
  }

  return <Outlet />
}
