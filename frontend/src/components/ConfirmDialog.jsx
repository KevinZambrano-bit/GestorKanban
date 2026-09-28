import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Reemplazo de window.confirm: onConfirm puede ser async; si lanza, el error
// se muestra dentro del modal y los botones se reactivan. El padre cierra el
// dialogo (desmontándolo) cuando la acción termina bien.
export default function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  const confirmRef = useRef(null)
  const mountedRef = useRef(true)
  const pressedOverlayRef = useRef(false)
  const titleId = useId()
  const messageId = useId()
  const isDanger = variant === 'danger'

  // Foco inicial: en borrados, el botón seguro (Cancelar); si no, Confirmar.
  // Al cerrar, el foco vuelve al elemento que abrió el diálogo.
  useEffect(() => {
    mountedRef.current = true
    const previous = document.activeElement
    ;(isDanger ? cancelRef : confirmRef).current?.focus()
    return () => {
      mountedRef.current = false
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [isDanger])

  const handleCancel = () => {
    if (!processing) onCancel()
  }

  const handleConfirm = async () => {
    setProcessing(true)
    setError('')
    try {
      await onConfirm()
    } catch (err) {
      if (mountedRef.current) setError(err?.message || 'No se pudo completar la acción')
    } finally {
      if (mountedRef.current) setProcessing(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      handleCancel()
      return
    }
    // Mantiene el foco dentro del diálogo
    if (e.key === 'Tab') {
      const focusables = dialogRef.current.querySelectorAll('button:not(:disabled)')
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  return createPortal(
    <div
      className="modal-overlay confirm-overlay"
      onMouseDown={(e) => {
        // Solo cierra si el clic empezó y terminó en el overlay (no al soltar
        // una selección de texto iniciada dentro de la tarjeta)
        pressedOverlayRef.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (pressedOverlayRef.current && e.target === e.currentTarget) handleCancel()
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className={`confirm-dialog confirm-${isDanger ? 'danger' : 'default'}`}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <div className="confirm-icon" aria-hidden="true">
          {isDanger ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 6h12M8 6V4.5A1 1 0 0 1 9 3.5h2a1 1 0 0 1 1 1V6m-6.5 0 .7 9.1a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4L14.5 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10 6.5v4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="10" cy="13.75" r="1" fill="currentColor" />
            </svg>
          )}
        </div>

        <div className="confirm-body">
          <h2 id={titleId}>{title}</h2>
          <div id={messageId} className="confirm-message">
            {message}
          </div>
          {error && (
            <p className="error confirm-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn"
            onClick={handleCancel}
            disabled={processing}
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${isDanger ? 'btn-danger-solid' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={processing}
            aria-busy={processing}
          >
            {processing ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
