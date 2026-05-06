import { useState, useRef } from 'react'
import { uploadCSV, useSampleData, mapColumns } from '../utils/api.js'
import { Card, CardTitle, ScreenHeader, Btn, Spinner } from './ui.jsx'

function ColumnMapperModal({ uploadInfo, onSave, onClose }) {
  const [mapping, setMapping] = useState(uploadInfo.auto_mapping || {})
  const [target, setTarget] = useState(uploadInfo.suggested_target || '')
  const clinical = uploadInfo.clinical_features || []

  const setMap = (col, val) => setMapping(p => ({ ...p, [col]: val }))

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--white)', borderRadius: 20, padding: 24,
        width: '100%', maxWidth: 680, maxHeight: '85vh', overflow: 'auto',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: 'Fraunces,Georgia,serif', fontSize: 18, color: 'var(--navy)' }}>Column Mapper</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              Map technical column names to clinical terminology
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
        </div>

        {/* Missing value warning */}
        {Object.keys(uploadInfo.missing_info || {}).length > 0 && (
          <div className="banner-warn" style={{ marginBottom: 14 }}>
            <span style={{ fontWeight: 600 }}>⚠️ Missing values detected:</span>{' '}
            {Object.entries(uploadInfo.missing_info).map(([c, n]) => `${c} (${n})`).join(', ')}
          </div>
        )}

        {/* Mapping table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--navy)' }}>
              {['CSV Column', 'Clinical Name', 'Type', 'Missing'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(uploadInfo.columns || []).map((col, i) => {
              const s = (uploadInfo.stats || []).find(s => s.column === col) || {}
              const isTarget = col === target
              return (
                <tr key={col} style={{ background: i % 2 === 0 ? 'var(--paper)' : 'var(--white)', borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--mid)' }}>{col}</td>
                  <td style={{ padding: '6px 8px' }}>
                    {isTarget ? (
                      <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--sky)', color: 'var(--blue)', fontSize: 12, fontWeight: 600 }}>
                        🎯 Target Variable
                      </span>
                    ) : (
                      <select
                        value={mapping[col] || ''}
                        onChange={e => setMap(col, e.target.value)}
                        style={{
                          padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)',
                          background: 'var(--white)', fontSize: 12, fontFamily: 'inherit', width: '100%'
                        }}
                      >
                        <option value="">-- select clinical name --</option>
                        {clinical.map(f => <option key={f} value={f}>{f}</option>)}
                        <option value={col}>{col} (keep as-is)</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--muted)' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999,
                      background: s.dtype === 'numeric' ? 'var(--sky)' : 'var(--mint)',
                      color: s.dtype === 'numeric' ? 'var(--blue)' : 'var(--good)',
                      fontWeight: 500
                    }}>{s.dtype || 'unknown'}</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>
                    {(s.missing || 0) > 0
                      ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{s.missing}</span>
                      : <span style={{ color: 'var(--good)' }}>✓ None</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave(mapping, target)}>
            ✓ Save Mapping &amp; Unlock Step 3
          </Btn>
        </div>
      </div>
    </div>
  )
}

export default function Step2Upload({ domainKey, onDone }) {
  const [loading, setLoading]     = useState(false)
  const [uploadInfo, setUploadInfo] = useState(null)
  const [showMapper, setShowMapper] = useState(false)
  const [mapSaved, setMapSaved]   = useState(false)
  const [error, setError]         = useState('')
  const [dragOver, setDragOver]   = useState(false)
  const fileRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true); setError('')
    try {
      const info = await uploadCSV(file)
      setUploadInfo(info)
      setMapSaved(false)
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed')
    } finally { setLoading(false) }
  }

  const handleSample = async () => {
    setLoading(true); setError('')
    try {
      const info = await useSampleData()
      setUploadInfo(info)
      setMapSaved(false)
    } catch (e) { setError('Failed to load sample data') }
    finally { setLoading(false) }
  }

  const handleMapSave = async (mapping, target) => {
    try {
      await mapColumns({ mapping, target_col: target })
      setMapSaved(true)
      setShowMapper(false)
    } catch (e) { setError('Column mapping failed') }
  }

  return (
    <div className="fade-in">
      <ScreenHeader
        step={2}
        title="Upload Patient Data"
        description="Upload a CSV file with patient records, or use the provided sample dataset. Then map column names to clinical terminology."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'start' }}>
        <div>
          {/* Drop zone */}
          <Card>
            <CardTitle>Upload CSV File</CardTitle>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--blue)' : 'var(--line)'}`,
                borderRadius: 16, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragOver ? 'var(--sky)' : 'var(--paper)',
                transition: '.15s'
              }}
            >
              <div style={{ fontSize: 40 }}>📂</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginTop: 8 }}>
                Drag &amp; drop your CSV file here
              </p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                or click to browse — accepts .csv files
              </p>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>

            <div style={{ margin: '12px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>— or —</div>

            <Btn variant="ghost" onClick={handleSample} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <Spinner size={16} /> : '🧪 Use Sample Dataset'}
            </Btn>
          </Card>

          {error && <div className="banner-danger" style={{ marginTop: 10 }}>❌ {error}</div>}

          {/* File loaded — show stats */}
          {uploadInfo && (
            <Card style={{ marginTop: 12 }}>
              <CardTitle>Dataset Overview</CardTitle>
              <div className="banner-good" style={{ marginBottom: 12 }}>
                ✅ File loaded: <b>{uploadInfo.n_rows} rows</b> × <b>{uploadInfo.n_cols} columns</b>
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--paper)' }}>
                      {(uploadInfo.columns || []).map(c => (
                        <th key={c} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--line)', color: 'var(--mid)', fontWeight: 600 }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(uploadInfo.preview || []).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? 'var(--white)' : 'var(--paper)' }}>
                        {(uploadInfo.columns || []).map(c => (
                          <td key={c} style={{ padding: '6px 10px', color: 'var(--ink)', fontFamily: 'DM Mono, monospace' }}>
                            {String(row[c] ?? '').slice(0, 12)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                <Btn onClick={() => setShowMapper(true)}>
                  🗺️ Open Column Mapper
                </Btn>
                {mapSaved && (
                  <Btn variant="teal" onClick={() => onDone(uploadInfo)}>
                    Continue to Data Preparation →
                  </Btn>
                )}
              </div>

              {/* Schema banner */}
              <div className={mapSaved ? 'banner-good' : 'banner-warn'} style={{ marginTop: 12 }}>
                {mapSaved
                  ? '✅ Column mapping saved — Step 3 unlocked!'
                  : '⚠️ Please open the Column Mapper to confirm your data structure before continuing.'}
              </div>
            </Card>
          )}
        </div>

        {/* Instructions panel */}
        <Card>
          <CardTitle>Instructions</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['1.', 'Upload CSV', 'Drag your patient data CSV or use the sample dataset for testing.'],
              ['2.', 'Review Columns', 'Check detected columns and missing value warnings.'],
              ['3.', 'Map to Clinical Names', 'Use the Column Mapper to rename technical columns to clinical terminology.'],
              ['4.', 'Continue', 'Once mapping is saved, proceed to data preparation.'],
            ].map(([n, t, d]) => (
              <div key={n} style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 999, background: 'var(--navy)',
                  color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0
                }}>{n}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{t}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="banner-info" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>💡 CSV Format</div>
            <p style={{ fontSize: 12, color: 'var(--mid)' }}>
              Each row should be one patient. Each column should be one clinical measurement.
              The last column is assumed to be the target (outcome) variable.
            </p>
          </div>
        </Card>
      </div>

      {showMapper && uploadInfo && (
        <ColumnMapperModal
          uploadInfo={uploadInfo}
          onSave={handleMapSave}
          onClose={() => setShowMapper(false)}
        />
      )}
    </div>
  )
}
