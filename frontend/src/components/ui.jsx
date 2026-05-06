export function Card({ children, style = {}, className = '' }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--white)', border: '1px solid var(--line)',
        borderRadius: 20, padding: 16, boxShadow: 'var(--shadow-sm)',
        ...style
      }}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: 'var(--muted)',
      textTransform: 'uppercase', letterSpacing: '.10em', marginBottom: 12
    }}>
      {children}
    </div>
  )
}

export function ScreenHeader({ step, title, description, right }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--line)',
      borderRadius: 20, padding: '18px 20px',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 12
    }}>
      <div>
        <div style={{
          display: 'inline-block', padding: '4px 12px', borderRadius: 999,
          background: 'var(--sky)', border: '1px solid var(--line)',
          fontSize: 11, fontWeight: 600, color: 'var(--blue)', letterSpacing: '.04em',
          marginBottom: 6
        }}>STEP {step}</div>
        <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.2 }}>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 6, maxWidth: 860, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

export function Btn({ children, onClick, variant = 'primary', disabled = false, style = {}, size = 'md' }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    borderRadius: size === 'sm' ? 8 : 12,
    fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: size === 'sm' ? 12 : 14, fontFamily: 'inherit',
    transition: '.15s', border: 'none', opacity: disabled ? 0.5 : 1,
    padding: size === 'sm' ? '6px 12px' : '10px 20px',
  }
  const variants = {
    primary: { background: 'var(--navy)', color: '#fff' },
    teal:    { background: 'var(--teal)', color: '#fff' },
    outline: { background: 'transparent', color: 'var(--navy)', border: '1px solid var(--line)' },
    danger:  { background: 'var(--bad)', color: '#fff' },
    ghost:   { background: 'var(--paper)', color: 'var(--mid)', border: '1px solid var(--line)' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

export function MetricBadge({ value, suffix = '%', label }) {
  const num = typeof value === 'number' ? value : parseFloat(value)
  const color = num >= 70 ? 'var(--good)' : num >= 50 ? 'var(--warn)' : 'var(--bad)'
  const bg = num >= 70 ? 'var(--good-bg)' : num >= 50 ? 'var(--warn-bg)' : 'var(--bad-bg)'
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 26, fontWeight: 700, color,
        background: bg, borderRadius: 12, padding: '8px 16px',
        display: 'inline-block', minWidth: 80
      }}>
        {isNaN(num) ? value : num}{suffix}
      </div>
      {label && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{label}</div>}
    </div>
  )
}

export function Spinner({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `3px solid var(--line)`,
      borderTop: `3px solid var(--blue)`,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

// Add spin keyframe via a style tag trick
if (typeof document !== 'undefined' && !document.getElementById('spin-style')) {
  const s = document.createElement('style')
  s.id = 'spin-style'
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
  document.head.appendChild(s)
}
