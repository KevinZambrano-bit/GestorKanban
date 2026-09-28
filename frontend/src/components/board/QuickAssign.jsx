import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getAvatarUrl } from '../../utils/avatar'

const POPOVER_WIDTH = 248
const GAP = 6

// Los eventos de un portal siguen burbujeando por el árbol de React hasta la
// tarjeta: sin esto, un clic aquí iniciaría el arrastre (listeners de dnd-kit)
// o abriría el modal de detalle (onClick de la tarjeta).
const stop = (e) => e.stopPropagation()
const isolate = {
  onPointerDown: stop,
  onMouseDown: stop,
  onTouchStart: stop,
  onClick: stop,
  onKeyDown: stop,
}

export default function QuickAssign({ taskTitle, members, onAssign }) {
  const [open, setOpen] = useState(false)
  const [assigningId, setAssigningId] = useState(null)
  const [error, setError] = useState('')
  const [position, setPosition] = useState(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const mountedRef = useRef(true)
  const listId = useId()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    setError('')
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  // Posición fija bajo el badge; si no cabe debajo, se abre hacia arriba
  const place = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const height = popoverRef.current?.offsetHeight ?? 240
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8)
    )
    const below = rect.bottom + GAP
    const top =
      below + height > window.innerHeight - 8 && rect.top - GAP - height > 8
        ? rect.top - GAP - height
        : below
    setPosition({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    popoverRef.current?.querySelector('button:not(:disabled)')?.focus()

    const handlePointerDown = (e) => {
      if (
        !popoverRef.current?.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        close(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') close()
    }
    // En captura: el popover y los badges detienen la propagación en React
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, close, place])

  const handleSelect = async (member) => {
    setAssigningId(member.id)
    setError('')
    try {
      await onAssign(member.id)
      // Si todo va bien la tarjeta sale de "Sin asignar" y este componente se
      // desmonta; no hay que cerrar nada
    } catch (err) {
      if (mountedRef.current) setError(err?.message || 'No se pudo asignar la tarea')
    } finally {
      if (mountedRef.current) setAssigningId(null)
    }
  }

  // Flechas arriba/abajo recorren la lista
  const handleListKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const options = [...popoverRef.current.querySelectorAll('.quick-assign-option:not(:disabled)')]
    const index = options.indexOf(document.activeElement)
    const next = e.key === 'ArrowDown' ? index + 1 : index - 1
    options[(next + options.length) % options.length]?.focus()
  }

  const busy = assigningId != null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`kanban-unassigned-badge quick-assign-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Asignar responsable a "${taskTitle}"`}
        {...isolate}
        onClick={(e) => {
          e.stopPropagation()
          if (open) close()
          else setOpen(true)
        }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="5.5" r="2.75" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2 14c.6-2.6 2.6-4 5-4 1 0 1.9.2 2.6.7M12.5 9.5v5M10 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Sin asignar
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            id={listId}
            className="quick-assign-popover"
            role="dialog"
            aria-label="Elegir responsable"
            style={{
              width: POPOVER_WIDTH,
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
            }}
            {...isolate}
            onKeyDown={(e) => {
              e.stopPropagation()
              handleListKeyDown(e)
            }}
          >
            <p className="quick-assign-heading">Asignar a</p>

            {members.length === 0 ? (
              <p className="quick-assign-empty">
                Este proyecto aún no tiene miembros.
              </p>
            ) : (
              <ul className="quick-assign-list">
                {members.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="quick-assign-option"
                      onClick={() => handleSelect(m)}
                      disabled={busy}
                      aria-busy={assigningId === m.id}
                    >
                      <img
                        src={getAvatarUrl(m.email)}
                        alt=""
                        width="24"
                        height="24"
                      />
                      <span className="quick-assign-name">{m.name}</span>
                      {assigningId === m.id ? (
                        <span className="btn-spinner btn-spinner-dark" aria-label="Asignando" />
                      ) : (
                        m.role === 'leader' && (
                          <span className="quick-assign-role">Líder</span>
                        )
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && (
              <p className="error quick-assign-error" role="alert">
                {error}
              </p>
            )}
          </div>,
          document.body
        )}
    </>
  )
}
