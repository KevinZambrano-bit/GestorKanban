import { Outlet, useLocation } from 'react-router-dom'
import AppHeader from './AppHeader'
import HeaderTabsProvider from '../../context/HeaderTabsProvider'

export default function AppLayout() {
  const location = useLocation()
  // El tablero del proyecto ocupa todo el ancho disponible para poder usar
  // fuentes más grandes sin penalizar el espacio usable.
  const isProjectDetail = /^\/projects\/\d+/.test(location.pathname)

  return (
    <div className="app-shell">
      <HeaderTabsProvider>
        <AppHeader />
        <main className={`app-content${isProjectDetail ? ' app-content--wide' : ''}`}>
          <Outlet />
        </main>
      </HeaderTabsProvider>
    </div>
  )
}