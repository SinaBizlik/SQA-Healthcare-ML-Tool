import { useState, useEffect } from "react";
import API from "../api";

const METRIC_INFO = {
  accuracy: { label: "Accuracy", desc: "Overall correct predictions", color: "#0f766e", icon: "🎯" },
  sensitivity: { label: "Sensitivity", desc: "True positive rate — most critical for screening", color: "#f59e0b", icon: "★" },
  specificity: { label: "Specificity", desc: "True negative rate", color: "#6366f1", icon: "🛡" },
  auc: { label: "AUC Score", desc: "Area under ROC curve (0.5 = random, 1.0 = perfect)", color: "#ec4899", icon: "📈" },
};

function ConfusionMatrix({ cm }) {
  if (!cm || cm.length < 2) return null;
  const [[tn, fp], [fn, tp]] = cm;
  const total = tn + fp + fn + tp;
  const cells = [
    { label: "True Negative", value: tn, color: "#dcfce7", text: "#166534", desc: "Correctly identified as not at risk" },
    { label: "False Positive", value: fp, color: "#fef3c7", text: "#92400e", desc: "Incorrectly flagged as at risk" },
    { label: "False Negative", value: fn, color: "#fee2e2", text: "#991b1b", desc: "Missed cases — most dangerous error" },
    { label: "True Positive", value: tp, color: "#dcfce7", text: "#166534", desc: "Correctly identified as at risk" },
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", maxWidth: "400px" }}>
        {cells.map((c, i) => (
          <div key={i} style={{ backgroundColor: c.color, borderRadius: "8px", padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: c.text }}>{c.value}</div>
            <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: c.text }}>{c.label}</div>
            <div style={{ fontSize: "0.65rem", color: c.text, opacity: 0.8, marginTop: "2px" }}>{c.desc}</div>
            <div style={{ fontSize: "0.65rem", color: c.text, opacity: 0.7 }}>{((c.value / total) * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}>
        Rows = Actual, Columns = Predicted. Total patients tested: {total}
      </div>
    </div>
  );
}

function GaugeBar({ value, max = 100, color }) {
  return (
    <div style={{ height: "8px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${(value / max) * 100}%`, backgroundColor: color, borderRadius: "4px", transition: "width 1s ease-out" }} />
    </div>
  );
}

// DÜZELTİLEN YER: App.jsx'in gönderdiği 'result' prop'unu alıyor.
export default function ResultsSection({ result, onFinalModelSelect }) {
  const [currentResult, setCurrentResult] = useState(result || null);
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(false);

  // App.jsx'ten gelen veri değiştiğinde burayı güncelle
  useEffect(() => {
    if (result) {
      // Eğer tekli model eğitildiyse veriyi formata sokalım
      const formattedResult = result.isSingleModel ? result[result.trainedModelName] : result;
      setCurrentResult(formattedResult);
    }
  }, [result]);

  useEffect(() => {
    const fetchComps = async () => {
      try {
        const res = await API.get("/model/comparisons");
        if(res.data && res.data.comparisons) {
             setComparisons(res.data.comparisons);
        }
      } catch { /* ignore */ }
    };
    fetchComps();
  }, [currentResult]);

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>Loading results...</div>;

  if (!currentResult) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📊</div>
        <h3 style={{ color: "#1e293b" }}>No model trained yet</h3>
        <p style={{ color: "#64748b" }}>Go back to Step 4 and train a model first.</p>
      </div>
    );
  }

  // Güvenli metrik atamaları
  const metrics = [
    { key: "accuracy", value: currentResult.accuracy || 0, suffix: "%" },
    { key: "sensitivity", value: currentResult.sensitivity || 0, suffix: "%" },
    { key: "specificity", value: currentResult.specificity || 0, suffix: "%" },
    { key: "auc", value: currentResult.auc || 0.5, suffix: "", max: 1 },
  ];

  return (
    <div style={{ animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "inline-block", border: "1px solid #cbd5e1", borderRadius: "999px", padding: "2px 12px", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.5rem" }}>STEP 5 OF 7</div>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.8rem", fontWeight: "bold", color: "#1e293b" }}>Model Results & Performance</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
          Evaluate how well your model performs on unseen patient data.
        </p>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {metrics.map(({ key, value, suffix, max = 100 }) => {
          const info = METRIC_INFO[key];
          return (
            <div key={key} style={{ backgroundColor: "white", borderRadius: "12px", padding: "1.2rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>{info.label}</div>
                <span style={{ fontSize: "1.1rem" }}>{info.icon}</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: info.color, marginBottom: "0.5rem" }}>
                {value}{suffix}
              </div>
              <GaugeBar value={key === "auc" ? value * 100 : value} color={info.color} />
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.5rem" }}>{info.desc}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Confusion Matrix */}
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#1e293b" }}>Confusion Matrix</h3>
          <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1.2rem" }}>
            Breakdown of correct and incorrect predictions on the test set.
          </p>
          <ConfusionMatrix cm={currentResult.confusion_matrix} />
        </div>

        {/* Feature Importances or Comparison */}
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
          {currentResult.feature_importances ? (
            <>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#1e293b" }}>Feature Importances</h3>
              <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1.2rem" }}>Which patient features influenced the prediction most.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {Object.entries(currentResult.feature_importances).slice(0, 8).map(([feat, val]) => (
                  <div key={feat}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "3px" }}>
                      <span style={{ color: "#374151" }}>{feat}</span>
                      <span style={{ color: "#0f766e", fontWeight: "bold" }}>{(val * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "3px" }}>
                      <div style={{ height: "100%", width: `${val * 100}%`, backgroundColor: "#0f766e", borderRadius: "3px" }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#1e293b" }}>All Trained Models</h3>
              <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1.2rem" }}>Comparison of models trained in this session.</p>
              {comparisons.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No comparisons yet. Train multiple models in Step 4.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr>
                      {["Model", "Acc", "Sens", "Spec", "AUC"].map((h) => (
                        <th key={h} style={{ textAlign: "left", color: "#94a3b8", padding: "0.4rem 0.5rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.7rem" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((c, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "0.5rem", fontWeight: "bold", color: "#1e293b" }}>{c.model_type.toUpperCase()}</td>
                        <td style={{ padding: "0.5rem", color: "#374151" }}>{c.accuracy}%</td>
                        <td style={{ padding: "0.5rem", color: "#f59e0b", fontWeight: "bold" }}>{c.sensitivity}%</td>
                        <td style={{ padding: "0.5rem", color: "#374151" }}>{c.specificity}%</td>
                        <td style={{ padding: "0.5rem", color: "#374151" }}>{c.auc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
      {/* FINAL MODEL SEÇİM BUTONU EKLENDİ */}
      <div style={{ marginTop: "2rem", textAlign: "right" }}>
        <button 
          onClick={() => {
            if(onFinalModelSelect && result.trainedModelName) {
               onFinalModelSelect(result.trainedModelName);
            }
          }}
          style={{ padding: "1rem 2rem", backgroundColor: "#116964", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
          Select This Model & Proceed to Explainability →
        </button>
      </div>
    </div>
  );
}