import type { ReactNode } from 'react';
import SectionHeader from '@/components/data-display/SectionHeader';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  center?: boolean;
  children?: ReactNode;
}

/**
 * Legacy PageHeader API. Internally composes SectionHeader so old call sites
 * keep working. Props: { title, subtitle, eyebrow?, center?, children? }
 */
export default function PageHeader({ title, subtitle, eyebrow, center = true, children }: PageHeaderProps) {
  return (
    <div style={{ padding: '64px 0 32px', background: 'var(--sky-2)' }}>
      <div className="page-container">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          lede={subtitle}
          center={center}
        />
        {children}
      </div>
    </div>
  );
}
