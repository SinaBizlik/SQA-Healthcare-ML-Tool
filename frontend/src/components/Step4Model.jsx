import { useState, useRef, useEffect, useCallback } from 'react'
import { trainModel, quickTrain } from '../utils/api.js'
import { Card, CardTitle, ScreenHeader, Btn, Spinner } from './ui.jsx'

/* ─── Model definitions ─────────────────────────────────────────── */
const MODELS = [
  { id:'knn', short:'KNN',  label:'K-Nearest Neighbours',   complexity:'Low',      interp:'High',      clinical:'Best for small datasets. "Similar patients had this outcome." Easy to explain to clinicians.' },
  { id:'svm', short:'SVM',  label:'Support Vector Machine', complexity:'High',     interp:'Low',       clinical:'Excellent for high-dimensional clinical data. RBF kernel handles non-linear separations.' },
  { id:'dt',  short:'DT',   label:'Decision Tree',          complexity:'Low',      interp:'Very High', clinical:'Every branch is a clinical decision rule. Clinicians can follow the exact logic path.' },
  { id:'rf',  short:'RF',   label:'Random Forest',          complexity:'High',     interp:'Medium',    clinical:'Most robust against noise. Provides reliable feature importance scores.' },
  { id:'lr',  short:'LR',   label:'Logistic Regression',    complexity:'Low',      interp:'High',      clinical:'Gold standard for binary outcomes. Coefficients are direct risk-factor weights.' },
  { id:'nb',  short:'NB',   label:'Naïve Bayes',            complexity:'Very Low', interp:'Medium',    clinical:'Very fast. Works well when clinical features are conditionally independent.' },
]

/* ─── Slider parameter component ────────────────────────────────── */
function SParam({ label, min, max, step = 1, value, onChange, hint, fmt }) {
  const display = fmt ? fmt(value) : value
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', background: 'var(--sky)', border: '1px solid var(--line)', borderRadius: 8, padding: '3px 10px', minWidth: 48, textAlign: 'center' }}>{display}</div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
      {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  )
}

/* ─── Dropdown parameter component ─────────────────────────────── */
function DropParam({ label, value, onChange, options }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mid)', marginBottom: 5, letterSpacing: '.03em', textTransform: 'uppercase' }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10,
          border: '1px solid var(--line)', background: 'var(--white)',
          color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
          outline: 'none',
        }}
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

/* ─── KNN Canvas ─────────────────────────────────────────────────── */
const KNN_PTS = [
  [0.12,0.20,0],[0.22,0.55,0],[0.18,0.72,1],[0.32,0.80,1],[0.42,0.38,0],
  [0.55,0.22,0],[0.48,0.65,1],[0.58,0.75,1],[0.68,0.42,0],[0.72,0.62,1],
  [0.78,0.28,0],[0.82,0.68,1],[0.38,0.18,0],[0.62,0.85,1],[0.88,0.38,0],
  [0.08,0.50,1],[0.92,0.72,1],[0.62,0.12,0],[0.28,0.45,0],[0.50,0.50,1],
]
const QUERY = [0.50, 0.52]

