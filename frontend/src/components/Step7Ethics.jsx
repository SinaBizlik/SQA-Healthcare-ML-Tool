/**
 * Step 7 — Ethics, Fairness & EU AI Act
 * - Real subgroup sensitivity from trained model (age / gender)
 * - Automatic Bias Alert Banner when gap > 10 pp
 * - 8-item EU AI Act checklist (interactive toggles)
 * - AI Failure case studies
 * - PDF Certificate download (real metrics via ReportLab)
 */
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { getSubgroups, getTrainingChart, downloadCert } from '../utils/api.js'
import { Card, CardTitle, ScreenHeader, Btn, Spinner } from './ui.jsx'

/* ─── EU AI Act checklist ───────────────────────────────────────── */
const CHECKLIST = [
  {
    id: 1, article: 'Art. 9',
    text: 'Risk Management System documented and maintained throughout the system lifecycle.',
    preChecked: true,
  },
  {
    id: 2, article: 'Art. 10',
    text: 'Training, validation and test data governance: provenance, quality and representativeness verified.',
    preChecked: true,
  },
  {
    id: 3, article: 'Art. 11',
    text: 'Technical documentation prepared, covering design specifications and performance metrics.',
    preChecked: false,
  },
  {
    id: 4, article: 'Art. 13',
    text: 'Transparency obligations met — end users informed they are interacting with an AI system.',
    preChecked: false,
  },
  {
    id: 5, article: 'Art. 14',
    text: 'Human oversight mechanisms enabled; clinicians can override or contest AI recommendations.',
    preChecked: false,
  },
  {
    id: 6, article: 'Art. 15',
    text: 'Accuracy, robustness and cybersecurity validated; consistent performance across subgroups.',
    preChecked: false,
  },
  {
    id: 7, article: 'Art. 10',
    text: 'Bias and fairness assessment completed across age, sex, and ethnicity; disparities documented.',
    preChecked: false,
  },
  {
    id: 8, article: 'Art. 17',
    text: 'Post-market monitoring plan in place; incident reporting procedure defined and tested.',
    preChecked: false,
  },
]

/* ─── Failure case studies ──────────────────────────────────────── */
const CASES = [
  {
    type: 'failure', icon: '❌',
    color: 'var(--bad)', bg: 'var(--bad-bg)',
    title: 'Cardiac Risk Model — Elderly Under-representation',
    body: 'A cardiac risk classifier trained mostly on patients aged 40–60 showed 22 pp lower sensitivity for patients over 80, leading to missed diagnoses in the highest-risk group before the bias was identified at audit.',
  },
  {
    type: 'near-miss', icon: '⚠️',
    color: 'var(--warn)', bg: 'var(--warn-bg)',
    title: 'Chest X-Ray Classifier — Gender Imbalance',
    body: 'A chest imaging model showed 15% higher false-positive rate for female patients due to 70/30 male-to-female training split. Detected during mandatory subgroup analysis before deployment — prevented by stratified validation.',
  },
  {
    type: 'prevention', icon: '✅',
    color: 'var(--good)', bg: 'var(--good-bg)',
    title: 'Diabetic Retinopathy — Stratified Monitoring Protocol',
    body: 'A retinopathy team added mandatory subgroup sensitivity reporting across age, sex, and ethnicity before every model release. This protocol prevented three deployment failures within the first year of adoption.',
  },
]

/* ─── colour helpers ─────────────────────────────────────────────── */
const mc  = v => v >= 70 ? 'var(--good)'    : v >= 50 ? 'var(--warn)'    : 'var(--bad)'
const mcB = v => v >= 70 ? 'var(--good-bg)' : v >= 50 ? 'var(--warn-bg)' : 'var(--bad-bg)'

