import { useId } from 'react'
import { HelpCircle } from 'lucide-react'

/**
 * Inline help affordance: a small ⓘ trigger that reveals a short tip on
 * hover and on keyboard focus. The tip text is bound to t.* by the caller.
 * The button is aria-describedby the bubble so screen readers announce it.
 *
 * Props:
 *  - text  : string — the tip copy (bilingual via t.*).
 *  - label : string — accessible name for the trigger (e.g. "More info").
 */
interface HelpTooltipProps {
  /** The tip copy (bilingual via t.*). */
  text: string
  /** Accessible name for the trigger (e.g. "More info"). */
  label: string
}

export default function HelpTooltip({ text, label }: HelpTooltipProps) {
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
