/**
 * Reveal.
 *
 * Scroll-reveal wrapper — content performs an energetic enter as it meets the
 * viewport. A generous negative bottom margin means the reveal fires a bit
 * BEFORE the element is fully in view, so nothing stays blank on fast scroll
 * or full-page capture. Under `prefers-reduced-motion` we skip the offset
 * entirely and render fully visible (no whileInView dependency at all).
 *
 * Usage:
 *   <Reveal>...</Reveal>
 *   <Reveal delay={0.1} y={32} className="card">...</Reveal>
 */
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface RevealProps {
  children?: ReactNode
  delay?: number
  y?: number
  className?: string
  style?: CSSProperties
}

export default function Reveal({ children, delay = 0, y = 24, className, style }: RevealProps) {
  const reduce = useReducedMotion()
  // Safety net: if the in-view trigger never fires (headless/full-page capture,
  // hidden tab, no-scroll render) reveal anyway so content is never stuck
  // invisible. Humans scrolling still get the whileInView reveal first.
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 1200)
    return () => clearTimeout(id)
  }, [])
  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      animate={revealed ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
