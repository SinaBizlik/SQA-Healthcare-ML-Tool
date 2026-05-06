/**
 * Step 5 — Results & Evaluation
 * All values come from real sklearn model.fit() + model.predict() on held-out test set.
 * No values are hard-coded or simulated.
 */
import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import { getMetrics, getDomains } from '../utils/api.js'
import { Card, CardTitle, ScreenHeader, Btn, Spinner } from './ui.jsx'

/* ─── colour helpers ─────────────────────────────────────────────── */
const mc  = v => v >= 70 ? 'var(--good)'    : v >= 50 ? 'var(--warn)'    : 'var(--bad)'
const mcB = v => v >= 70 ? 'var(--good-bg)' : v >= 50 ? 'var(--warn-bg)' : 'var(--bad-bg)'

/* ─── MetricTile ────────────────────────────────────────────────── */
function MetricTile({ label, value, pctValue, hint }) {
  // pctValue is always 0-100 for the colour scale
  const pct = pctValue ?? (typeof value === 'number' ? value : 0)
  const display = typeof value === 'number' ? value.toFixed(value < 5 ? 3 : 1) : '—'
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--line)',
      borderRadius: 16, padding: '14px 10px', textAlign: 'center',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        fontSize: 24, fontWeight: 700, color: mc(pct),
        background: mcB(pct), borderRadius: 10,
        padding: '6px 0', marginBottom: 6,
      }}>
        {display}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
      {hint && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>{hint}</div>}
      <div style={{ fontSize: 10, color: mc(pct), fontWeight: 600, marginTop: 4 }}>
        {pct >= 70 ? '✓ Good' : pct >= 50 ? '⚠ Acceptable' : '✗ Below threshold'}
      </div>
      <div style={{ height: 4, borderRadius: 999, background: 'var(--line)', marginTop: 6 }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: mc(pct), borderRadius: 999, transition: '.4s' }} />
      </div>
    </div>
  )
}

/* ─── Confusion Matrix ──────────────────────────────────────────── */
function ConfusionMatrix({ cm, posLabel, negLabel }) {
  if (!cm || cm.length < 2) return null
  const [[tn, fp], [fn, tp]] = cm
  const total = tn + fp + fn + tp
  const pct = n => total > 0 ? ((n / total) * 100).toFixed(1) : '0'

  return (
    <Card>
      <CardTitle>Confusion Matrix — Real Test-Set Predictions</CardTitle>

      {/* Axis labels */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 4, marginBottom: 6 }}>
        <div />
        <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Predicted: {negLabel}
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Predicted: {posLabel}
        </div>
      </div>

      {/* Rows */}
      {[
        { rowLabel: `Actual: ${negLabel}`, vals: [
          { v: tn, label: 'True Negative',  hint: `Correctly cleared as ${negLabel}`, good: true },
          { v: fp, label: 'False Positive', hint: `Wrongly flagged as ${posLabel}`,   good: false },
        ]},
        { rowLabel: `Actual: ${posLabel}`, vals: [
          { v: fn, label: 'False Negative', hint: `Missed — actually ${posLabel}`,     good: false },
          { v: tp, label: 'True Positive',  hint: `Correctly detected as ${posLabel}`, good: true  },
        ]},
      ].map(row => (
        <div key={row.rowLabel} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 6, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', lineHeight: 1.3 }}>
            {row.rowLabel}
          </div>
          {row.vals.map(cell => (
            <div key={cell.label} style={{
              padding: '14px 8px', borderRadius: 12, textAlign: 'center',
              background: cell.good ? 'var(--good-bg)' : 'var(--bad-bg)',
              border: `2px solid ${cell.good ? 'var(--good)' : 'var(--bad)'}`,
            }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: cell.good ? 'var(--good)' : 'var(--bad)' }}>
                {cell.v}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', marginTop: 3 }}>{cell.label}</div>
              <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, lineHeight: 1.3 }}>{cell.hint}</div>
              <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 3, fontFamily: 'DM Mono, monospace' }}>
                {pct(cell.v)}%
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Derived summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 8 }}>
        {[
          ['PPV (Precision)', total > 0 ? ((tp / (tp + fp || 1)) * 100).toFixed(1) + '%' : '—'],
          ['NPV',             total > 0 ? ((tn / (tn + fn || 1)) * 100).toFixed(1) + '%' : '—'],
          ['Sensitivity',     total > 0 ? ((tp / (tp + fn || 1)) * 100).toFixed(1) + '%' : '—'],
          ['Specificity',     total > 0 ? ((tn / (tn + fp || 1)) * 100).toFixed(1) + '%' : '—'],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ padding: '7px', background: 'var(--paper)', borderRadius: 8, textAlign: 'center', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{val}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* FN warning */}
      {fn > 0 && fn >= tp && (
        <div className="banner-danger" style={{ marginTop: 10 }}>
          ⚠️ <b>High False Negative Rate:</b> More {posLabel} cases are being missed ({fn}) than correctly detected ({tp}).
          Consider adjusting the decision threshold or using a higher-sensitivity model.
        </div>
      )}
    </Card>
  )
}

