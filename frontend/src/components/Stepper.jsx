export default function Stepper({ steps, current, doneUpTo, onGo }) {
  return (
    <div style={{
      marginTop: 14,
      display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8,
      background: 'var(--white)', border: '1px solid var(--line)',
      borderRadius: 20, padding: 12,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {steps.map(s => {
        const done   = s.n <= doneUpTo
        const active = s.n === current
        const locked = s.n > doneUpTo + 1

        return (
          <button
            key={s.n}
            onClick={() => !locked && onGo(s.n)}
            disabled={locked}
            style={{
              borderRadius: 14, padding: '10px',
              border: `1px solid ${active ? 'var(--blue)' : done ? 'var(--teal)' : 'var(--line)'}`,
              background: active ? 'var(--sky)' : done ? 'var(--mint)' : 'var(--white)',
              cursor: locked ? 'default' : 'pointer',
              textAlign: 'left', display: 'flex', gap: 10, alignItems: 'flex-start',
              opacity: locked ? 0.45 : 1, transition: '.12s', fontFamily: 'inherit',
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 10, flexShrink: 0,
              background: active ? 'var(--navy)' : done ? 'var(--mint)' : 'var(--paper)',
              border: `1px solid ${active ? 'var(--navy)' : done ? 'var(--teal)' : 'var(--line)'}`,
              display: 'grid', placeItems: 'center',
              fontSize: 12, fontWeight: 600,
              color: active ? '#fff' : done ? 'var(--teal)' : 'var(--muted)',
            }}>
              {done ? '✓' : s.n}
            </div>
            <div>
              <b style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{s.short}</b>
              <small style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginTop: 2, lineHeight: 1.25 }}>{s.label}</small>
            </div>
          </button>
        )
      })}
    </div>
  )
}
