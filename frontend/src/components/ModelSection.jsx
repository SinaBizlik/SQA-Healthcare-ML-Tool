import { useState } from "react";
import API from "../api";
import KNNVisualizer from "./KNNVisualizer";

const MODELS = [
  { id: "knn", label: "KNN" },
  { id: "svm", label: "SVM" },
  { id: "decision_tree", label: "Decision Tree" },
  { id: "random_forest", label: "Random Forest" },
  { id: "logistic_reg", label: "Logistic Reg." },
  { id: "naive_bayes", label: "Naive Bayes" },
];

const MODEL_DESCRIPTIONS = {
  knn: {
    title: "K-Nearest Neighbors (KNN)",
    desc: `Finds the K most similar past patients in training data and predicts based on their outcomes. Like asking: "What happened to the 5 patients most similar to this one?" Intuitive and easy to explain to clinical colleagues.`,
  },
  svm: {
    title: "Support Vector Machine (SVM)",
    desc: "Finds the optimal boundary that separates classes with maximum margin. Works well with high-dimensional data and is effective in cases where the number of features exceeds the number of samples.",
  },
  decision_tree: {
    title: "Decision Tree",
    desc: "Creates a flowchart-like model of decisions. Highly interpretable — you can trace exactly why a prediction was made. Good for clinical settings where explainability matters.",
  },
  random_forest: {
    title: "Random Forest",
    desc: "Builds many decision trees and combines their predictions. Reduces overfitting compared to single trees and handles missing data well. One of the most reliable general-purpose models.",
  },
  logistic_reg: {
    title: "Logistic Regression",
    desc: "Estimates the probability of an outcome using a linear combination of features. Simple, fast, and interpretable. Provides odds ratios that clinicians can relate to.",
  },
  naive_bayes: {
    title: "Naive Bayes",
    desc: "Uses probability theory assuming features are independent. Extremely fast to train, works well with small datasets, and is robust to irrelevant features.",
  },
};

const DISTANCE_OPTIONS = [
  { value: "euclidean", label: "Euclidean (straight-line distance) — recommended" },
  { value: "manhattan", label: "Manhattan (city-block distance)" },
  { value: "minkowski", label: "Minkowski (generalised distance)" },
];

const SVM_KERNELS = [
  { value: "rbf", label: "RBF (Radial Basis Function) — recommended" },
  { value: "linear", label: "Linear" },
  { value: "poly", label: "Polynomial" },
];

