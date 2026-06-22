import { useId } from 'react'
import { HelpCircle } from 'lucide-react'

/**
 * inline help affordance used across forms/labels: a small help-circle trigger
 * whose tip bubble shows on hover + keyboard focus. presentation (.tooltip /
 * .tooltip-bubble) is global css; this component only wires up markup + a11y.
 * callers pass already-translated copy (text/label come from the shared t.*).
 * invariant: the bubble's id is generated once and referenced by the button's
 * aria-describedby so screen readers announce the tip when the trigger is read.
 */
interface HelpTooltipProps {
  // tip copy, pre-translated by the caller
  text: string
  // accessible name for the icon-only trigger (e.g. "More info")
  label: string
}

export default function HelpTooltip({ text, label }: HelpTooltipProps) {
  // stable per-instance id so aria-describedby and the bubble's id match (ssr-safe)
  const id = useId()
  return (
    <span className="tooltip">
      <button
        type="button"
        className="icon-help"
        aria-label={label}
        aria-describedby={id}
      >
        <HelpCircle size={13} aria-hidden="true" />
      </button>
      <span role="tooltip" id={id} className="tooltip-bubble">{text}</span>
    </span>
  )
}
