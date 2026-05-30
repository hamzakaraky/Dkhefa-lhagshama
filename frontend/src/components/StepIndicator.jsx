import { Check } from 'lucide-react'

// API preserved: { steps: string[], currentStep: number (1-indexed) }
export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="stepper" role="list" aria-label="Progress">
      {steps.map((label, i) => {
        const num = i + 1
        const isDone = num < currentStep
        const isActive = num === currentStep
        const state = isDone ? 'is-done' : isActive ? 'is-active' : 'is-upcoming'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: i < steps.length - 1 ? '1 1 auto' : '0 0 auto' }}>
            <div className={`stepper-node ${state}`} role="listitem" aria-current={isActive ? 'step' : undefined}>
              <span className="stepper-dot" aria-hidden="true">
                {isDone ? <Check size={16} strokeWidth={3} /> : num}
              </span>
              <span className="stepper-label">{label}</span>
            </div>
            {i < steps.length - 1 && (
              <span className={`stepper-rail ${isDone ? 'is-done' : ''}`} aria-hidden="true" />
            )}
          </div>
        )
      })}
    </div>
  )
}
