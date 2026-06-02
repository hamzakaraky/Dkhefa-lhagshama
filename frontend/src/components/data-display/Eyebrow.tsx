import type { HTMLAttributes, ReactNode } from 'react'

interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode
  className?: string
}

export default function Eyebrow({ children, className = '', ...rest }: EyebrowProps) {
  return (
    <span className={`eyebrow ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}