function KNNCanvas({ k }) {
  const ref    = useRef(null)
  const rafRef = useRef(null)

  const draw = useCallback((kVal) => {
    const canvas = ref.current
    if (!canvas) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1
      const W   = canvas.offsetWidth
      const H   = canvas.offsetHeight
      if (!W || !H) return
      canvas.width  = W * dpr
      canvas.height = H * dpr
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, W, H)
      const PAD = 20
      const rW  = W - 2 * PAD
      const rH  = H - 2 * PAD
      const px  = (nx) => PAD + nx * rW
      const py  = (ny) => PAD + ny * rH
      const kSafe = Math.min(Math.max(1, kVal), KNN_PTS.length)
      // Compute distances in PIXEL space so the drawn circle exactly contains K neighbours
      const qpx = px(QUERY[0])
      const qpy = py(QUERY[1])
      const dists = KNN_PTS.map(([nx, ny, cls], i) => ({
        i, cls,
        dist: Math.hypot(px(nx) - qpx, py(ny) - qpy),
      })).sort((a, b) => a.dist - b.dist)
      const neighbours = new Set(dists.slice(0, kSafe).map(d => d.i))
      // Circle radius = pixel distance to the K-th nearest neighbour (exact containment)
      const pxRadius = dists[kSafe - 1].dist + 8  // +8px so border doesn't clip the dot
      ctx.beginPath()
      ctx.arc(px(QUERY[0]), py(QUERY[1]), pxRadius, 0, Math.PI * 2)
      ctx.setLineDash([7, 4])
      ctx.strokeStyle = 'rgba(26,107,154,0.50)'
      ctx.lineWidth   = 2
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(26,107,154,0.07)'
      ctx.fill()
      dists.slice(0, kSafe).forEach(({ i }) => {
        const [nx, ny] = KNN_PTS[i]
        ctx.beginPath()
        ctx.moveTo(px(nx), py(ny))
        ctx.lineTo(px(QUERY[0]), py(QUERY[1]))
        ctx.strokeStyle = 'rgba(26,107,154,0.25)'
        ctx.lineWidth   = 1
        ctx.stroke()
      })
      KNN_PTS.forEach(([nx, ny, cls], i) => {
        const isN = neighbours.has(i)
        ctx.beginPath()
        ctx.arc(px(nx), py(ny), isN ? 7 : 5, 0, Math.PI * 2)
        ctx.fillStyle = cls === 1
          ? (isN ? '#B91C1C' : 'rgba(185,28,28,0.22)')
          : (isN ? '#0D7A50' : 'rgba(13,122,80,0.22)')
        ctx.fill()
        if (isN) {
          ctx.strokeStyle = cls === 1 ? '#B91C1C' : '#0D7A50'
          ctx.lineWidth = 2.5
          ctx.stroke()
        }
      })
      const votes   = dists.slice(0, kSafe).reduce((s, d) => s + d.cls, 0)
      const predCls = votes > kSafe / 2 ? 1 : 0
      const sx = px(QUERY[0]), sy = py(QUERY[1]), sr = 11
      ctx.fillStyle   = predCls === 1 ? '#B91C1C' : '#0D7A50'
      ctx.strokeStyle = '#fff'
      ctx.lineWidth   = 2
      ctx.beginPath()
      for (let j = 0; j < 5; j++) {
        const a = (j * 4 * Math.PI / 5) - Math.PI / 2
        const b = a + 2 * Math.PI / 5
        ctx[j === 0 ? 'moveTo' : 'lineTo'](sx + sr * Math.cos(a), sy + sr * Math.sin(a))
        ctx.lineTo(sx + sr * 0.4 * Math.cos(b), sy + sr * 0.4 * Math.sin(b))
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'var(--ink, #0D2340)'
      ctx.font = `bold 11px DM Sans, system-ui, sans-serif`
      ctx.fillText(
        `K = ${kSafe}  →  Predicted: Class ${predCls}  (${votes}/${kSafe} positive neighbours)`,
        PAD, H - 6
      )
    })
  }, [])

  useEffect(() => { draw(k) }, [k, draw])
  useEffect(() => {
    const h = () => draw(k)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [k, draw])

  return (
    <div>
      <canvas ref={ref} style={{
        width: '100%', height: 210, display: 'block',
        borderRadius: 10, background: 'var(--paper)',
        border: '1px solid var(--line)',
      }} />
      <div style={{ display:'flex', gap:14, marginTop:6, flexWrap:'wrap' }}>
        {[
          ['#B91C1C',            'Positive-class neighbour'],
          ['#0D7A50',            'Negative-class neighbour'],
          ['rgba(185,28,28,.22)','Positive (not neighbour)'],
          ['rgba(13,122,80,.22)','Negative (not neighbour)'],
        ].map(([color, lbl]) => (
          <div key={lbl} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--muted)' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }} />
            {lbl}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Per-model parameter panels ───────────────────────────────── */
function ModelParams({ model, params, setP }) {
  const set = (k, v) => setP(p => ({ ...p, [k]: v }))
  if (model === 'knn') return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <SParam label="Neighbours (K)" min={1} max={25} value={params.k ?? 5} onChange={v => set('k',v)}
        hint="Odd values prevent ties. Clinical rule-of-thumb: K = √(n_patients)." />
      <DropParam label="Distance Metric" value={params.metric ?? 'euclidean'} onChange={v => set('metric',v)}
        options={[['euclidean','Euclidean (straight-line distance)'],['manhattan','Manhattan (city-block)'],['minkowski','Minkowski (generalised)']]} />
      <KNNCanvas k={params.k ?? 5} />
    </div>
  )
  if (model === 'svm') return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <SParam label="Regularisation C" min={1} max={10} value={params.C_idx ?? 5} onChange={v => set('C_idx',v)}
        fmt={v => Math.pow(10,(v-5)/2).toFixed(3)} hint="Higher C = less regularisation, more complex boundary." />
      <DropParam label="Kernel" value={params.kernel ?? 'rbf'} onChange={v => set('kernel',v)}
        options={[['rbf','RBF (recommended for clinical)'],['linear','Linear (fast, interpretable)'],['poly','Polynomial']]} />
    </div>
  )
  if (model === 'dt') return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <SParam label="Max Tree Depth" min={1} max={20} value={params.max_depth ?? 5} onChange={v => set('max_depth',v)}
        hint="Deeper trees fit training data better but may overfit." />
      <DropParam label="Split Criterion" value={params.criterion ?? 'gini'} onChange={v => set('criterion',v)}
        options={[['gini','Gini Impurity'],['entropy','Information Gain']]} />
    </div>
  )
  if (model === 'rf') return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <SParam label="Number of Trees" min={10} max={300} step={10} value={params.n_estimators ?? 100} onChange={v => set('n_estimators',v)}
        hint="More trees → more stable, diminishing returns past 200." />
      <SParam label="Max Depth / Tree" min={1} max={20} value={params.max_depth ?? 10} onChange={v => set('max_depth',v)}
        hint="Limits individual tree complexity." />
    </div>
  )
  if (model === 'lr') return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <SParam label="Regularisation C" min={1} max={10} value={params.C_idx ?? 5} onChange={v => set('C_idx',v)}
        fmt={v => Math.pow(10,(v-5)/2).toFixed(3)} hint="Smaller C → stronger regularisation → simpler model." />
      <SParam label="Max Iterations" min={100} max={1000} step={50} value={params.max_iter ?? 300} onChange={v => set('max_iter',v)}
        hint="Increase if solver convergence warning appears." />
    </div>
  )
  if (model === 'nb') return (
    <div className="banner-info">
      <div style={{ fontSize:12, fontWeight:600, color:'var(--blue)', marginBottom:4 }}>ℹ️ Gaussian Naïve Bayes</div>
      <p style={{ fontSize:12, color:'var(--mid)', lineHeight:1.5, margin:0 }}>
        No hyperparameters to configure. Assumes each clinical feature follows a Gaussian (normal) distribution within each class. Fast and often competitive despite its simplicity.
      </p>
    </div>
  )
  return null
}

