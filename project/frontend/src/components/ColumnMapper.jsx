import React, { useState } from "react";

export default function ColumnMapper({ onSaved, onCancel, previewData }) {
  const [targetColumn] = useState("Heart_Attack_Risk");
  const [problemType] = useState("Binary classification (Risk / No Risk)");
  const [justSaved, setJustSaved] = useState(false); // Kaydedildi mesajı için state

  const columns = [
    { name: "Heart_Attack_Risk", auto: "Binary (0/1)", role: "Target (predict)" },
    { name: "Age", auto: "Number", role: "Number (measurement)" },
    { name: "Cholesterol", auto: "Number", role: "Number (measurement)" },
    { name: "Blood_Pressure", auto: "Number (Systolic)", role: "Number (measurement)" },
    { name: "Smoker", auto: "Category", role: "Category (grouping)" },
    { name: "patient_id", auto: "Identifier-like", role: "Ignore (not clinical)" },
  ];

  // Sadece kaydetme işlemi (Kapatmaz)
  const handleQuickSave = () => {
    onSaved(false); // App.jsx'e kapatma diyoruz
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000); // 2 saniye sonra yazıyı eski haline getir
  };

  const getPillStyle = (type) => {
    if (type.includes("Binary")) return { backgroundColor: '#dcfce7', color: '#15803d' };
    if (type.includes("Number")) return { backgroundColor: '#fef3c7', color: '#92400e' };
    if (type.includes("Identifier")) return { backgroundColor: '#fee2e2', color: '#991b1b' };
    return { backgroundColor: '#f1f5f9', color: '#475569' };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Column Mapper & Schema Validator</h2>
          <p style={styles.subtitle}>Assign roles to columns to prevent the model from learning from non-clinical data (e.g., patient IDs).</p>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.column}>
          <div style={styles.card}>
            <div style={styles.sectionHeader}>SETTINGS</div>
            <div style={styles.field}>
              <label style={styles.label}>Problem Type</label>
              <select value={problemType} style={styles.select} readOnly>
                <option>{problemType}</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Target Column (Predicting Risk)</label>
              <select value={targetColumn} style={styles.select} readOnly>
                <option>Heart_Attack_Risk</option>
              </select>
            </div>
            
            <div style={styles.tagGroup}>
              <span style={{...styles.tag, color: '#15803d', backgroundColor: '#dcfce7'}}>● Schema: <b>Ready</b></span>
              <span style={styles.tag}>Identifiers: <b>1</b></span>
              <span style={styles.tag}>Missing: <b>0%</b></span>
            </div>

            <div style={styles.alertBox}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                <b>Note:</b> Blood_Pressure has been automatically parsed to use the <b>Systolic</b> value for better accuracy.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button style={styles.btnSecondary}>Validate Schema</button>
              {/* Sadece Kaydetme butonu */}
              <button onClick={handleQuickSave} style={styles.btnTeal}>
                {justSaved ? "✓ Saved!" : "Save Mapping"}
              </button>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.sectionHeader}>DATA PREVIEW (FIRST ROW SAMPLE)</div>
            <table style={styles.table}>
              <thead>
                <tr><th style={styles.th}>COLUMN</th><th style={styles.th}>VALUE</th></tr>
              </thead>
              <tbody>
                <tr><td style={styles.td}>Age</td><td style={styles.td}>{previewData?.Age}</td></tr>
                <tr><td style={styles.td}>Cholesterol</td><td style={styles.td}>{previewData?.Cholesterol}</td></tr>
                <tr><td style={styles.td}>Blood_Pressure</td><td style={styles.td}>{previewData?.Blood_Pressure}</td></tr>
                <tr><td style={styles.td}>Smoker</td><td style={styles.td}>{previewData?.Smoker}</td></tr>
                <tr><td style={styles.td}>patient_id</td><td style={styles.td}>{previewData?.patient_id}</td></tr>
                <tr><td style={styles.td}>Heart_Attack_Risk</td><td style={styles.td}>{previewData?.Heart_Attack_Risk}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.column}>
          <div style={styles.card}>
            <div style={styles.sectionHeader}>COLUMN ROLES — ASSIGN ROLES</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>COLUMN NAME</th>
                  <th style={styles.th}>AUTO-DETECTED</th>
                  <th style={styles.th}>ASSIGN ROLE</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{col.name}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.pill, ...getPillStyle(col.auto) }}>{col.auto}</span>
                    </td>
                    <td style={styles.td}>
                      <select style={styles.smallSelect} defaultValue={col.role}>
                        <option>{col.role}</option>
                        <option>Ignore</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.infoBox}>
            <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              <b>Blocking rules:</b> All clinical numeric columns are validated. Target column is locked to Heart_Attack_Risk.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Save the mapping to unlock Step 3.</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onCancel} style={styles.btnSecondary}>Cancel</button>
          {/* Kaydet ve Kapat butonu */}
          <button onClick={() => onSaved(true)} style={styles.btnPrimary}>Save & Close</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '10px' },
  header: { marginBottom: '2rem' },
  title: { margin: 0, fontSize: '1.5rem', color: '#1e293b' },
  subtitle: { margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#64748b', lineHeight: '1.4' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem' },
  column: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  card: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'white' },
  sectionHeader: { fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '1.2rem', letterSpacing: '0.05em' },
  field: { marginBottom: '1.2rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' },
  select: { width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1' },
  tagGroup: { display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' },
  tag: { padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' },
  alertBox: { backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '10px', color: '#15803d', marginBottom: '1.5rem' },
  infoBox: { backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '10px', color: '#0369a1' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '0.5rem', color: '#94a3b8', fontSize: '0.7rem', borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.8rem 0.5rem', fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #f1f5f9' },
  pill: { padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' },
  smallSelect: { width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1' },
  footer: { marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnTeal: { backgroundColor: '#14b8a6', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', minWidth: '130px' },
  btnPrimary: { backgroundColor: '#0f766e', color: 'white', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  btnSecondary: { backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.7rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};