/* ─── Subgroup Table ─────────────────────────────────────────────── */
function SubgroupTable({ rows, biasDetected, ageGap, genderGap, simulated, ageColUsed, sexColUsed }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <CardTitle>Subgroup Sensitivity — {simulated ? 'Simulated Demographics' : 'Real CSV Demographics'}</CardTitle>
        <span style={{
          padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: biasDetected ? 'var(--bad-bg)' : 'var(--good-bg)',
          color:      biasDetected ? 'var(--bad)'    : 'var(--good)',
          border: `1px solid ${biasDetected ? '#FCA5A5' : '#6EE7B7'}`,
        }}>
          {biasDetected ? '⚠ Bias Detected' : '✓ Within Threshold'}
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--navy)' }}>
            {['Demographic Group', 'Type', 'N Patients', 'Sensitivity', 'Min. Threshold', 'Status', 'Fairness Bar'].map(h => (
              <th key={h} style={{ padding: '8px 10px', color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.group} style={{
              background: i % 2 === 0 ? 'var(--paper)' : 'var(--white)',
              borderBottom: '1px solid var(--line)',
            }}>
              <td style={{ padding: '9px 10px', fontWeight: 600, color: 'var(--ink)' }}>{row.group}</td>
              <td style={{ padding: '9px 10px' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                  background: row.type === 'Age' ? 'var(--sky)' : 'var(--mint)',
                  color:      row.type === 'Age' ? 'var(--blue)' : 'var(--good)',
                }}>
                  {row.type}
                </span>
              </td>
              <td style={{ padding: '9px 10px', color: 'var(--mid)' }}>{row.n}</td>
              <td style={{ padding: '9px 10px' }}>
                <span style={{
                  padding: '4px 10px', borderRadius: 999, fontWeight: 700, fontSize: 13,
                  background: mcB(row.sensitivity), color: mc(row.sensitivity),
                }}>
                  {row.sensitivity}%
                </span>
              </td>
              <td style={{ padding: '9px 10px', color: 'var(--muted)', fontSize: 11 }}>≥ 50%</td>
              <td style={{ padding: '9px 10px' }}>
                <span style={{ fontWeight: 700, color: row.ok ? 'var(--good)' : 'var(--bad)', fontSize: 13 }}>
                  {row.ok ? '✓ OK' : '✗ Low'}
                </span>
              </td>
              <td style={{ padding: '9px 10px' }}>
                <div style={{ height: 7, borderRadius: 999, background: 'var(--line)', width: 80 }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(row.sensitivity, 100)}%`,
                    background: mc(row.sensitivity),
                    borderRadius: 999,
                  }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Gap summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        {[
          { label: 'Age Group Max Gap', value: ageGap },
          { label: 'Gender Group Gap',  value: genderGap },
        ].map(({ label, value }) => {
          const over = value > 10
          return (
            <div key={label} style={{
              padding: '12px 14px', borderRadius: 12,
              background: over ? 'var(--bad-bg)' : 'var(--good-bg)',
              border: `1px solid ${over ? '#FCA5A5' : '#6EE7B7'}`,
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: over ? 'var(--bad)' : 'var(--good)', marginTop: 4 }}>
                {value} pp
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Threshold: 10 pp — {over ? '⚠ EXCEEDS limit' : '✓ Within limit'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Simulated data notice */}
      {simulated ? (
        <div className="banner-warn" style={{ marginTop: 12 }}>
          <b>⚠️ Simulated Demographics:</b> Your CSV does not contain Age or Sex columns, so demographic subgroup analysis used randomly generated groups. Upload a CSV with <code>Age</code> and/or <code>Sex</code>/<code>Gender</code> columns to get real subgroup analysis.
        </div>
      ) : (
        <div className="banner-good" style={{ marginTop: 12 }}>
          ✅ <b>Real Demographics:</b> Subgroup analysis computed from actual CSV data
          {ageColUsed && <span> · Age: <b>{ageColUsed}</b></span>}
          {sexColUsed && <span> · Sex: <b>{sexColUsed}</b></span>}
        </div>
      )}
    </Card>
  )
}

/* ─── Training vs Population Chart ──────────────────────────────── */
function TrainingDistChart({ data }) {
  if (!data || data.length === 0) return null
  const hasGap = data.some(d => d.gap_pp > 15)
  return (
    <Card style={{ marginTop: 14 }}>
      <CardTitle>Training Cohort vs Reference Population</CardTitle>
      <p style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 10, lineHeight: 1.5 }}>
        Mean feature values in the training cohort versus an estimated reference population.
        Gaps &gt; 15 pp may indicate sampling bias that could affect clinical generalisability.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 65 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis
            dataKey="feature"
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
            angle={-38} textAnchor="end" interval={0}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="training_mean"   name="Training Cohort"      fill="#1A6B9A" radius={[4, 4, 0, 0]} />
          <Bar dataKey="population_mean" name="Reference Population" fill="#0E9E8E" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {hasGap && (
        <div className="banner-warn" style={{ marginTop: 10 }}>
          ⚠️ One or more features show &gt;15% gap vs reference population.
          Review for systematic sampling bias before clinical deployment.
        </div>
      )}
    </Card>
  )
}

/* ─── EU AI Act Checklist ─────────────────────────────────────────── */
function AIActChecklist({ items, onToggle }) {
  const checked = items.filter(i => i.checked).length
  const pct = Math.round((checked / items.length) * 100)

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <CardTitle>EU AI Act High-Risk Checklist</CardTitle>
        <span style={{
          padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
          background: checked === items.length ? 'var(--good-bg)' : 'var(--sky)',
          color:      checked === items.length ? 'var(--good)'    : 'var(--blue)',
        }}>
          {checked}/{items.length}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', marginBottom: 14 }}>
        <div style={{
          height: '100%', borderRadius: 999, transition: '.35s',
          width: `${pct}%`,
          background: pct === 100 ? 'var(--good)' : 'var(--teal)',
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => onToggle(item.id)}
            style={{
              display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10,
              cursor: 'pointer', alignItems: 'flex-start',
              border: `1px solid ${item.checked ? 'var(--teal)' : 'var(--line)'}`,
              background: item.checked ? 'var(--mint)' : 'var(--paper)',
              transition: '.15s',
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: `2px solid ${item.checked ? 'var(--teal)' : 'var(--line)'}`,
              background: item.checked ? 'var(--teal)' : 'var(--white)',
              display: 'grid', placeItems: 'center',
              color: '#fff', fontSize: 12, fontWeight: 700,
            }}>
              {item.checked ? '✓' : ''}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 3 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--blue)',
                  padding: '1px 7px', borderRadius: 999,
                  background: 'var(--sky)', border: '1px solid var(--line)',
                }}>
                  {item.article}
                </span>
                {item.preChecked && (
                  <span style={{ fontSize: 9, color: 'var(--good)', fontWeight: 700, letterSpacing: '.04em' }}>
                    PRE-CHECKED
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: item.checked ? 'var(--ink)' : 'var(--mid)', lineHeight: 1.45 }}>
                {item.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      {checked === items.length && (
        <div className="banner-good" style={{ marginTop: 12 }}>
          🎉 All EU AI Act compliance items confirmed. System is ready for governance review.
        </div>
      )}
    </Card>
  )
}

/* ─── AI Failure Case Studies ────────────────────────────────────── */
function CaseStudies() {
  return (
    <Card style={{ marginTop: 14 }}>
      <CardTitle>AI Failure Case Studies</CardTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CASES.map(c => (
          <div key={c.title} style={{
            padding: '13px 15px', borderRadius: 12,
            background: c.bg, border: `1px solid ${c.color}22`,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 17 }}>{c.icon}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: c.color,
                padding: '2px 8px', borderRadius: 999,
                background: `${c.color}18`,
              }}>
                {c.type.toUpperCase()}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{c.title}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.6, margin: 0 }}>{c.body}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ─── Certificate Card ───────────────────────────────────────────── */
function CertCard({ metrics, domainKey, checklist, onDownload, pdfLoading }) {
  const checked = checklist.filter(c => c.checked).length
  return (
    <Card>
      <CardTitle>Summary Certificate (PDF)</CardTitle>
      <p style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.55, marginBottom: 12 }}>
        Download a professional PDF containing all real model results and compliance
        findings for the <b>{domainKey}</b> domain.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
        {[
          '📊 All 6 performance metrics (real sklearn output)',
          '🗺️ Confusion matrix counts (TP / TN / FP / FN)',
          '⚖️ Subgroup bias assessment (age & gender)',
          `📋 EU AI Act checklist (${checked}/8 complete)`,
          '🩺 Clinical sense-check notes for the domain',
        ].map(item => (
          <div key={item} style={{ fontSize: 12, color: 'var(--mid)', display: 'flex', gap: 6 }}>
            {item}
          </div>
        ))}
      </div>
      <Btn
        onClick={onDownload}
        disabled={pdfLoading || !metrics}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {pdfLoading
          ? <><Spinner size={14} />&nbsp;Generating PDF…</>
          : '📄 Download Certificate (PDF)'}
      </Btn>
      {!metrics && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 7, textAlign: 'center' }}>
          Complete Steps 4–6 first to generate the certificate
        </div>
      )}
    </Card>
  )
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function Step7Ethics({ domainKey, metrics }) {
  const [subgroups,  setSubgroups]  = useState(null)
  const [trainChart, setTrainChart] = useState([])
  const [checklist,  setChecklist]  = useState(
    CHECKLIST.map(c => ({ ...c, checked: c.preChecked }))
  )
  const [loading,    setLoading]    = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error,      setError]      = useState('')
  const [pdfSuccess, setPdfSuccess] = useState(false)

  /* ── load data on mount ── */
  useEffect(() => {
    setLoading(true)
    Promise.all([getSubgroups(), getTrainingChart()])
      .then(([sg, tc]) => {
        setSubgroups(sg)
        setTrainChart(tc.chart_data ?? [])
      })
      .catch(() => setError('Could not load ethics data. Make sure a model is trained in Step 4.'))
      .finally(() => setLoading(false))
  }, [])

  const toggleCheck = (id) =>
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c))

  /* ── PDF download ── */
  const handleDownload = async () => {
    setPdfLoading(true)
    setPdfSuccess(false)
    setError('')
    try {
      const res = await downloadCert()
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `ml-certificate-${domainKey}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setPdfSuccess(true)
    } catch (e) {
      setError('PDF generation failed. Check that the backend is running and a model is trained.')
    } finally {
      setPdfLoading(false)
    }
  }

  /* ── loading ── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 380, flexDirection: 'column', gap: 16 }}>
      <Spinner size={44} />
      <div style={{ fontSize: 14, color: 'var(--mid)', fontWeight: 600 }}>
        Running bias analysis on trained model…
      </div>
    </div>
  )

  return (
    <div className="fade-in">
      <ScreenHeader
        step={7}
        title="Ethics, Fairness & EU AI Act"
        description="Bias detection across demographic subgroups from the real model, EU AI Act compliance checklist, and professional PDF certificate generation."
        right={
          <Btn onClick={handleDownload} disabled={pdfLoading || !metrics} variant="teal">
            {pdfLoading ? <><Spinner size={14} />&nbsp;Generating…</> : '📄 Download Certificate'}
          </Btn>
        }
      />

      {/* ── Error banner ── */}
      {error && (
        <div className="banner-danger" style={{ marginBottom: 12 }}>❌ {error}</div>
      )}

      {/* ── PDF success ── */}
      {pdfSuccess && (
        <div className="banner-good" style={{ marginBottom: 12 }}>
          ✅ Certificate downloaded successfully!
        </div>
      )}

      {/* ── Bias auto-trigger banner ── */}
      {subgroups?.bias_detected && (
        <div className="banner-danger" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            🚨 BIAS ALERT — Automatic Detection Triggered
          </div>
          <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.65 }}>
            A sensitivity disparity of <b>more than 10 percentage points</b> was detected between
            demographic subgroups using the real trained model.
            Age gap: <b>{subgroups.age_gap} pp</b> · Gender gap: <b>{subgroups.gender_gap} pp</b>.
            This model should <b>not</b> be deployed clinically without investigating and mitigating
            these disparities. Consider retraining with stratified sampling or adjusting class weights.
          </p>
        </div>
      )}

      {/* ── Main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14 }}>

        {/* ── Left column ── */}
        <div>
          {subgroups && (
            <SubgroupTable
              rows={subgroups.rows}
              biasDetected={subgroups.bias_detected}
              ageGap={subgroups.age_gap}
              genderGap={subgroups.gender_gap}
              simulated={subgroups.simulated}
              ageColUsed={subgroups.age_col_used}
              sexColUsed={subgroups.sex_col_used}
            />
          )}
          <TrainingDistChart data={trainChart} />
          <CaseStudies />
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AIActChecklist items={checklist} onToggle={toggleCheck} />
          <CertCard
            metrics={metrics}
            domainKey={domainKey}
            checklist={checklist}
            onDownload={handleDownload}
            pdfLoading={pdfLoading}
          />
        </div>
      </div>
    </div>
  )
}