export default function ModelSection({ onResultsReady }) {
  const [selectedModel, setSelectedModel] = useState("knn");
  const [trainedModels, setTrainedModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRetrain, setAutoRetrain] = useState(true);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  // KNN params
  const [kValue, setKValue] = useState(5);
  const [distanceMetric, setDistanceMetric] = useState("euclidean");

  // SVM params
  const [svmKernel, setSvmKernel] = useState("rbf");
  const [svmC, setSvmC] = useState(1.0);

  // Decision Tree params
  const [maxDepth, setMaxDepth] = useState(5);

  // Random Forest params
  const [nEstimators, setNEstimators] = useState(100);

  const getParams = () => {
    if (selectedModel === "knn") return { k: kValue, metric: distanceMetric };
    if (selectedModel === "svm") return { kernel: svmKernel, C: svmC };
    if (selectedModel === "decision_tree") return { max_depth: maxDepth };
    if (selectedModel === "random_forest") return { n_estimators: nEstimators };
    return {};
  };

  const trainModel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.post("/model/train/full", {
        model_type: selectedModel,
        params: getParams(),
      });
      const result = res.data;
      setLastResult(result);

      const entry = {
        label: `${selectedModel.toUpperCase()} (${Object.entries(getParams()).map(([k, v]) => `${k}=${v}`).join(", ")})`,
        model_type: selectedModel,
        accuracy: result.accuracy,
        sensitivity: result.sensitivity,
        specificity: result.specificity,
        auc: result.auc,
      };
      setTrainedModels((prev) => {
        const filtered = prev.filter((m) => m.label !== entry.label);
        return [...filtered, entry];
      });

      if (onResultsReady) onResultsReady(result);
    } catch (err) {
      setError(err.response?.data?.detail || "Training failed. Please complete Step 3 first.");
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (id) => {
    setSelectedModel(id);
    if (autoRetrain && lastResult) trainModel();
  };

  return (
    <div style={{ animation: "fadeIn 0.4s ease-out" }}>
      <div style={s.topBar}>
        <div>
          <div style={s.stepBadge}>STEP 4 OF 7</div>
          <h2 style={s.title}>Model Selection & Parameter Tuning</h2>
          <p style={s.subtitle}>
            Choose a machine learning algorithm, adjust its settings, and train it on your patient data. Try different models and compare their accuracy side by side.
          </p>
        </div>
        <div style={s.autoToggle}>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Auto-retrain on change:</span>
          <label style={s.toggle}>
            <input type="checkbox" checked={autoRetrain} onChange={(e) => setAutoRetrain(e.target.checked)} style={{ display: "none" }} />
            <div style={{ ...s.toggleTrack, backgroundColor: autoRetrain ? "#0f766e" : "#cbd5e1" }}>
              <div style={{ ...s.toggleThumb, transform: autoRetrain ? "translateX(20px)" : "translateX(2px)" }} />
            </div>
            <span style={{ fontSize: "0.8rem", color: autoRetrain ? "#0f766e" : "#94a3b8", fontWeight: "bold" }}>
              {autoRetrain ? "On" : "Off"}
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div style={s.errorBanner}>⚠️ {error}</div>
      )}

      <div style={s.grid}>
        {/* LEFT */}
        <div style={s.card}>
          <div style={s.sectionLabel}>CHOOSE ALGORITHM</div>
          <div style={s.modelGrid}>
            {MODELS.map((m) => {
              const isTrained = trainedModels.some((t) => t.model_type === m.id);
              const isActive = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  style={{
                    ...s.modelBtn,
                    backgroundColor: isActive ? "#1e293b" : "white",
                    color: isActive ? "white" : "#374151",
                    border: `2px solid ${isActive ? "#1e293b" : "#e2e8f0"}`,
                  }}
                >
                  {m.label}
                  {isTrained && <span style={s.checkBadge}>✓</span>}
                </button>
              );
            })}
          </div>

          <div style={s.descBox}>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b", lineHeight: 1.6 }}>
              <b>{MODEL_DESCRIPTIONS[selectedModel].title}</b> —{" "}
              {MODEL_DESCRIPTIONS[selectedModel].desc}
            </p>
          </div>

          <div style={s.sectionLabel}>PARAMETERS</div>

          {selectedModel === "knn" && (
            <>
              <div style={s.paramGroup}>
                <label style={s.paramLabel}>K — Number of Similar Patients to Compare</label>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <input
                    type="range" min={1} max={25} value={kValue}
                    onChange={(e) => setKValue(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#0f766e" }}
                  />
                  <span style={s.paramValue}>{kValue}</span>
                </div>
                <div style={s.rangeLabels}><span>1 (very specific)</span><span>25 (very general)</span></div>
                <p style={s.paramHint}>Low K = focuses on very similar cases (can be noisy). High K = considers many patients (may miss details). K=5–7 is a good starting point.</p>
              </div>
              <div style={s.paramGroup}>
                <label style={s.paramLabel}>Distance Measure (How "Similarity" is Calculated)</label>
                <select value={distanceMetric} onChange={(e) => setDistanceMetric(e.target.value)} style={s.select}>
                  {DISTANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </>
          )}

          {selectedModel === "svm" && (
            <>
              <div style={s.paramGroup}>
                <label style={s.paramLabel}>Kernel Function</label>
                <select value={svmKernel} onChange={(e) => setSvmKernel(e.target.value)} style={s.select}>
                  {SVM_KERNELS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={s.paramGroup}>
                <label style={s.paramLabel}>C — Regularisation Strength</label>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <input type="range" min={0.1} max={10} step={0.1} value={svmC}
                    onChange={(e) => setSvmC(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#0f766e" }} />
                  <span style={s.paramValue}>{svmC.toFixed(1)}</span>
                </div>
                <p style={s.paramHint}>Low C = smoother boundary (more regularisation). High C = tighter fit to training data.</p>
              </div>
            </>
          )}

          {selectedModel === "decision_tree" && (
            <div style={s.paramGroup}>
              <label style={s.paramLabel}>Max Depth</label>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <input type="range" min={1} max={20} value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "#0f766e" }} />
                <span style={s.paramValue}>{maxDepth}</span>
              </div>
              <p style={s.paramHint}>Deeper trees fit training data better but may overfit. 3–7 is typically best.</p>
            </div>
          )}

          {selectedModel === "random_forest" && (
            <div style={s.paramGroup}>
              <label style={s.paramLabel}>Number of Trees</label>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <input type="range" min={10} max={500} step={10} value={nEstimators}
                  onChange={(e) => setNEstimators(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "#0f766e" }} />
                <span style={s.paramValue}>{nEstimators}</span>
              </div>
              <p style={s.paramHint}>More trees = more stable but slower. 100–200 is usually sufficient.</p>
            </div>
          )}

          {(selectedModel === "logistic_reg" || selectedModel === "naive_bayes") && (
            <div style={s.paramGroup}>
              <p style={s.paramHint}>No parameters to tune for this model. Click Train Model to proceed.</p>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button onClick={trainModel} disabled={loading} style={s.trainBtn}>
              {loading ? "⏳ Training..." : "⚡ Train Model"}
            </button>
            {trainedModels.length > 0 && (
              <button
                onClick={trainModel}
                disabled={loading}
                style={s.compareBtn}
              >
                + Compare
              </button>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={s.card}>
            <div style={s.sectionLabel}>
              {selectedModel === "knn" ? "KNN VISUALISATION — HOW THE ALGORITHM THINKS" : "MODEL VISUALISATION"}
            </div>
            {selectedModel === "knn" ? (
              <>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
                  Each dot is a past patient. The ★ is a new patient. The highlighted ring shows the {kValue} nearest neighbours used to make the prediction.
                </p>
                <KNNVisualizer k={kValue} scatterData={lastResult?.knn_scatter} />
              </>
            ) : (
              <div style={s.vizPlaceholder}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  {selectedModel === "svm" ? "⚙️" : selectedModel === "decision_tree" ? "🌿" : selectedModel === "random_forest" ? "🌲" : selectedModel === "logistic_reg" ? "📈" : "📊"}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.9rem" }}>
                  Train the model to see visualisation
                </div>
              </div>
            )}
          </div>

          {trainedModels.length > 0 && (
            <div style={s.card}>
              <div style={s.sectionLabel}>MODEL COMPARISON</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["MODEL & SETTINGS", "ACCURACY", "SENSITIVITY ★", "SPECIFICITY", "AUC"].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trainedModels.map((m, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={s.td}>{m.label}</td>
                      <td style={s.td}>{m.accuracy}%</td>
                      <td style={{ ...s.td, color: m.sensitivity < 70 ? "#f59e0b" : "#16a34a", fontWeight: "bold" }}>{m.sensitivity}%</td>
                      <td style={s.td}>{m.specificity}%</td>
                      <td style={s.td}>{m.auc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.75rem" }}>
                ★ Sensitivity = how many of the truly positive patients did the model catch? This is the most important metric in screening.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  stepBadge: { display: "inline-block", border: "1px solid #cbd5e1", borderRadius: "999px", padding: "2px 12px", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.5rem" },
  title: { margin: "0 0 0.5rem", fontSize: "1.8rem", fontWeight: "bold", color: "#1e293b" },
  subtitle: { margin: 0, color: "#64748b", fontSize: "0.9rem", maxWidth: "600px" },
  autoToggle: { display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "white", padding: "0.75rem 1.2rem", borderRadius: "8px", border: "1px solid #e2e8f0" },
  toggle: { display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" },
  toggleTrack: { width: "44px", height: "24px", borderRadius: "12px", position: "relative", transition: "background-color 0.2s" },
  toggleThumb: { position: "absolute", top: "2px", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "white", transition: "transform 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },
  errorBanner: { backgroundColor: "#fef2f2", color: "#b91c1c", padding: "1rem", borderRadius: "8px", borderLeft: "4px solid #b91c1c", marginBottom: "1.5rem", fontSize: "0.9rem" },
  grid: { display: "grid", gridTemplateColumns: "420px 1fr", gap: "1.5rem", alignItems: "start" },
  card: { backgroundColor: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  sectionLabel: { fontSize: "0.7rem", fontWeight: "bold", color: "#94a3b8", letterSpacing: "0.08em", marginBottom: "1rem" },
  modelGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1.2rem" },
  modelBtn: { padding: "0.6rem 0.5rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: "600", position: "relative", transition: "all 0.15s" },
  checkBadge: { position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#0f766e", color: "white", borderRadius: "50%", width: "16px", height: "16px", fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center" },
  descBox: { backgroundColor: "#f8fafc", borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem", borderLeft: "3px solid #0f766e" },
  paramGroup: { marginBottom: "1.2rem" },
  paramLabel: { display: "block", fontSize: "0.82rem", fontWeight: "bold", color: "#334155", marginBottom: "0.6rem" },
  paramValue: { minWidth: "32px", textAlign: "center", fontWeight: "bold", color: "#0f766e", fontSize: "1.1rem" },
  rangeLabels: { display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#94a3b8", marginTop: "4px" },
  paramHint: { fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem", lineHeight: 1.5 },
  select: { width: "100%", padding: "0.7rem", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", fontSize: "0.85rem" },
  trainBtn: { flex: 1, padding: "0.9rem", backgroundColor: "#116964", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "0.95rem" },
  compareBtn: { padding: "0.9rem 1.2rem", backgroundColor: "white", color: "#374151", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" },
  vizPlaceholder: { height: "200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", borderRadius: "8px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" },
  th: { textAlign: "left", fontSize: "0.7rem", fontWeight: "bold", color: "#94a3b8", padding: "0.6rem 0.75rem", borderBottom: "2px solid #f1f5f9", letterSpacing: "0.05em" },
  td: { padding: "0.9rem 0.75rem", color: "#374151" },
};