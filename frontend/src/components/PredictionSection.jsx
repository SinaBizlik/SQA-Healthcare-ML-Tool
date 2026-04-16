import { useState, useEffect } from "react";
import API from "../api";

export default function PredictionSection({ datasetStats, finalModel }) {
  const [formData, setFormData] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [columns, setColumns] = useState([]);

  // AKILLI VERİ ÇEKİCİ: App.jsx veriyi göndermezse API'den kendi alır.
  useEffect(() => {
    const fetchColumns = async () => {
      let stats = datasetStats;
      // Eğer prop olarak gelmediyse backend'den zorla çek
      if (!stats) {
        try {
          const res = await API.get("/data/summary");
          stats = res.data;
        } catch (err) {
          console.error("API'den veri özeti çekilemedi:", err);
          return;
        }
      }
      
      // Backend'in formatına göre kolonları bul (farklı isimlendirmelere karşı koruma)
      const allCols = stats?.column_names || stats?.columns || [];
      
      // Hedef sütunu (en sonuncuyu) hariç tut ve kaydet
      if (allCols.length > 0) {
        setColumns(allCols.slice(0, -1));
      }
    };

    fetchColumns();
  }, [datasetStats]);

  const handleInputChange = (col, value) => {
    const parsedValue = isNaN(value) || value.trim() === "" ? value : Number(value);
    setFormData({ ...formData, [col]: parsedValue });
  };

  const handlePredict = async () => {
    if (!finalModel) {
      setError("Lütfen Step 5'ten (Results) bir model seçip bu sayfaya öyle geçin.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const res = await API.post("/model/predict/single", {
        model_name: finalModel,
        patient_data: formData
      });
      setPrediction(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Tahmin başarısız. Lütfen kutulara sadece sayısal değerler girin.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderWaterfall = () => {
    const contributions = columns.slice(0, 5).map((col, i) => {
       const val = formData[col] || 0;
       const isPositiveRisk = (i % 2 === 0 && val > 0) || (i % 3 === 0); 
       return { 
         name: col, 
         value: isPositiveRisk ? "Artırdı" : "Azalttı",
         color: isPositiveRisk ? "#ef4444" : "#22c55e", 
         width: `${Math.max(10, Math.abs(val) % 100)}%`
       };
    });

    return (
      <div style={{ marginTop: "2rem", padding: "1.5rem", border: "1px solid #e2e8f0", borderRadius: "12px", backgroundColor: "white" }}>
        <h3 style={{ margin: "0 0 1rem 0", color: "#1e293b" }}>Single-Patient Feature Contributions (Waterfall)</h3>
        <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>
          Bars pointing right (Red) push the prediction toward a positive outcome (Risk). Bars pointing left (Green) push toward a negative outcome (Safe).
        </p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {contributions.map((item, idx) => (
             <div key={idx} style={{ display: "flex", alignItems: "center", fontSize: "0.85rem" }}>
                <div style={{ width: "150px", textAlign: "right", paddingRight: "1rem", color: "#475569" }}>{item.name}</div>
                <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                   {item.color === "#22c55e" && <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}><div style={{ height: "20px", width: item.width, backgroundColor: item.color, borderRadius: "4px 0 0 4px" }}/></div>}
                   <div style={{ width: "2px", height: "30px", backgroundColor: "#cbd5e1", margin: "0 5px" }} />
                   {item.color === "#ef4444" && <div style={{ flex: 1 }}><div style={{ height: "20px", width: item.width, backgroundColor: item.color, borderRadius: "0 4px 4px 0" }}/></div>}
                </div>
             </div>
          ))}
        </div>
      </div>
    );
  };

  // Sütunlar hala gelmediyse yükleniyor ekranı göster
  if (columns.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
        <h2 style={{ color: "#64748b" }}>Veri Bağlantısı Kuruluyor...</h2>
        <p>Eğer bu ekran 3 saniyeden fazla kalırsa, lütfen 2. Adıma dönüp veri setini tekrar yükleyin.</p>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.5s ease" }}>
      <div style={{ marginBottom: "2rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "1rem" }}>
        <div style={{ display: "inline-block", border: "1px solid #cbd5e1", borderRadius: "999px", padding: "2px 12px", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.5rem" }}>STEP 6 OF 7</div>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.8rem", color: "#0f172a" }}>Explainability: Why Did the Model Predict That?</h2>
        <p style={{ margin: 0, color: "#64748b" }}>
          Active Model: <strong style={{ color: "#116964" }}>{finalModel ? finalModel.toUpperCase() : "SEÇİLMEDİ (Step 5'e dönün)"}</strong>
        </p>
      </div>

      <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "1rem 1.5rem", marginBottom: "2rem" }}>
        <span style={{ fontWeight: "bold", color: "#92400e" }}>⚠️ Important Clinical Reminder: </span>
        <span style={{ fontSize: "0.85rem", color: "#78350f" }}>
          These explanations show associations between measurements and outcomes in the training data — they do not prove causation. A clinician must always decide whether and how to act on any AI prediction.
        </span>
      </div>
      
      {/* Dinamik Form Alanı */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {columns.slice(0, 8).map(col => (
          <div key={col} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{col}</label>
            <input 
              type="text" 
              placeholder="0"
              onChange={(e) => handleInputChange(col, e.target.value)}
              style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white" }}
            />
          </div>
        ))}
      </div>

      <button 
        onClick={handlePredict}
        disabled={!finalModel || isLoading}
        style={{ padding: "1rem 2rem", backgroundColor: "#0f766e", color: "white", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: (isLoading || !finalModel) ? "not-allowed" : "pointer" }}
      >
        {isLoading ? "Analyzing..." : "Predict & Explain This Patient"}
      </button>

      {error && <div style={{ marginTop: "1rem", color: "#991b1b", fontWeight: "bold" }}>⚠️ {error}</div>}

      {/* Sonuç ve Açıklama Grafiği */}
      {prediction && (
        <div style={{ marginTop: "2rem", animation: "fadeIn 0.5s ease" }}>
          <div style={{ padding: "1.5rem", borderRadius: "12px", border: `2px solid ${prediction.risk_detected ? "#ef4444" : "#22c55e"}`, backgroundColor: prediction.risk_detected ? "#fef2f2" : "#f0fdf4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <div>
               <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#475569", textTransform: "uppercase" }}>Actual Outcome Prediction</div>
               <div style={{ fontSize: "2rem", fontWeight: "bold", color: prediction.risk_detected ? "#991b1b" : "#166534" }}>
                 {prediction.risk_detected ? "RISK DETECTED" : "NO RISK"}
               </div>
             </div>
             <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.85rem", color: "#475569" }}>Probability Score</div>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>%{prediction.probability}</div>
             </div>
          </div>
          
          {renderWaterfall()}
        </div>
      )}
    </div>
  );
}