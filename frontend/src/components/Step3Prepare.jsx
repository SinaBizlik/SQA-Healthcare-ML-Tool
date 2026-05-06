import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'
import { prepareData } from '../utils/api.js'
import { Card, CardTitle, ScreenHeader, Btn, Spinner } from './ui.jsx'

/* ── tiny toggle switch ───────────────────────────────────────────── */
function Toggle({ checked, onChange, label, hint }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 999, flexShrink: 0, marginTop: 2,
          background: checked ? 'var(--teal)' : 'var(--line)',
          position: 'relative', cursor: 'pointer', transition: '.2s',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 999, background: '#fff',
          position: 'absolute', top: 3,
          left: checked ? 23 : 3, transition: '.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,.2)',
        }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
    </label>
  )
}

/* ── select ───────────────────────────────────────────────────────── */
function Sel({ value, onChange, options, label }) {
  return (
    <div>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mid)', marginBottom: 5, letterSpacing: '.03em', textTransform: 'uppercase' }}>
          {label}
        </div>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10,
          border: '1px solid var(--line)', background: 'var(--white)',
          fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
          outline: 'none',
        }}
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

/* ── class balance bar chart ─────────────────────────────────────── */
function BalanceChart({ before, after }) {
  if (!before || !after) return null

  // Build chart data: one bar group per class
  const allCls = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort()
  const data = allCls.map(cls => ({
    name: `Class ${cls}`,
    Before: before[cls] || 0,
    After:  after[cls]  || 0,
  }))

  return (
    <Card style={{ marginTop: 12 }}>
      <CardTitle>Class Distribution — Before vs After</CardTitle>
      <p style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 12 }}>
        Number of patients per class before and after data preparation (including SMOTE if applied).
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--mid)' }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="Before" fill="#1A6B9A" radius={[4, 4, 0, 0]} name="Before" />
          <Bar dataKey="After"  fill="#0E9E8E" radius={[4, 4, 0, 0]} name="After" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