/* ─── Animated Training Progress ────────────────────────────────── */
const TRAIN_STEPS = [
  { id: 'split',   label: 'Splitting train/test sets',     icon: '✂️' },
  { id: 'impute',  label: 'Imputing missing values',       icon: '🔧' },
  { id: 'scale',   label: 'Fitting scaler on X_train',     icon: '📐' },
  { id: 'smote',   label: 'Applying SMOTE (if enabled)',   icon: '⚖️' },
  { id: 'fit',     label: 'Training classifier',           icon: '🤖' },
  { id: 'eval',    label: 'Evaluating on test set',        icon: '📊' },
  { id: 'cv',      label: 'Cross-validation folds',        icon: '🔁' },
  { id: 'save',    label: 'Saving pipeline to disk',       icon: '💾' },
]

function TrainingProgress({ active }) {
  const [phase, setPhase] = useState(0)
  const [done, setDone]   = useState([])

  useEffect(() => {
    if (!active) { setPhase(0); setDone([]); return }
    setPhase(0); setDone([])
    const timings = [180, 280, 350, 450, 900, 1200, 1500, 1700]
    const timers = timings.map((ms, i) =>
      setTimeout(() => {
        setPhase(i + 1)
        setDone(prev => [...prev, TRAIN_STEPS[i].id])
      }, ms)
    )
    return () => timers.forEach(clearTimeout)
  }, [active])

  if (!active) return null

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Spinner size={14} />
        Training pipeline in progress…
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TRAIN_STEPS.map((s, i) => {
          const isDone   = done.includes(s.id)
          const isActive = phase === i
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 10,
              background: isDone ? 'var(--good-bg)' : isActive ? 'var(--sky)' : 'var(--paper)',
              border: `1px solid ${isDone ? '#6EE7B7' : isActive ? 'var(--blue)' : 'var(--line)'}`,
              fontSize: 12, fontWeight: isActive ? 600 : 400,
              color: isDone ? 'var(--good)' : isActive ? 'var(--ink)' : 'var(--muted)',
              transition: 'all .3s ease',
              opacity: i > phase ? 0.4 : 1,
            }}>
              <span style={{ fontSize: 14, minWidth: 20, textAlign: 'center' }}>
                {isDone ? '✅' : isActive ? <span style={{ animation: 'pulse-dot 1s infinite' }}>{s.icon}</span> : s.icon}
              </span>
              {s.label}
              {isDone && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--good)', fontWeight: 600 }}>Done</span>}
              {isActive && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', fontWeight: 600 }}>Running…</span>}
            </div>
          )
        })}
      </div>
      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', marginTop: 12 }}>
        <div style={{
          height: '100%', borderRadius: 999,
          background: 'linear-gradient(90deg, var(--teal), var(--blue))',
          width: `${Math.round((done.length / TRAIN_STEPS.length) * 100)}%`,
          transition: 'width .4s ease',
        }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, textAlign: 'right' }}>
        {done.length} / {TRAIN_STEPS.length} steps
      </div>
    </div>
  )
}

