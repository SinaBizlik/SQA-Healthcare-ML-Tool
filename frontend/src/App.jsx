import { useState } from "react";
import DomainSelector from "./components/DomainSelector";
import UploadSection from "./components/UploadSection";
import PreprocessSection from "./components/PreprocessSection";
import ModelSection from "./components/ModelSection";
import ResultsSection from "./components/ResultsSection";
import PredictionSection from "./components/PredictionSection";
import EthicsSection from "./components/EthicsSection";

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [datasetStats, setDatasetStats] = useState(null);
  const [lastModelResult, setLastModelResult] = useState(null);
  const [finalModel, setFinalModel] = useState(null);
  const [globalDomain, setGlobalDomain] = useState("Cardiology – Heart Attack");

  const DOMAINS = ["Cardiology – Heart Attack", "Radiology – Pneumonia", "Nephrology – CKD", "Oncology – Breast"];
  const STEPS = [
    { id: 1, label: "Context" }, { id: 2, label: "Upload" }, { id: 3, label: "Prepare" },
    { id: 4, label: "Train" }, { id: 5, label: "Results" }, { id: 6, label: "Explain" }, { id: 7, label: "Ethics" }
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      <header style={{ backgroundColor: "#1a1f24", color: "white", padding: "1rem 2rem", display: "flex", justifyContent: "space-between" }}>
        <b>🩺 HEALTH-AI</b> <span>{globalDomain}</span>
      </header>

      {/* Stepper */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "1.5rem 10%", background: "white", borderBottom: "1px solid #ddd" }}>
        {STEPS.map(s => (
          <div key={s.id} onClick={() => s.id <= currentStep + 1 && setCurrentStep(s.id)} style={{ cursor: "pointer", opacity: currentStep >= s.id ? 1 : 0.3, textAlign: "center" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#0f766e", color: "white", lineHeight: "30px", margin: "0 auto" }}>{s.id}</div>
            <div style={{ fontSize: "0.6rem", marginTop: "5px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", marginBottom: "100px" }}>
        {/* BEYAZ EKRAN ÇÖZÜMÜ: domains prop'u eklendi */}
        {currentStep === 1 && <DomainSelector domains={DOMAINS} globalDomain={globalDomain} setGlobalDomain={setGlobalDomain} onSelect={() => setCurrentStep(2)} />}
        {currentStep === 2 && <UploadSection onLoaded={setDatasetStats} onNext={() => setCurrentStep(3)} />}
        {currentStep === 3 && <PreprocessSection stats={datasetStats} onNext={() => setCurrentStep(4)} />}
        {currentStep === 4 && <ModelSection onResultsReady={(res) => { setLastModelResult(res); setCurrentStep(5); }} />}
        {currentStep === 5 && <ResultsSection result={lastModelResult} onFinalModelSelect={(m) => { setFinalModel(m); setCurrentStep(6); }} />}
        {currentStep === 6 && <PredictionSection datasetStats={datasetStats} finalModel={finalModel} />}
        {currentStep === 7 && <EthicsSection result={lastModelResult} />}
      </main>

      {/* Footer Navigasyon */}
      <footer style={{ position: "fixed", bottom: 0, width: "100%", padding: "1rem 3rem", background: "white", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", zIndex: 1000 }}>
        <button onClick={() => setCurrentStep(p => Math.max(1, p - 1))}>← Back</button>
        <button onClick={() => setCurrentStep(p => Math.min(7, p + 1))} style={{ background: "#0f766e", color: "white", border: "none", padding: "0.5rem 2rem", borderRadius: "6px" }}>Next Step →</button>
      </footer>
    </div>
  );
}