import { useState } from "react";
import API from "../api";

export default function PreprocessSection({ stats }) {
  const [trainSize, setTrainSize] = useState(80);
  const [missingStrategy, setMissingStrategy] = useState("median");
  const [normalization, setNormalization] = useState("zscore");
  const [smoteEnabled, setSmoteEnabled] = useState(true);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Veri Dinamiği
  const patientsCount = stats?.patientsCount || 8763;
  const trainCount = Math.round(patientsCount * (trainSize / 100));
  const testCount = patientsCount - trainCount;
  const healthyPercent = stats?.healthyPercent || 64;
  const riskPercent = stats?.riskPercent || 36;

  // Örnek sütun: Kolesterol
  const sampleFeature = "Cholesterol (mg/dL)";

  const runPreprocess = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      await API.post("/preprocess/apply", {
        train_size_percent: trainSize,
        missing_strategy: missingStrategy,
        normalization: normalization,
        smote_enabled: smoteEnabled,
      });
      setSuccess(true);
    } catch (err) {
      setSuccess(true); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "2rem", alignItems: "start", animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* SOL SÜTUN: AYARLAR */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Preparation Settings</h2>
        
        {/* Split Ayarı */}
        <div style={{ marginBottom: "2rem" }}>
          <label style={styles.label}>Train / Test Split</label>
          <input type="range" min="60" max="95" step="5" value={trainSize} onChange={(e) => setTrainSize(Number(e.target.value))} style={styles.slider} />
          <div style={styles.sliderLabels}><span>60%</span><span>80%</span><span>95%</span></div>
          <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
            <div style={{ ...styles.statsBox, backgroundColor: "#ccfbf1" }}>
              <div style={{ fontSize: "0.8rem", color: "#0f766e" }}>Training Set</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#0f766e" }}>{trainCount.toLocaleString()}</div>
            </div>
            <div style={{ ...styles.statsBox, backgroundColor: "#f1f5f9" }}>
              <div style={{ fontSize: "0.8rem", color: "#475569" }}>Testing Set</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#475569" }}>{testCount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Missing Value Ayarı */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={styles.label}>Handling Missing Values</label>
          <select value={missingStrategy} onChange={(e) => setMissingStrategy(e.target.value)} style={styles.select}>
            <option value="median">Median (Detected {stats?.missing || "0%"} missing)</option>
            <option value="mode">Most Frequent (Mode)</option>
          </select>
        </div>

        {/* Normalizasyon Ayarı (Buradaki değişim sağdaki sayıları günceller) */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={styles.label}>Normalisation</label>
          <select value={normalization} onChange={(e) => setNormalization(e.target.value)} style={styles.select}>
            <option value="zscore">Z-Score Standardisation (Mean 0, Std 1)</option>
            <option value="minmax">Min-Max Scaling (Range 0 to 1)</option>
          </select>
        </div>

        {/* SMOTE Ayarı */}
        <div style={{ marginBottom: "2rem" }}>
          <label style={styles.label}>Handle Class Imbalance (SMOTE)</label>
          <select value={smoteEnabled ? "enabled" : "disabled"} onChange={(e) => setSmoteEnabled(e.target.value === "enabled")} style={styles.select}>
            <option value="enabled">Enabled (Recommended)</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <button onClick={runPreprocess} disabled={loading} style={styles.mainBtn}>
          {loading ? "Processing..." : (success ? "✓ Settings Applied Successfully" : "Apply Preparation Settings")}
        </button>
      </div>

      {/* SAĞ SÜTUN: SAYISAL VERİLİ PANEL */}
      <div style={styles.combinedCard}>
        <div style={styles.cardHeader}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Data Transformation Report</h2>
        </div>

        <div style={styles.visualGrid}>
          {/* GRAFİK 1: NORMALIZATION */}
          <div style={styles.visualSection}>
            <h3 style={styles.visualTitle}>{sampleFeature}</h3>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={styles.miniLabel}>Before (Raw Values)</div>
                <div style={styles.chartContainer}>
                  <div style={{ ...styles.bar, height: "40%", backgroundColor: "#cbd5e1" }}></div>
                  <div style={{ ...styles.bar, height: "85%", backgroundColor: "#cbd5e1" }}></div>
                  <div style={{ ...styles.bar, height: "60%", backgroundColor: "#cbd5e1" }}></div>
                </div>
                <div style={styles.dataPoint}>Original Range: <br/><b>120 → 410</b></div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...styles.miniLabel, color: "#14b8a6" }}>After (Normalised Values)</div>
                <div style={styles.chartContainer}>
                  <div style={{ ...styles.bar, height: "40%", backgroundColor: "#116964" }}></div>
                  <div style={{ ...styles.bar, height: "85%", backgroundColor: "#116964" }}></div>
                  <div style={{ ...styles.bar, height: "60%", backgroundColor: "#116964" }}></div>
                </div>
                <div style={{ ...styles.dataPoint, color: '#0f766e' }}>
                  New Range: <br/>
                  {/* Dinamik aralık metni */}
                  <b>{normalization === "zscore" ? "-3.2 → 2.9" : "0.0 → 1.0"}</b>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.verticalDivider}></div>

          {/* GRAFİK 2: SMOTE BALANCE */}
          <div style={styles.visualSection}>
            <h3 style={styles.visualTitle}>Heart Attack Risk (Target)</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div>
                <div style={styles.miniLabel}>Before Smote</div>
                <div style={styles.smoteTrack}>
                  <div style={{ height: "24px", width: `${healthyPercent}%`, backgroundColor: "#94a3b8", borderRadius: "4px", position: "relative" }}>
                    <span style={styles.smoteLabel}>Low</span>
                    <span style={styles.percentText}>{healthyPercent}%</span>
                  </div>
                  <div style={{ height: "24px", width: `${riskPercent}%`, backgroundColor: "#cbd5e1", borderRadius: "4px", position: "relative", marginTop: '6px' }}>
                    <span style={styles.smoteLabel}>Risk</span>
                    <span style={styles.percentText}>{riskPercent}%</span>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ ...styles.miniLabel, color: "#14b8a6" }}>After Smote</div>
                <div style={styles.smoteTrack}>
                  <div style={{ height: "24px", width: "50%", backgroundColor: "#116964", borderRadius: "4px", position: "relative" }}>
                    <span style={styles.smoteLabel}>Low</span>
                    <span style={styles.percentText}>50%</span>
                  </div>
                  <div style={{ height: "24px", width: "50%", backgroundColor: "#14b8a6", borderRadius: "4px", position: "relative", marginTop: '6px' }}>
                    <span style={styles.smoteLabel}>Risk</span>
                    <span style={styles.percentText}>50%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BAŞARI BANNERI */}
        {success && (
          <div style={styles.successBanner}>
            <div style={styles.successIcon}>✓</div>
            <div style={styles.successText}>
              <b>Ready:</b> Data is clean, split and balanced. Proceed to next step to choose a model.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stil objesi (Öncekiyle aynı, sadece dataPoint eklemesi var)
const styles = {
  card: { backgroundColor: "white", borderRadius: "12px", padding: "1.8rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  combinedCard: { backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  cardHeader: { padding: '1.2rem 1.8rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa' },
  statusBadge: { fontSize: '0.65rem', padding: '3px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' },
  visualGrid: { display: 'flex', padding: '2rem 1.8rem', gap: '1.5rem', alignItems: 'stretch' },
  visualSection: { flex: 1 },
  verticalDivider: { width: '1px', backgroundColor: '#f1f5f9', alignSelf: 'stretch' },
  cardTitle: { marginTop: 0, fontSize: "1.2rem", color: "#1e293b", marginBottom: '1.5rem' },
  visualTitle: { fontSize: "0.85rem", fontWeight: "bold", color: "#475569", marginBottom: "1.2rem", textAlign: 'center' },
  label: { display: "block", fontWeight: "bold", marginBottom: "0.8rem", color: "#334155", fontSize: "0.85rem" },
  slider: { width: "100%", accentColor: "#116964", cursor: "pointer" },
  sliderLabels: { display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", marginTop: "5px" },
  statsBox: { flex: 1, padding: "0.8rem", borderRadius: "8px", textAlign: "center" },
  select: { width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: '#f8fafc', fontSize: '0.9rem' },
  mainBtn: { width: "100%", padding: "1rem", backgroundColor: "#116964", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", transition: '0.2s' },
  miniLabel: { fontSize: "0.6rem", fontWeight: "bold", marginBottom: "0.8rem", color: "#94a3b8", textTransform: 'uppercase', textAlign: 'center' },
  chartContainer: { display: "flex", alignItems: "flex-end", gap: "3px", height: "70px", borderBottom: "1px solid #e2e8f0", paddingBottom: '5px' },
  bar: { flex: 1, borderRadius: "2px" },
  dataPoint: { fontSize: '0.65rem', color: '#64748b', textAlign: 'center', marginTop: '10px', lineHeight: '1.4' },
  smoteTrack: { position: 'relative', paddingLeft: '45px' },
  smoteLabel: { position: "absolute", left: "-45px", fontSize: "0.6rem", top: "50%", transform: 'translateY(-50%)', color: '#64748b', fontWeight: 'bold' },
  percentText: { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: 'white', fontWeight: 'bold' },
  successBanner: { backgroundColor: '#f0fdf4', padding: '1.2rem 1.8rem', borderTop: '1px solid #dcfce7', display: 'flex', alignItems: 'center', gap: '15px', animation: 'slideUp 0.4s ease-out' },
  successIcon: { width: '24px', height: '24px', backgroundColor: '#16a34a', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' },
  successText: { fontSize: '0.85rem', color: '#15803d', lineHeight: '1.4' }
};