/* ─── Metric colour helpers ─────────────────────────────────────── */
const mC  = v => v >= 70 ? 'var(--good)'    : v >= 50 ? 'var(--warn)'    : 'var(--bad)'
const mBg = v => v >= 70 ? 'var(--good-bg)' : v >= 50 ? 'var(--warn-bg)' : 'var(--bad-bg)'

/* ─── Comparison table ──────────────────────────────────────────── */
function CompareTable({ rows, onClear }) {
  if (!rows.length) return null
  return (
    <Card style={{ marginTop:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <CardTitle>Model Comparison Table</CardTitle>
        <Btn variant="ghost" size="sm" onClick={onClear}>✕ Clear</Btn>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:'var(--navy)' }}>
              {['Model','Accuracy','Sensitivity ↑','Specificity','Precision','F1','AUC','ms'].map(h => (
                <th key={h} style={{ padding:'8px 10px', color:'#fff', fontSize:11, fontWeight:600, textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const m = row.metrics
              return (
                <tr key={i} style={{ background: i%2===0 ? 'var(--paper)' : 'var(--white)', borderBottom:'1px solid var(--line)' }}>
                  <td style={{ padding:'7px 10px', fontWeight:700, color:'var(--navy)' }}>{row.model.toUpperCase()}</td>
                  {[
                    [m.accuracy,'%'],
                    [m.sensitivity,'%'],
                    [m.specificity,'%'],
                    [m.precision,'%'],
                    [m.f1 != null ? +(m.f1*100).toFixed(1): null,''],
                    [m.auc != null ? +(m.auc*100).toFixed(1): null,''],
                    [m.train_time_ms,''],
                  ].map(([val,suf],j) => (
                    <td key={j} style={{ padding:'7px 10px', color: j===1 ? mC(val??0) : 'var(--ink)', fontWeight: j===1 ? 700 : 400 }}>
                      {val != null ? `${typeof val==='number' ? val.toFixed(j>=5?0:1) : val}${suf}` : '—'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>
        ↑ Sensitivity (recall) = most critical clinical metric — proportion of positive cases correctly detected.
      </p>
    </Card>
  )
}

/* ─── Main component ────────────────────────────────────────────── */
export default function Step4Model({ prepInfo, onDone }) {
  const [activeModel, setActiveModel] = useState('knn')
  const [params, setParams]           = useState({ k:5, C_idx:5, max_depth:5, n_estimators:100, max_iter:300, metric:'euclidean', kernel:'rbf', criterion:'gini' })
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState('')
  const [compareRows, setCompareRows] = useState([])
  const debRef = useRef(null)

  const resolve = (name, p) => {
    const out = { ...p }
    if (['svm','lr'].includes(name) && out.C_idx != null && out.C == null) {
      out.C = parseFloat((Math.pow(10, (Number(out.C_idx) - 5) / 2)).toFixed(4))
    }
    return out
  }

  const handleTrain = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await trainModel({ model_name: activeModel, params: resolve(activeModel, params) })
      setResult(r)
    } catch (e) {
      setError(e?.message || 'Training failed')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!result) return
    clearTimeout(debRef.current)
    debRef.current = setTimeout(async () => {
      try { await quickTrain({ model_name: activeModel, params: resolve(activeModel, params) }) } catch {}
    }, 300)
    return () => clearTimeout(debRef.current)
  }, [params, activeModel]) // eslint-disable-line

  const m = result?.metrics

  return (
    <div className="fade-in">
      <ScreenHeader step={4} title="Model Selection & Training"
        description="Select a machine learning algorithm, tune its parameters, train on the prepared data, and compare results across models." />

      {/* Model tabs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6, background:'var(--white)', border:'1px solid var(--line)', borderRadius:16, padding:8, marginBottom:14, boxShadow:'var(--shadow-sm)' }}>
        {MODELS.map(mod => (
          <button key={mod.id}
            onClick={() => { setActiveModel(mod.id); setResult(null); setError('') }}
            style={{ padding:'10px 6px', borderRadius:10, border:'none', fontFamily:'inherit', fontWeight:600, fontSize:13, cursor:'pointer', transition:'.15s', background: activeModel===mod.id ? 'var(--navy)' : 'transparent', color: activeModel===mod.id ? '#fff' : 'var(--mid)' }}>
            {mod.short}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:14, alignItems:'start' }}>
        {/* Left — params */}
        <div>
          <Card>
            {(() => {
              const mod = MODELS.find(x => x.id === activeModel)
              return <>
                <CardTitle>{mod.label}</CardTitle>
                <div className="banner-info" style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--blue)', marginBottom:3 }}>🩺 Clinical Note</div>
                  <p style={{ fontSize:11, color:'var(--mid)', lineHeight:1.4, margin:0 }}>{mod.clinical}</p>
                </div>
                <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                  {[['Complexity',mod.complexity],['Interpretability',mod.interp]].map(([k,v]) => (
                    <div key={k} style={{ flex:1, padding:'8px 10px', borderRadius:10, background:'var(--paper)', border:'1px solid var(--line)', textAlign:'center' }}>
                      <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>{k}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--navy)', marginTop:2 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <ModelParams model={activeModel} params={params} setP={setParams} />
                <Btn onClick={handleTrain} disabled={loading}
                  style={{ width:'100%', justifyContent:'center', marginTop:16 }}>
                  {loading ? <><Spinner size={16}/>&nbsp;Training…</> : `🚀 Train ${activeModel.toUpperCase()}`}
                </Btn>
                {error && <div className="banner-danger" style={{ marginTop:10 }}>❌ {error}</div>}
              </>
            })()}
          </Card>
        </div>

        {/* Right — results */}
        <div>
          {loading && (
            <Card style={{ marginBottom: 14 }}>
              <TrainingProgress active={loading} />
            </Card>
          )}

          {m && !loading ? (
            <>
              {result.low_sensitivity_warning && (
                <div className="banner-danger" style={{ marginBottom:12 }}>
                  <b style={{ fontSize:14 }}>⚠️ Low Sensitivity Warning</b>
                  <p style={{ fontSize:12, marginTop:4, margin:'4px 0 0' }}>
                    Sensitivity <b>{m.sensitivity}%</b> is below the 50% clinical safety threshold.
                    This model may miss many positive cases. Try adjusting parameters or choose a different model.
                  </p>
                </div>
              )}

              {/* 6 metric tiles */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
                {[
                  ['Accuracy',    m.accuracy,                            '%', 'Overall correct predictions'],
                  ['Sensitivity', m.sensitivity,                         '%', 'True positive rate — cases caught'],
                  ['Specificity', m.specificity,                         '%', 'True negative rate'],
                  ['Precision',   m.precision,                           '%', 'Positive predictive value'],
                  ['F1 Score',    m.f1 != null ? +(m.f1*100).toFixed(1): null, '%', 'Harmonic mean of precision & sensitivity'],
                  ['AUC-ROC',     m.auc != null ? +(m.auc*100).toFixed(1): null, '%', 'Overall discriminative ability'],
                ].map(([lbl, val, suf, hint]) => (
                  <div key={lbl} className="metric-tile" style={{ background:'var(--white)', border:'1px solid var(--line)', borderRadius:16, padding:'14px 12px', textAlign:'center', boxShadow:'var(--shadow-sm)' }}>
                    <div style={{ fontSize:24, fontWeight:700, color:mC(val??0), background:mBg(val??0), borderRadius:10, padding:'6px 0', marginBottom:6 }}>
                      {val != null ? val : '—'}{suf}
                    </div>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{lbl}</div>
                    <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>{hint}</div>
                    <div style={{ height:4, borderRadius:999, background:'var(--line)', marginTop:8 }}>
                      <div style={{ height:'100%', width:`${Math.min(val??0,100)}%`, background:mC(val??0), borderRadius:999, transition:'width .7s cubic-bezier(.22,1,.36,1)' }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="banner-info" style={{ marginBottom:12 }}>
                ✅ Trained <b>{activeModel.toUpperCase()}</b> on <b>{m.n_train}</b> patients in <b>{m.train_time_ms} ms</b> · Test set: <b>{m.n_test}</b> patients
                {m.smote_applied && <span> · <b>SMOTE applied</b></span>}
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <Btn variant="teal" onClick={() => onDone(m)} style={{ flex:1, justifyContent:'center' }}>
                  View Full Results & ROC →
                </Btn>
                <Btn variant="outline" onClick={() => {
                  if (!compareRows.some(r => r.model === activeModel))
                    setCompareRows(p => [...p, { model: activeModel, metrics: m }])
                }}>+ Compare</Btn>
              </div>
            </>
          ) : !loading ? (
            <Card style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300, flexDirection:'column', gap:14 }}>
              <div style={{ fontSize:52 }}>🤖</div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Ready to train</div>
              <div style={{ fontSize:12, color:'var(--muted)', textAlign:'center', maxWidth:280 }}>Configure parameters and click <b>Train</b></div>
            </Card>
          ) : null}

          {/* Quick reference */}
          <Card style={{ marginTop:14 }}>
            <CardTitle>Algorithm Quick Reference</CardTitle>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--paper)' }}>
                  {['Algorithm','Complexity','Interpretability','Best for'].map(h => (
                    <th key={h} style={{ padding:'7px 10px', textAlign:'left', borderBottom:'2px solid var(--line)', color:'var(--mid)', fontWeight:600, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODELS.map((mod, i) => (
                  <tr key={mod.id}
                    onClick={() => { setActiveModel(mod.id); setResult(null) }}
                    style={{ background: activeModel===mod.id ? 'var(--sky)' : i%2===0 ? 'var(--white)' : 'var(--paper)', borderBottom:'1px solid var(--line)', cursor:'pointer', transition:'.12s' }}>
                    <td style={{ padding:'7px 10px', fontWeight:700, color: activeModel===mod.id ? 'var(--blue)' : 'var(--navy)' }}>{mod.short}</td>
                    <td style={{ padding:'7px 10px', color:'var(--mid)' }}>{mod.complexity}</td>
                    <td style={{ padding:'7px 10px', color:'var(--mid)' }}>{mod.interp}</td>
                    <td style={{ padding:'7px 10px', color:'var(--mid)', fontSize:11 }}>{mod.clinical.slice(0,58)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <CompareTable rows={compareRows} onClear={() => setCompareRows([])} />
        </div>
      </div>
    </div>
  )
}