/* ─── ROC Curve ─────────────────────────────────────────────────── */
function ROCCurve({ rocData, auc }) {
  if (!rocData || rocData.length < 2) return (
    <Card>
      <CardTitle>ROC Curve</CardTitle>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--muted)', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 32 }}>📈</div>
        <div style={{ fontSize: 13 }}>ROC data not available for this model configuration</div>
      </div>
    </Card>
  )

  const aucPct = auc != null ? auc * 100 : 0
  const aucLabel = aucPct >= 80 ? '✓ Excellent' : aucPct >= 70 ? '⚠ Acceptable' : '✗ Poor'

  return (
    <Card>
      <CardTitle>ROC Curve — Real predict_proba Output</CardTitle>

      <div style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'flex-start' }}>
        <div style={{ padding: '10px 16px', borderRadius: 10, background: mcB(aucPct), border: `1px solid ${mc(aucPct)}` }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>AUC-ROC</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: mc(aucPct), marginTop: 2 }}>{auc ?? '—'}</div>
        </div>
        <div style={{ paddingTop: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: mc(aucPct) }}>{aucLabel}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5, maxWidth: 300 }}>
            {aucPct >= 80 ? 'Strong discriminative ability. Model reliably separates positive from negative patients across all thresholds.'
             : aucPct >= 70 ? 'Acceptable performance. Model outperforms random guessing but has room for improvement.'
             : 'Poor discrimination. Model barely outperforms a random classifier (AUC = 0.50).'}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={rocData.map(pt => ({ ...pt, baseline: pt.fpr }))}
          margin={{ top: 5, right: 10, left: -15, bottom: 25 }}
        >
          <defs>
            <linearGradient id="rocGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#1A6B9A" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#1A6B9A" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis
            dataKey="fpr" type="number" domain={[0, 1]}
            tickFormatter={v => v.toFixed(1)} tick={{ fontSize: 10 }}
            label={{ value: 'False Positive Rate (1 – Specificity)', position: 'insideBottom', offset: -15, fontSize: 10, fill: 'var(--muted)' }}
          />
          <YAxis
            domain={[0, 1]} tickFormatter={v => v.toFixed(1)} tick={{ fontSize: 10 }}
            label={{ value: 'True Positive Rate (Sensitivity)', angle: -90, position: 'insideLeft', offset: 20, fontSize: 10, fill: 'var(--muted)' }}
          />
          <Tooltip
            formatter={(v, name) => [v.toFixed(4), name === 'tpr' ? 'Sensitivity (TPR)' : 'Random baseline']}
            contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', fontSize: 11 }}
          />
          {/* Diagonal baseline = random classifier */}
          <Area type="monotone" dataKey="baseline" stroke="#DDE4EA" strokeDasharray="5 5" fill="none" dot={false} />
          {/* Real ROC */}
          <Area type="monotone" dataKey="tpr" stroke="#1A6B9A" strokeWidth={2.5} fill="url(#rocGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
        Dashed diagonal = random classifier (AUC = 0.50). Shaded area represents your model's real performance. Each point is a different classification threshold.
      </p>
    </Card>
  )
}

