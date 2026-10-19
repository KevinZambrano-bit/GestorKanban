import { useState } from 'react'
import HeaderTabsContext from './HeaderTabsContext'

// Expone el elemento donde el header aloja las pestañas de la página activa
// (p.ej. Tablero/Detalle/Miembros de un proyecto). Cada página renderiza su
// contenido ahí vía createPortal, así el tab no vive en AppLayout.
export default function HeaderTabsProvider({ children }) {
  const [slot, setSlot] = useState(null)

  return (
    <HeaderTabsContext.Provider value={{ slot, setSlot }}>
      {children}
    </HeaderTabsContext.Provider>
  )
}