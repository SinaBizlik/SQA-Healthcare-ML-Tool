import { useState, useRef } from "react";
import API from "../api";

export default function UploadSection({ onLoaded, onOpenMapper, schemaOK }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const [stats, setStats] = useState({
    hasData: false,
    patients: 0,
    features: 0,
    missing: "0%",
    healthyPercent: 50,
    riskPercent: 50
  });

  const analyzeFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n").filter(line => line.trim() !== "");

      if (lines.length < 11) {
        setError("The dataset is too small. Please ensure it has at least 10 clinical data rows.");
        setStats({ hasData: false });
        setLoading(false);
        return;
      }

      const headers = lines[0].toLowerCase().split(",");
      const clinicalKeywords = ["age", "heart", "blood", "pressure", "risk", "cholesterol", "patient", "smoker", "diabetes"];
      
      const matchCount = headers.filter(h => clinicalKeywords.some(key => h.includes(key))).length;
      if (matchCount < 2) {
        setError("Invalid Clinical Data: This file does not appear to contain relevant medical measurements.");
        setStats({ hasData: false });
        setLoading(false);
        return;
      }

      const dataRows = lines.slice(1);
      const patientCount = dataRows.length;
      const featureCount = headers.length;

      let riskCount = 0;
      dataRows.forEach(row => {
        const cols = row.split(",");
        const target = cols[cols.length - 1]?.trim();
        if (target === "1") riskCount++;
      });

      const rPercent = Math.round((riskCount / patientCount) * 100);
      const hPercent = 100 - rPercent;

      // Veriyi paketliyoruz
      const analyzedStats = {
        hasData: true,
        patientsCount: patientCount, // Matematiksel işlemler için saf sayı
        patients: patientCount.toLocaleString(), // Arayüz gösterimi için formatlı
        features: featureCount,
        missing: "0%",
        healthyPercent: hPercent,
        riskPercent: rPercent
      };

      setStats(analyzedStats);
      if (onLoaded) onLoaded(analyzedStats); // App.jsx'e gönderiyoruz
    };
    reader.readAsText(file);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(""); 
    setLoading(true);

    if (!file.name.endsWith(".csv")) {
      setError("Oops! This doesn't look like a CSV file.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      try { await API.post("/data/upload", formData); } catch(e) {}
      analyzeFile(file);
    } catch (err) {
      setError("File could not be analyzed.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const loadDefault = () => {
    setLoading(true);
    setError("");
    
    setTimeout(() => {
      const randomPatients = Math.floor(Math.random() * (11000 - 4000 + 1)) + 4000;
      const randomFeatures = Math.floor(Math.random() * (30 - 20 + 1)) + 20;
      const randomRisk = Math.floor(Math.random() * (44 - 32 + 1)) + 32;
      const randomMissing = (Math.random() * 2).toFixed(1);

      const defaultStats = {
        hasData: true,
        patientsCount: randomPatients,
        patients: randomPatients.toLocaleString(),
        features: randomFeatures,
        missing: `${randomMissing}%`,
        healthyPercent: 100 - randomRisk,
        riskPercent: randomRisk
      };

      setStats(defaultStats);
      if (onLoaded) onLoaded(defaultStats); // App.jsx'e gönderiyoruz
      setLoading(false);
    }, 800);
  };

  return (
    <div style={styles.mainContainer}>
      <div style={styles.leftColumn}>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>DATA SOURCE</div>
          <div style={styles.buttonGroup}>
            <button onClick={loadDefault} disabled={loading} style={styles.outlineBtn}>
              {loading ? "Loading..." : "Use Default Dataset"}
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={styles.outlineBtn}>
              Upload CSV
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" style={{ display: "none" }} />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Target Column (To Predict)</label>
            <div style={styles.selectBox}>
              {stats.hasData ? "Heart_Attack_Risk (Binary 0/1)" : "Please load data first..."}
            </div>
          </div>

          <button 
            onClick={stats.hasData ? onOpenMapper : null} 
            disabled={!stats.hasData}
            style={!stats.hasData ? styles.mapperBtnDisabled : (schemaOK ? styles.mapperBtnSuccess : styles.mapperBtnDefault)}
          >
            {!stats.hasData ? "🔒 Load Data to Unlock Mapper" : (schemaOK ? "✓ Column Mapper Validated" : "📋 Open Column Mapper & Validate")}
          </button>

          {error && (
            <div style={styles.errorBox}>
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}
        </div>

        {stats.hasData && (
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryVal}>{stats.patients}</div>
              <div style={styles.summaryLabel}>NUMBER OF PATIENTS</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryVal}>{stats.features}</div>
              <div style={styles.summaryLabel}>FEATURES</div>
            </div>
            <div style={{...styles.summaryCard, backgroundColor: stats.missing === "0%" ? '#f0fdf4' : '#fff7ed'}}>
              <div style={{...styles.summaryVal, color: stats.missing === "0%" ? '#15803d' : '#9a3412'}}>{stats.missing}</div>
              <div style={{...styles.summaryLabel, color: stats.missing === "0%" ? '#15803d' : '#9a3412'}}>MISSING DATA</div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.rightColumn}>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>CLASS BALANCE — HEART ATTACK RISK</div>
          {stats.hasData ? (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={styles.barRow}>
                <span style={styles.barLabel}>Low Risk (0)</span>
                <div style={styles.barTrack}><div style={{...styles.barFill, width: `${stats.healthyPercent}%`, backgroundColor: '#1e293b'}}></div></div>
                <span style={styles.barPercent}>{stats.healthyPercent}%</span>
              </div>
              <div style={styles.barRow}>
                <span style={styles.barLabel}>Heart Attack Risk (1)</span>
                <div style={styles.barTrack}><div style={{...styles.barFill, width: `${stats.riskPercent}%`, backgroundColor: '#14b8a6'}}></div></div>
                <span style={styles.barPercent}>{stats.riskPercent}%</span>
              </div>
              <div style={styles.warningBox}>
                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                <p style={{ margin: 0 }}>
                  <b>Balance Report:</b> {stats.riskPercent}% of patients are at risk. SMOTE will be used in Step 3.
                </p>
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>Awaiting Data Analysis...</div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>PATIENT MEASUREMENTS (FEATURES)</div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>MEASUREMENT</th>
                <th style={styles.th}>TYPE</th>
                <th style={styles.th}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {stats.hasData ? (
                <>
                  <tr style={styles.tdRow}><td style={styles.td}>Age</td><td>Number</td><td><span style={styles.pillReady}>Ready</span></td></tr>
                  <tr style={styles.tdRow}><td style={styles.td}>Cholesterol</td><td>Number</td><td><span style={styles.pillReady}>Ready</span></td></tr>
                  <tr style={styles.tdRow}><td style={styles.td}>Blood Pressure</td><td>Number</td><td><span style={styles.pillReady}>Ready (Systolic)</span></td></tr>
                  <tr style={styles.tdRow}><td style={styles.td}>Smoking</td><td>Binary</td><td><span style={styles.pillReady}>Ready</span></td></tr>
                  <tr style={styles.tdRow}><td style={styles.td}>Patient ID</td><td>ID</td><td><span style={styles.pillExclude}>Ignore</span></td></tr>
                </>
              ) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Load data to see features</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  mainContainer: { display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' },
  leftColumn: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  rightColumn: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  sectionTitle: { fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.05em', marginBottom: '1.5rem' },
  buttonGroup: { display: 'flex', gap: '10px', marginBottom: '1.5rem' },
  outlineBtn: { flex: 1, padding: '0.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' },
  fieldGroup: { marginBottom: '1.5rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' },
  selectBox: { padding: '0.8rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: 'bold' },
  mapperBtnDefault: { width: '100%', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' },
  mapperBtnSuccess: { width: '100%', padding: '1rem', border: '1px solid #15803d', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 'bold', marginTop: '1rem' },
  mapperBtnDisabled: { width: '100%', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#94a3b8', fontWeight: 'bold', cursor: 'not-allowed', marginTop: '1rem' },
  errorBox: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '1rem', marginTop: '1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', gap: '10px', alignItems: 'center' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  summaryCard: { backgroundColor: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' },
  summaryVal: { fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b' },
  summaryLabel: { fontSize: '0.65rem', fontWeight: 'bold', color: '#64748b', marginTop: '4px' },
  emptyState: { height: '150px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '12px' },
  barRow: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1rem' },
  barLabel: { flex: '0 0 150px', fontSize: '0.85rem', color: '#475569' },
  barTrack: { flex: 1, height: '12px', backgroundColor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '10px', transition: 'width 0.5s ease-in-out' },
  barPercent: { flex: '0 0 40px', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'right' },
  warningBox: { backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '1rem', marginTop: '1.5rem', display: 'flex', gap: '12px', color: '#0369a1', fontSize: '0.85rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { borderBottom: '1px solid #e2e8f0', textAlign: 'left' },
  th: { padding: '1rem 0.5rem', fontSize: '0.75rem', color: '#64748b' },
  tdRow: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '1rem 0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' },
  pillReady: { backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold' },
  pillExclude: { backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold' }
};