/* ─── Clinical Interpretation ───────────────────────────────────── */
function ClinicalInterpretation({ m, posLabel }) {
  const cards = [
    {
      icon: '🎯', title: 'Sensitivity (Recall)',
      good: m.sensitivity >= 50,
      body: m.sensitivity >= 70
        ? `Excellent: ${m.sensitivity}% of ${posLabel} cases correctly detected. Safe for primary screening.`
        : m.sensitivity >= 50
        ? `Moderate: ${m.sensitivity}% detection rate. Suitable as decision support — verify borderline cases manually.`
        : `⚠ Low: Only ${m.sensitivity}% of ${posLabel} cases detected. Not safe for clinical deployment without improvement.`,
    },
    {
      icon: '🔬', title: 'Precision & False Alarms',
      good: m.precision >= 60,
      body: `Precision ${m.precision}% → ${(100 - m.precision).toFixed(0)}% of flagged patients are false positives. Specificity ${m.specificity}% correctly clears non-cases, reducing unnecessary investigations.`,
    },
    {
      icon: '📈', title: 'AUC Discrimination',
      good: (m.auc ?? 0) >= 0.70,
      body: (m.auc ?? 0) >= 0.80
        ? `AUC ${m.auc}: Excellent — model reliably distinguishes ${posLabel} from healthy patients across all thresholds.`
        : (m.auc ?? 0) >= 0.70
        ? `AUC ${m.auc}: Acceptable discrimination. Better than chance but room to improve.`
        : `AUC ${m.auc}: Poor. Model may not generalise well to new patient populations.`,
    },
    {
      icon: '⚖️', title: 'F1 Balance',
      good: (m.f1 ?? 0) >= 0.60,
      body: `F1 = ${m.f1} balances precision and sensitivity. ${(m.f1 ?? 0) >= 0.70 ? 'Good balance.' : (m.f1 ?? 0) >= 0.50 ? 'Acceptable — monitor for class-specific gaps.' : 'Imbalance detected — consider class weighting or threshold tuning.'}`,
    },
  ]

  return (
    <Card style={{ marginTop: 14 }}>
      <CardTitle>Clinical Interpretation of Real Results</CardTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {cards.map(c => (
          <div key={c.title} style={{
            padding: '14px', borderRadius: 12,
            background: c.good ? 'var(--good-bg)' : 'var(--warn-bg)',
            border: `1px solid ${c.good ? '#6EE7B7' : '#FCD34D'}`,
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 5 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.55 }}>{c.body}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ─── Threshold guide table ─────────────────────────────────────── */
function ThresholdTable({ m }) {
  const rows = [
    { metric: 'Accuracy',    value: m.accuracy,                              min: 75,   ideal: 90,  suf: '%' },
    { metric: 'Sensitivity', value: m.sensitivity,                           min: 50,   ideal: 80,  suf: '%' },
    { metric: 'Specificity', value: m.specificity,                           min: 60,   ideal: 85,  suf: '%' },
    { metric: 'Precision',   value: m.precision,                             min: 60,   ideal: 85,  suf: '%' },
    { metric: 'F1 Score',    value: m.f1 != null ? +(m.f1 * 100).toFixed(1) : null, min: 65, ideal: 80, suf: '%' },
    { metric: 'AUC-ROC',     value: m.auc != null ? +(m.auc * 100).toFixed(1) : null, min: 70, ideal: 85, suf: '%' },
  ]

  return (
    <Card style={{ marginTop: 14 }}>
      <CardTitle>Clinical Metric Thresholds</CardTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--navy)' }}>
            {['Metric', 'Your Result', 'Min. Clinical', 'Ideal Target', 'Status'].map(h => (
              <th key={h} style={{ padding: '8px 12px', color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ metric, value, min, ideal, suf }, i) => {
            const pass = value != null && value >= min
            return (
              <tr key={metric} style={{ background: i % 2 === 0 ? 'var(--paper)' : 'var(--white)', borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{metric}</td>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: value != null ? mc(value) : 'var(--muted)' }}>
                  {value != null ? `${value}${suf}` : '—'}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--mid)' }}>≥{min}{suf}</td>
                <td style={{ padding: '8px 12px', color: 'var(--good)' }}>≥{ideal}{suf}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: pass ? 'var(--good-bg)' : 'var(--bad-bg)',
                    color: pass ? 'var(--good)' : 'var(--bad)',
                  }}>
                    {value == null ? '—' : pass ? '✓ Pass' : '✗ Fail'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

/* ─── Main component ────────────────────────────────────────────── */
export default function Step5Results({ metrics: propMetrics, domainKey, onContinue }) {
  const [metrics, setMetrics] = useState(propMetrics ?? null)
  const [domain,  setDomain]  = useState(null)
  const [loading, setLoading] = useState(!propMetrics)

  useEffect(() => {
    const load = async () => {
      try {
        const [m, domains] = await Promise.all([
          propMetrics ? Promise.resolve(propMetrics) : getMetrics(),
          getDomains(),
        ])
        setMetrics(m)
        setDomain(domains?.[domainKey] ?? null)
      } catch (e) {
        console.error('Step5 load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [domainKey]) // eslint-disable-line

  /* ── loading ── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 420, flexDirection: 'column', gap: 14 }}>
      <Spinner size={44} />
      <div style={{ fontSize: 14, color: 'var(--mid)', fontWeight: 600 }}>Loading real model results…</div>
    </div>
  )

  /* ── no data ── */
  if (!metrics) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--muted)' }}>
      <div style={{ fontSize: 56 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14 }}>No results yet</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>Train a model in Step 4 to see real evaluation metrics</div>
    </div>
  )

  const m        = metrics
  const posLabel = domain?.positive_label ?? 'Positive'
  const negLabel = domain?.negative_label ?? 'Negative'

  return (
    <div className="fade-in">
      <ScreenHeader
        step={5}
        title="Results & Evaluation"
        description="All values computed from real sklearn model on held-out test set. Nothing is simulated or hard-coded."
        right={<Btn variant="teal" onClick={onContinue}>Explain Model →</Btn>}
      />

      {/* ── Low sensitivity clinical risk alert ── */}
      {m.sensitivity < 50 && (
        <div className="banner-danger" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>🚨 Clinical Risk Alert — Low Sensitivity</div>
          <p style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
            Sensitivity is <b>{m.sensitivity}%</b>, below the minimum clinical safety threshold of 50%.
            The model is missing <b>{m.confusion_matrix?.[1]?.[0] ?? '?'}</b> patients who actually have <b>{posLabel}</b> (False Negatives).
            Return to Step 4 to adjust parameters, choose a different model, or apply SMOTE in Step 3.
          </p>
        </div>
      )}

      {/* ── 6 metric tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 14 }}>
        <MetricTile label="Accuracy"    value={m.accuracy}    pctValue={m.accuracy}    hint="All correct / total" />
        <MetricTile label="Sensitivity" value={m.sensitivity} pctValue={m.sensitivity} hint="True positive rate" />
        <MetricTile label="Specificity" value={m.specificity} pctValue={m.specificity} hint="True negative rate" />
        <MetricTile label="Precision"   value={m.precision}   pctValue={m.precision}   hint="Positive pred. value" />
        <MetricTile label="F1 Score"    value={m.f1}          pctValue={m.f1 != null ? m.f1 * 100 : null} hint="Recall/precision balance" />
        <MetricTile label="AUC-ROC"     value={m.auc}         pctValue={m.auc != null ? m.auc * 100 : null} hint="Discriminative ability" />
      </div>

      {/* ── Training info ── */}
      <div className="banner-info" style={{ marginBottom: 14 }}>
        Real sklearn training — <b>{m.n_train}</b> patients for training, <b>{m.n_test}</b> held-out for evaluation · Training completed in <b>{m.train_time_ms} ms</b>
      </div>

      {/* ── Confusion Matrix + ROC ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <ConfusionMatrix cm={m.confusion_matrix} posLabel={posLabel} negLabel={negLabel} />
        <ROCCurve rocData={m.roc_curve} auc={m.auc} />
      </div>

      <ClinicalInterpretation m={m} posLabel={posLabel} />
      <ThresholdTable m={m} />

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <Btn variant="teal" onClick={onContinue}>Continue to Explainability →</Btn>
      </div>
    </div>
  )
}
