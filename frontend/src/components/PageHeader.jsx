import SectionHeader from './SectionHeader';

/**
 * Legacy PageHeader API. Internally composes SectionHeader so old call sites
 * keep working. Props: { title, subtitle, eyebrow?, center?, children? }
 */
export default function PageHeader({ title, subtitle, eyebrow, center = true, children }) {
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
