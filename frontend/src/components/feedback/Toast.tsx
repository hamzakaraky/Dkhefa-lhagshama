import type { ReactNode } from 'react'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'

/** A single transient toast notification (mirrors AppContext's toast shape). */
interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

const ICONS: Record<ToastItem['type'], ReactNode> = {
  success: <CheckCircle size={16} />,
  error:   <AlertCircle size={16} />,
  info:    <Info size={16} />,
  warning: <AlertTriangle size={16} />,
}

export default function ToastContainer() {
  const { toasts, removeToast } = useApp()

  return (
    <div className="toast-container no-print" role="region" aria-live="polite">
      {(toasts as ToastItem[]).map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ flexShrink:0 }}>{ICONS[t.type]}</span>
          <span style={{ flex:1 }}>{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            style={{ background:'none', border:'none', color:'rgba(244,238,224,0.7)', cursor:'pointer', padding:'2px', display:'flex', flexShrink:0 }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}