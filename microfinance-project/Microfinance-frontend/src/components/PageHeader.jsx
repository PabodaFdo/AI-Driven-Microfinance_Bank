/**
 * PageHeader - Standardized page title/subtitle section
 * Used across all main pages for visual consistency
 */

const C = {
  primary: "var(--primary)",
  ink: "var(--text)",
  inkMid: "var(--text-muted)",
  primarySoft: "var(--primary-soft)",
};

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  style = {},
}) {
  return (
    <div
      style={{
        marginBottom: 32,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {/* Left side: Icon + Text group */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Icon (optional) */}
        {icon && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 12,
              background: C.primarySoft,
              color: C.primary,
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {icon}
          </div>
        )}

        {/* Text group: Title + Subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: C.ink,
              margin: 0,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h1>

          {/* Subtitle (optional) */}
          {subtitle && (
            <p
              style={{
                fontSize: '1.05rem',
                fontWeight: 500,
                color: C.inkMid,
                margin: '0.5rem 0 0',
                lineHeight: 1.4,
                maxWidth: 700,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side: Actions (optional) */}
      {actions && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
