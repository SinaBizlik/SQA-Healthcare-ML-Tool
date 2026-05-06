import { useEffect, useState } from 'react'
import { getDomains, setDomain } from '../utils/api.js'

export default function DomainBar({ domainKey, onChange }) {
  const [domains, setDomains] = useState({})

  useEffect(() => {
    getDomains().then(setDomains).catch(() => {})
  }, [])

  const handleClick = async (key) => {
    if (key === domainKey) return
    try {
      const info = await setDomain(key)
      onChange(key, info.info || domains[key])
    } catch {
      onChange(key, domains[key])
    }
  }

  return (
    <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {Object.entries(domains).map(([key, d]) => (
        <button
          key={key}
          onClick={() => handleClick(key)}
          style={{
            padding: '8px 14px', borderRadius: 999,
            border: `1px solid ${key === domainKey ? 'var(--navy)' : 'var(--line)'}`,
            background: key === domainKey ? 'var(--navy)' : 'var(--white)',
            color: key === domainKey ? '#fff' : 'var(--mid)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            transition: '.15s', fontFamily: 'inherit',
          }}
        >
          {d.icon} {d.label}
        </button>
      ))}
    </div>
  )
}
