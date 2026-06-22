/**
 * Neutral loading state shown by route gates while auth resolves or while a
 * redirect lands. Centralises the gate's no-flicker placeholder so all gates
 * look identical and a non-permitted user never sees a dead-end flash.
 */
export default function GateLoading({ label }: { label: string }) {
  return (
    <div className="admin-gate-msg" role="status" aria-live="polite">
      <span className="skeleton skeleton-title" style={{ width: '14rem' }} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
