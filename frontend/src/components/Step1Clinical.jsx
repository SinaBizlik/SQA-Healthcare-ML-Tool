import { useEffect, useState } from 'react'
import { getDomains, setDomain } from '../utils/api.js'
import { Card, CardTitle, ScreenHeader, Btn } from './ui.jsx'

export default function Step1Clinical({ domainKey, onDomainChange, onContinue }) {
  const [domains, setDomains] = useState({})
  const [selected, setSelected] = useState(domainKey)
  const [info, setInfo] = useState(null)

  useEffect(() => {
    getDomains().then(d => {
      setDomains(d)
      setInfo(d[domainKey])
    })
  }, [])

  const pick = async (key) => {
    setSelected(key)
    try {
      const res = await setDomain(key)
      const i = res.info || domains[key]
      setInfo(i)
      onDomainChange(key, i)
    } catch {
      setInfo(domains[key])
      onDomainChange(key, domains[key])
    }
  }

  const domain = info || domains[selected]

  return (
    <div className="fade-in">
      <ScreenHeader
        step={1}
        title="Select Clinical Domain"
        description="Choose the medical specialty for your ML analysis. All feature names, labels, and clinical guidance will update to match your selected domain."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'start' }}>
        {/* Domain grid */}
        <Card>
          <CardTitle>Available Clinical Domains</CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {Object.entries(domains).map(([key, d]) => (
              <button
                key={key}
                onClick={() => pick(key)}
                style={{
                  padding: '14px 12px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                  border: `2px solid ${key === selected ? 'var(--blue)' : 'var(--line)'}`,
                  background: key === selected ? 'var(--sky)' : 'var(--white)',
                  transition: '.15s', fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{d.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{d.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }}>{d.description?.slice(0, 50)}…</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Domain details */}
        <div>
          {domain && (
            <Card>
              <CardTitle>Domain Details</CardTitle>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{domain.icon}</div>
              <h3 style={{ fontFamily: 'Fraunces,Georgia,serif', fontSize: 18, fontWeight: 600, color: 'var(--navy)' }}>
                {domain.label}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 6, lineHeight: 1.5 }}>{domain.description}</p>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                  Prediction Target
                </div>
                <div style={{
                  padding: '8px 12px', borderRadius: 10,
                  background: 'var(--sky)', border: '1px solid var(--line)',
                  fontSize: 13, fontWeight: 600, color: 'var(--navy)'
                }}>
                  🎯 {domain.target}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                  Clinical Features
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(domain.features || []).map(f => (
                    <span key={f} style={{
                      padding: '4px 10px', borderRadius: 999,
                      background: 'var(--mint)', border: '1px solid #A7F3D0',
                      fontSize: 11, color: 'var(--good)', fontWeight: 500
                    }}>{f}</span>
                  ))}
                </div>
              </div>

              <div className="banner-info" style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>🩺 Clinical Sense-Check</div>
                <p style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.5 }}>{domain.sense_check}</p>
              </div>
            </Card>
          )}

          <div style={{ marginTop: 12 }}>
            <Btn onClick={onContinue} style={{ width: '100%', justifyContent: 'center' }}>
              Continue to Data Upload →
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}
