import { useEffect, useRef, useState } from 'react'
import { Upload, CheckCircle, X, FileText } from 'lucide-react'
import { uploadAttachment } from '../lib/storage'
import { sanitizeFilename } from '../utils/sanitizeFilename' // #96

/**
 * UploadArea — drag-drop or click-to-pick a single file, upload to Firebase
 * Storage under `requests/{requestId}/{filename}`, show a progress bar, and
 * report the resulting Storage path to the parent via `onUpload`.
 *
 * Props:
 *  - label, hint, formats, required, error  — visual labels (same as prototype)
 *  - requestId  — REQUIRED for real uploads. If null/undefined, the upload is
 *                 simulated (legacy prototype behavior) so the page is still
 *                 testable in isolation.
 *  - onUpload   — called with ({ file, path, downloadURL }) on success, or
 *                 `null` when the user removes the file. The parent should
 *                 push `path` into the request's `attachmentPaths[]`.
 */
export default function UploadArea({ label, hint, formats, required, onUpload, error, requestId }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [percent, setPercent] = useState(0)
  const [errMsg, setErrMsg] = useState('')
  const [dragging, setDragging] = useState(false)
  const handleRef = useRef(null)

  // Cancel an in-flight upload if the component unmounts.
  useEffect(() => () => { if (handleRef.current) handleRef.current.cancel() }, [])

  // #84 — client-side MIME allowlist (mirrors server + storage.rules)
  const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])

  const handleFile = async (rawFile) => {
    if (!rawFile) return
    setErrMsg('')

    // #96 — sanitize filename before processing so the sanitized name is used
    // consistently in both the UI display and the Storage path.
    const safeName = sanitizeFilename(rawFile.name)
    // Reconstruct a File with the sanitized name (browser File is immutable).
    const f = new File([rawFile], safeName, { type: rawFile.type })

    // No requestId → simulate (keeps Storybook-style isolation working).
    if (!requestId) {
      setUploading(true)
      setTimeout(() => {
        setUploading(false); setFile(f)
        if (onUpload) onUpload({ file: f, path: '', downloadURL: '' })
      }, 600)
      return
    }

    // #84 — Client-side MIME allowlist check.
    if (!ALLOWED_TYPES.has(f.type)) {
      setErrMsg('Only JPEG, PNG, PDF, or DOCX files are allowed.')
      return
    }

    // Client-side size guard (matches storage.rules — 10MB).
    if (f.size > 10 * 1024 * 1024) {
      setErrMsg('File too large (max 10MB).')
      return
    }

    setUploading(true)
    setPercent(0)
    try {
      const handle = uploadAttachment(f, requestId)
      handleRef.current = handle
      const unsub = handle.onProgress(setPercent)
      const result = await handle.done
      unsub()
      handleRef.current = null
      setFile(f)
      if (onUpload) onUpload({ file: f, path: result.path, downloadURL: result.downloadURL })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[UploadArea] upload failed:', err)
      setErrMsg('Upload failed — please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const remove = (e) => {
    e.stopPropagation()
    if (handleRef.current) { handleRef.current.cancel(); handleRef.current = null }
    setFile(null); setPercent(0); setErrMsg('')
    if (onUpload) onUpload(null)
  }

  const inputId = `file-${label}`
  const openPicker = () => document.getElementById(inputId).click()

  // ── Uploaded state: compact file card with remove ──
  if (file && !uploading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
        padding: 'var(--sp-3) var(--sp-4)', border: '1px solid var(--success)',
        background: 'var(--success-soft)', borderRadius: 'var(--radius)',
      }}>
        <div aria-hidden="true" style={{
          width: 38, height: 38, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle size={20} color="var(--success)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>{(file.size / 1024).toFixed(0)} KB</div>
        </div>
        <button type="button" onClick={remove} aria-label={`Remove ${file.name}`} className="btn btn-ghost btn-sm" style={{ padding: 'var(--sp-2)' }}>
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        className={`upload-area${dragging ? ' is-dragging' : ''}`}
        onClick={openPicker}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label={label}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker() } }}
        style={dragging ? { borderColor: 'var(--ember)', background: 'var(--ember-soft)' } : undefined}
      >
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)', width: '100%' }}>
            <div className="spinner-ring" aria-hidden="true" />
            <span style={{ fontSize: '13.5px', color: 'var(--gray-600)' }}>
              {percent ? `${percent.toFixed(0)}%` : ''}
            </span>
            <div style={{ width: '80%', height: 6, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${percent.toFixed(0)}%`, height: '100%', background: 'var(--ink)', transition: 'width 0.15s linear' }} />
            </div>
          </div>
        ) : (
          <>
            <div aria-hidden="true" style={{
              width: 48, height: 48, borderRadius: 'var(--radius)', margin: '0 auto var(--sp-3)',
              background: 'var(--white)', border: '1px solid var(--hair)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={20} color="var(--gray-600)" />
            </div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', marginBottom: 'var(--sp-1)' }}>
              {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: 'var(--sp-1)' }}>{hint}</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <FileText size={12} /> {formats}
            </div>
          </>
        )}
      </div>
      {(errMsg || error) && (
        <div className="form-error" style={{ marginTop: 'var(--sp-2)' }}>
          <span>{errMsg || error}</span>
        </div>
      )}
      <input
        type="file"
        id={inputId}
        accept=".jpg,.jpeg,.png,.pdf,.docx"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <style>{`
        .spinner-ring { width: 32px; height: 32px; border: 3px solid var(--gray-200); border-top-color: var(--ink); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (prefers-reduced-motion: reduce) { .spinner-ring { animation-duration: 1.6s; } }
      `}</style>
    </div>
  )
}
