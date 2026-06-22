/*
 * Modal.tsx — the app's single global modal surface.
 * Renders whatever `modal` payload AppContext currently holds (set via openModal/closeModal),
 * portaled to document.body so it escapes parent stacking/overflow. There is exactly one of
 * these mounted app-wide; any feature opens a dialog by pushing content into context, not by
 * rendering its own modal. Closes on overlay click or Escape, and locks body scroll while open.
 * Visual chrome uses global `modal-*` classes; only title/close-button get module-scoped styles.
 */
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import styles from './Modal.module.css'

/** Object payload this Modal renders (richer than the bare ReactNode the context types). */
interface ModalContent {
  title?: ReactNode
  content?: ReactNode
  footer?: ReactNode
}

// global modal host; reads the active payload from AppContext and renders nothing when none is set.
export default function Modal() {
  const { modal: rawModal, closeModal } = useApp()
  // context types modal as a bare ReactNode; we actually pass a {title,content,footer} object.
  const modal = rawModal as ModalContent | null

  // while open: Escape closes, and body scroll is locked. cleanup restores both, so the effect
  // re-runs on every modal change (open/close/swap) and never leaves a stuck overflow:hidden.
  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [modal, closeModal])

  if (!modal) return null

  return createPortal(
    // close only on a true backdrop click (target === overlay), not on clicks bubbling from the box.
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="modal-box" role="dialog" aria-modal="true">
        {modal.title && (
          <div className="modal-header">
            <h3 className={styles.title}>{modal.title}</h3>
            <button onClick={closeModal} className={`btn btn-ghost btn-sm ${styles.closeBtn}`}>
              <X size={18} />
            </button>
          </div>
        )}
        <div className="modal-body">{modal.content}</div>
        {modal.footer && <div className="modal-footer">{modal.footer}</div>}
      </div>
    </div>,
    document.body,
  )
}