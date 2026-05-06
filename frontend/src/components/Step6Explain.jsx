/**
 * Step 6 — Explainability
 * Feature importances from real trained model (gini / coef / variance).
 * Patient waterfall from real predict_proba values.
 * All feature names are clinical (no feat_0, col_1, etc.).
 */
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid, ReferenceLine,
} from 'recharts'
import { getFeatureImp, getWaterfall, getPatients } from '../utils/api.js'
import { Card, CardTitle, ScreenHeader, Btn, Spinner } from './ui.jsx'

/* ─── method label map ──────────────────────────────────────────── */
const METHOD_LABEL = {
  gini_importance:       'Gini Importance (Random Forest / Decision Tree)',
  coefficient_magnitude: 'Coefficient Magnitude (Logistic Regression / SVM)',
  feature_variance:      'Feature Variance Proxy (KNN / Naïve Bayes)',
}

/* ─── bar colour ramp ───────────────────────────────────────────── */
const BAR_RAMP = [
  '#0D2340','#153A5C','#1A6B9A','#2980B9',
  '#0E9E8E','#16A085','#27AE60','#2ECC71',
  '#7A92A3','#95A5A6','#BDC3C7','#D5D8DC',
]

/* ─── Feature Importance Chart ──────────────────────────────────── */
function FeatureImportanceChart({ data, method, model }) {
  if (!data || data.length === 0) return null
  const top = data.slice(0, 12)

  return (
    <Card>
      <div style={{ marginBottom: 10 }}>
        <CardTitle>Global Feature Importance — Clinical Rankings</CardTitle>
        <p style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.5, maxWidth: 680 }}>
          How much each clinical measurement contributed to predictions across all patients.
          Values are normalised to <b>0.00 – 1.00</b> and derived from the{' '}
          <b>{METHOD_LABEL[method] ?? method ?? 'trained model'}</b>.
          All names shown are clinical — no technical column identifiers.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(300, top.length * 28)}>
        <BarChart
          data={top}
          layout="vertical"
          margin={{ top: 0, right: 70, left: 168, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
          <XAxis
            type="number" domain={[0, 1]}
            tickFormatter={v => v.toFixed(2)}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="category" dataKey="feature"
            tick={{ fontSize: 11, fill: 'var(--ink)' }}
            width={163}
          />
          <Tooltip
            formatter={v => [v.toFixed(4), 'Importance score']}
            contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', fontSize: 12 }}
          />
          <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
            {top.map((_, i) => (
              <Cell key={i} fill={BAR_RAMP[Math.min(i, BAR_RAMP.length - 1)]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
        {[
          ['#0D2340', 'Top predictor'],
          ['#1A6B9A', 'High (2–4)'],
          ['#0E9E8E', 'Moderate (5–8)'],
          ['#7A92A3', 'Lower'],
        ].map(([color, lbl]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
            {lbl}
          </div>
        ))}
      </div>

      {/* Clinical sense-check */}
      {top.length > 0 && (
        <div className="banner-info" style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', marginBottom: 6 }}>
            🩺 Top 3 Clinical Predictors
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {top.slice(0, 3).map((d, i) => (
              <span key={d.feature} style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: i === 0 ? 'var(--navy)' : i === 1 ? 'var(--blue)' : 'var(--teal)',
                color: '#fff',
              }}>
                #{i + 1} {d.feature} ({d.importance.toFixed(3)})
              </span>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--mid)', lineHeight: 1.5, margin: 0 }}>
            Verify that the top-ranked features align with clinical domain knowledge.
            Unexpected features ranking highly may indicate data leakage or spurious correlations.
          </p>
        </div>
      )}
    </Card>
  )
}

/* ─── Waterfall Chart ───────────────────────────────────────────── */
function WaterfallChart({ data, baseProb, predProb }) {
  if (!data || data.length === 0) return null

  const riskPct   = predProb * 100
  const riskLevel = riskPct >= 70 ? 'High'     : riskPct >= 40 ? 'Moderate' : 'Low'
  const riskColor = riskPct >= 70 ? 'var(--bad)' : riskPct >= 40 ? 'var(--warn)' : 'var(--good)'
  const riskBg    = riskPct >= 70 ? 'var(--bad-bg)' : riskPct >= 40 ? 'var(--warn-bg)' : 'var(--good-bg)'

  const chartData = data.map(d => ({
    feature:  d.feature,
    rawValue: d.value,
    positive: d.contribution > 0 ? +d.contribution.toFixed(4) : 0,
    negative: d.contribution < 0 ? +d.contribution.toFixed(4) : 0,
  }))

  return (
    <div>
      {/* Risk summary pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--sky)', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Population Base Rate</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginTop: 2 }}>
            {(baseProb * 100).toFixed(1)}%
          </div>
        </div>
        <div style={{ fontSize: 20, color: 'var(--muted)' }}>→</div>
        <div style={{ padding: '10px 14px', borderRadius: 10, background: riskBg, border: `1px solid ${riskColor}` }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Predicted Probability</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: riskColor, marginTop: 2 }}>
            {riskPct.toFixed(1)}% — {riskLevel} Risk
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(240, data.length * 26)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 163, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
          <XAxis
            type="number"
            tickFormatter={v => (v * 100).toFixed(0) + '%'}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="category" dataKey="feature"
            tick={{ fontSize: 11 }}
            width={158}
          />
          <Tooltip
            formatter={(v, name) => [
              `${(v * 100).toFixed(2)}%`,
              name === 'positive' ? '↑ Increases risk probability' : '↓ Decreases risk probability',
            ]}
            labelFormatter={(label) => {
              const item = chartData.find(d => d.feature === label)
              return item ? `${label} (value: ${item.rawValue})` : label
            }}
            contentStyle={{ borderRadius: 10, fontSize: 11, border: '1px solid var(--line)', background: 'var(--white)' }}
            cursor={{ fill: 'rgba(13,35,64,0.04)' }}
          />
          <ReferenceLine x={0} stroke="var(--ink)" strokeWidth={1.5} />
          <Bar dataKey="positive" name="positive" stackId="a" fill="#B91C1C" radius={[0, 5, 5, 0]} />
          <Bar dataKey="negative" name="negative" stackId="b" fill="#0D7A50" radius={[0, 5, 5, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
        🔴 <b>Red bars</b> increase risk probability.
        🟢 <b>Green bars</b> decrease risk probability.
        Starting from the base rate ({(baseProb * 100).toFixed(1)}%), each feature shifts the prediction up or down.
      </p>
    </div>
  )
}

/* ─── Patient pill button ───────────────────────────────────────── */
function PatientPill({ patient, selected, onClick }) {
  const pct   = patient.predicted_prob * 100
  const color = pct >= 70 ? 'var(--bad)' : pct >= 40 ? 'var(--warn)' : 'var(--good)'
  const bg    = pct >= 70 ? 'var(--bad-bg)' : pct >= 40 ? 'var(--warn-bg)' : 'var(--good-bg)'
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
        border: `2px solid ${selected ? 'var(--blue)' : 'var(--line)'}`,
        background: selected ? 'var(--sky)' : 'var(--white)',
        transition: '.12s', textAlign: 'left', minWidth: 115,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{patient.label}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Actual: {patient.true_label}</div>
      <div style={{
        fontSize: 13, fontWeight: 700, color, background: bg,
        borderRadius: 6, marginTop: 5, padding: '2px 7px', display: 'inline-block',
      }}>
        {pct.toFixed(0)}% risk
      </div>
    </button>
  )
}

/* ─── Main component ────────────────────────────────────────────── */
export default function Step6Explain({ domainKey, onContinue }) {
  const [importances, setImportances] = useState([])
  const [method,      setMethod]      = useState('')
  const [modelName,   setModelName]   = useState('')
  const [patients,    setPatients]    = useState([])
  const [selIdx,      setSelIdx]      = useState(0)
  const [waterfall,   setWaterfall]   = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [wLoading,    setWLoading]    = useState(false)
  const [error,       setError]       = useState('')

  /* ── load importances + patients on mount ── */
  useEffect(() => {
    setLoading(true)
    Promise.all([getFeatureImp(), getPatients()])
      .then(([fi, pts]) => {
        setImportances(fi.importances ?? [])
        setMethod(fi.method ?? '')
        setModelName(fi.model ?? '')
        const pList = pts.patients ?? []
        setPatients(pList)
        if (pList.length > 0) loadWaterfall(0)
      })
      .catch(() => setError('Could not load explainability data. Make sure a model is trained in Step 4 first.'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  const loadWaterfall = async (idx) => {
    setWLoading(true)
    try {
      const w = await getWaterfall(idx)
      setWaterfall(w)
    } catch (e) {
      console.error('Waterfall error:', e)
    } finally {
      setWLoading(false)
    }
  }

  const handlePatient = (idx) => {
    setSelIdx(idx)
    loadWaterfall(idx)
  }

  /* ── states ── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 380, flexDirection: 'column', gap: 16 }}>
      <Spinner size={44} />
      <div style={{ fontSize: 14, color: 'var(--mid)', fontWeight: 600 }}>
        Computing feature importances from trained model…
      </div>
    </div>
  )

  if (error) return (
    <div className="banner-danger" style={{ margin: 20 }}>
      <b>❌ Error:</b> {error}
    </div>
  )

  return (
    <div className="fade-in">
      <ScreenHeader
        step={6}
        title="Model Explainability"
        description="Understand why the model makes predictions. Global importance shows overall patterns; patient waterfall explains individual predictions. All feature names are clinical."
        right={<Btn variant="teal" onClick={onContinue}>Ethics & Bias →</Btn>}
      />

      {/* ── Global feature importance ── */}
      <FeatureImportanceChart data={importances} method={method} model={modelName} />

      {/* ── Patient waterfall ── */}
      <Card style={{ marginTop: 14 }}>
        <CardTitle>Patient-Level Explanation (Waterfall Chart)</CardTitle>
        <p style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 14, lineHeight: 1.5 }}>
          Select a patient from the held-out test set to see which of their clinical measurements most
          influenced the risk prediction, and in which direction.
        </p>

        {/* Patient selector */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {patients.map(p => (
            <PatientPill
              key={p.index}
              patient={p}
              selected={selIdx === p.index}
              onClick={() => handlePatient(p.index)}
            />
          ))}
        </div>

        {/* Waterfall */}
        {wLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, color: 'var(--mid)' }}>
            <Spinner size={20} />
            Computing explanation for Patient {selIdx + 1}…
          </div>
        ) : waterfall ? (
          <WaterfallChart
            data={waterfall.contributions}
            baseProb={waterfall.base_probability}
            predProb={waterfall.predicted_probability}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
            Select a patient above to see their explanation
          </div>
        )}
      </Card>

      {/* ── Clinical sense check ── */}
      <Card style={{ marginTop: 14 }}>
        <CardTitle>Clinical Sense-Check — Are Results Plausible?</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: '14px', background: 'var(--good-bg)', borderRadius: 12, border: '1px solid #6EE7B7' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--good)', marginBottom: 8 }}>✅ Expected Findings</div>
            <ul style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 2, paddingLeft: 18, margin: 0 }}>
              <li>Top features should match known risk factors for this domain</li>
              <li>High-risk patients should have elevated values in top features</li>
              <li>Feature direction (↑ / ↓ risk) should match clinical intuition</li>
            </ul>
          </div>
          <div style={{ padding: '14px', background: 'var(--bad-bg)', borderRadius: 12, border: '1px solid #FCA5A5' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bad)', marginBottom: 8 }}>⚠️ Warning Signs</div>
            <ul style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 2, paddingLeft: 18, margin: 0 }}>
              <li>Demographic features (age, sex) disproportionately dominant</li>
              <li>Unexpected features outranking known biomarkers</li>
              <li>Near-zero importance for critical clinical features</li>
            </ul>
          </div>
        </div>
        {importances.length > 0 && (
          <div className="banner-info" style={{ marginTop: 12 }}>
            <b>Top predictor for this run:</b> {importances[0].feature}
            {' '}(importance = {importances[0].importance.toFixed(4)}, method: {METHOD_LABEL[method] ?? method})
          </div>
        )}
      </Card>

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <Btn variant="teal" onClick={onContinue}>Continue to Ethics & Bias →</Btn>
      </div>
    </div>
  )
}
