import { useState, useEffect } from 'react'

export default function Navbar({ domainInfo, domainKey, onReset }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  // Apply domain palette class to body
  useEffect(() => {
    const body = document.body
    // Remove all domain classes
    body.className = body.className.replace(/domain-\S+/g, '').trim()
    if (domainKey) body.classList.add(`domain-${domainKey}`)
  }, [domainKey])

  return (
    <nav style={{
      background: 'var(--navy)', position: 'sticky', top: 0, zIndex: 100,
      padding: '0 20px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 16, height: 56,
      boxShadow: '0 2px 12px rgba(13,35,64,.25)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg,#0E9E8E,#1A6B9A)',
          display: 'grid', placeItems: 'center',
          fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, fontSize: 16, color: '#fff'
        }}>H</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '.01em' }}>HEALTH-AI</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 1 }}>ML Learning Tool for Healthcare</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {domainInfo && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 999,
            border: '1px solid rgba(255,255,255,.18)',
            background: 'rgba(255,255,255,.08)',
            fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.8)'
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: '#0E9E8E', display: 'inline-block' }} />
            <span>{domainInfo.icon} <b style={{ color: '#fff' }}>{domainInfo.label}</b></span>
          </div>
        )}

        {/* Dark/Light mode toggle */}
        <button
          onClick={() => setDark(d => !d)}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid rgba(255,255,255,.18)',
            background: 'rgba(255,255,255,.1)', color: '#fff',
            fontSize: 16, cursor: 'pointer', display: 'grid', placeItems: 'center',
            transition: '.15s',
          }}
        >
          {dark ? '☀️' : '🌙'}
        </button>

        <button
          onClick={onReset}
          style={{
            padding: '8px 14px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,.18)',
            background: 'rgba(255,255,255,.1)', color: '#fff',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >↺ Reset Pipeline</button>
      </div>
    </nav>
  )
}