/* ── normalisation comparison chart ─────────────────────────────── */
function NormChart({ data, metric }) {
  if (!data || data.length === 0) return null
  const beforeKey = metric === 'mean' ? 'before_mean' : 'before_std'
  const afterKey  = metric === 'mean' ? 'after_mean'  : 'after_std'
  const title = metric === 'mean' ? 'Feature Means — Before vs After Normalisation'
                                  : 'Feature Spread (Std Dev) — Before vs After'
  return (
    <Card style={{ marginTop: 12 }}>
      <CardTitle>{title}</CardTitle>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 70 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis
            dataKey="feature"
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
            angle={-40}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(2)} />
          <Tooltip
            contentStyle={{ borderRadius: 10, fontSize: 12 }}
            formatter={v => [v.toFixed(4)]}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
          <Bar dataKey={beforeKey} name="Before" fill="#A05C00" radius={[4, 4, 0, 0]} />
          <Bar dataKey={afterKey}  name="After"  fill="#0D7A50" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

/* ── main component ──────────────────────────────────────────────── */
export default function Step3Prepare({ uploadInfo, onDone }) {
  const [norm,      setNorm]      = useState('standard')
  const [missing,   setMissing]   = useState('mean')
  const [smote,     setSmote]     = useState(false)
  const [testSize,  setTestSize]  = useState(20)
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState('')
  const [chartTab,  setChartTab]  = useState('mean')  // mean | std | balance

  const handlePrepare = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await prepareData({
        normalization:  norm,
        handle_missing: missing,
        apply_smote:    smote,
        test_size:      testSize / 100,
      })
      setResult(r)
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Preparation failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  /* helpers */
  const beforeBalance = result?.before?.class_balance
  const afterBalance  = result?.after?.class_balance
  const normChart     = result?.norm_chart_data

  return (
    <div className="fade-in">
      <ScreenHeader
        step={3}
        title="Data Preparation"
        description="Configure missing value handling, normalisation method, and class balancing. Review before/after comparisons to understand the impact on your data."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14, alignItems: 'start' }}>

        {/* ── Left: settings ── */}
        <div>
          <Card>
            <CardTitle>Preparation Settings</CardTitle>

            <Sel
              label="Missing Value Strategy"
              value={missing}
              onChange={setMissing}
              options={[
                ['mean',   'Replace with column mean'],
                ['median', 'Replace with column median'],
                ['drop',   'Remove rows with missing values'],
              ]}
            />

            <div style={{ marginTop: 14 }}>
              <Sel
                label="Normalisation Method"
                value={norm}
                onChange={setNorm}
                options={[
                  ['standard', 'Standard Scaling (Z-score)'],
                  ['minmax',   'Min-Max Scaling (0 – 1 range)'],
                  ['none',     'No normalisation'],
                ]}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mid)', marginBottom: 5, letterSpacing: '.03em', textTransform: 'uppercase' }}>
                Train / Test Split: {100 - testSize}% / {testSize}%
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="range" min={10} max={40} step={5} value={testSize}
                  onChange={e => setTestSize(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{
                  minWidth: 44, textAlign: 'center', fontSize: 13, fontWeight: 600,
                  color: 'var(--navy)', background: 'var(--sky)',
                  border: '1px solid var(--line)', borderRadius: 8, padding: '4px 8px',
                }}>{testSize}%</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Training: ~{Math.round((uploadInfo?.n_rows ?? 304) * (100 - testSize) / 100)} patients &nbsp;·&nbsp;
                Testing: ~{Math.round((uploadInfo?.n_rows ?? 304) * testSize / 100)} patients
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Toggle
                checked={smote}
                onChange={setSmote}
                label="Apply SMOTE Balancing"
                hint="Synthetically oversample the minority class to improve class balance."
              />
            </div>

            <Btn
              onClick={handlePrepare}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}
            >
              {loading ? <><Spinner size={16} />&nbsp;Processing…</> : '⚙️ Apply Preparation'}
            </Btn>

            {error && (
              <div className="banner-danger" style={{ marginTop: 12 }}>
                ❌ {error}
              </div>
            )}
          </Card>

          {/* Summary card after success */}
          {result && (
            <Card style={{ marginTop: 12 }}>
              <CardTitle>Preparation Summary</CardTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  ['Missing Values (before)', result.before?.missing_total ?? '—'],
                  ['Missing Values (after)',  result.after?.missing_total  ?? 0],
                  ['Rows (before)',           result.before?.n_rows ?? '—'],
                  ['Rows (after)',            result.after?.n_rows  ?? '—'],
                  ['Features',               result.n_features     ?? '—'],
                  ['SMOTE Applied',          result.smote_applied ? '✓ Yes' : '✗ No'],
                  ['Normalisation',          result.normalization],
                ].map(([l, v]) => (
                  <div key={l} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '7px 0', borderBottom: '1px solid var(--line)',
                    fontSize: 12,
                  }}>
                    <span style={{ color: 'var(--mid)' }}>{l}</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{String(v)}</span>
                  </div>
                ))}
              </div>

              {result.smote_applied && (
                <div className="banner-good" style={{ marginTop: 10 }}>
                  ✅ SMOTE applied — minority class oversampled
                </div>
              )}

              <div className="banner-good" style={{ marginTop: 10 }}>
                ✅ Data ready — Step 4 unlocked
              </div>

              <Btn
                variant="teal"
                onClick={() => onDone(result)}
                style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              >
                Continue to Model Training →
              </Btn>
            </Card>
          )}
        </div>

        {/* ── Right: charts ── */}
        <div>
          {result ? (
            <>
              {/* Tab switcher */}
              <div style={{
                display: 'flex', gap: 6, background: 'var(--white)',
                border: '1px solid var(--line)', borderRadius: 14, padding: 6,
                boxShadow: 'var(--shadow-sm)', marginBottom: 4,
              }}>
                {[
                  ['mean',    '📊 Feature Means'],
                  ['std',     '📏 Std Deviation'],
                  ['balance', '⚖️ Class Balance'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setChartTab(key)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                      background: chartTab === key ? 'var(--navy)' : 'transparent',
                      color: chartTab === key ? '#fff' : 'var(--mid)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit', transition: '.15s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {chartTab === 'mean'    && <NormChart data={normChart} metric="mean" />}
              {chartTab === 'std'     && <NormChart data={normChart} metric="std" />}
              {chartTab === 'balance' && (
                <BalanceChart before={beforeBalance} after={afterBalance} />
              )}

              {/* Normalisation explanation */}
              <Card style={{ marginTop: 12 }}>
                <CardTitle>What was applied?</CardTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    {
                      icon: '🔢', title: 'Missing Values',
                      text: result.handle_missing === 'mean'   ? 'Replaced with column mean value'
                          : result.handle_missing === 'median' ? 'Replaced with column median value'
                          : 'Rows containing missing values were removed',
                    },
                    {
                      icon: '📐', title: 'Normalisation',
                      text: result.normalization === 'standard' ? 'Z-score scaling: mean=0, std=1 across all features'
                          : result.normalization === 'minmax'   ? 'Min-Max scaling: all values in range [0, 1]'
                          : 'No normalisation — raw values preserved',
                    },
                    {
                      icon: '⚖️', title: 'Class Balancing',
                      text: result.smote_applied
                          ? `SMOTE applied — synthetic minority patients added`
                          : 'No balancing applied — original distribution kept',
                    },
                    {
                      icon: '✂️', title: 'Train / Test Split',
                      text: `${result.after?.n_rows ?? 304} patients split: ${100 - testSize}% training, ${testSize}% held-out test set`,
                    },
                  ].map(c => (
                    <div key={c.title} style={{
                      padding: '12px 14px', borderRadius: 12,
                      background: 'var(--paper)', border: '1px solid var(--line)',
                    }}>
                      <div style={{ fontSize: 18, marginBottom: 6 }}>{c.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--mid)', lineHeight: 1.5 }}>{c.text}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 340, flexDirection: 'column', gap: 12,
            }}>
              {loading ? (
                <>
                  <Spinner size={36} />
                  <div style={{ fontSize: 14, color: 'var(--mid)', fontWeight: 600 }}>
                    Preparing data…
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Handling missing values, normalising features
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 56 }}>📊</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                    Charts will appear here
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', maxWidth: 300 }}>
                    Configure your preparation settings and click
                    <b> Apply Preparation</b> to see before/after comparisons
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
