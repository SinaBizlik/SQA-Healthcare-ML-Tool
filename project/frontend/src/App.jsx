import { useState, useEffect } from "react";
import API from "./api";
import DomainSelector from "./components/DomainSelector";
import UploadSection from "./components/UploadSection";
import ColumnMapper from "./components/ColumnMapper";
import PreprocessSection from "./components/PreprocessSection";

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [schemaOK, setSchemaOK] = useState(false);
  const [showBypassError, setShowBypassError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // YENİ: 2. adımdan 3. adıma veri taşımak için merkezi hafıza
  const [datasetStats, setDatasetStats] = useState(null);

  const KAGGLE_SAMPLE = {
    Age: 67,
    Cholesterol: 208,
    Blood_Pressure: 158, 
    Smoker: "Yes (1)",
    patient_id: "BMW7812",
    Heart_Attack_Risk: 0
  };

  const DOMAINS = [
    "Cardiology – Heart Attack", "Radiology – Pneumonia", "Nephrology – CKD", 
    "Oncology – Breast", "Neurology – Parkinson's", "Endocrinology – Diabetes", 
    "Hepatology – Liver", "Cardiology – Stroke", "Mental Health – Depression", 
    "Pulmonology – COPD", "Haematology – Anaemia", "Dermatology", 
    "Ophthalmology", "Orthopaedics – Spine", "ICU / Sepsis", 
    "Obstetrics – Fetal Health", "Cardiology – Arrhythmia", "Oncology – Cervical", 
    "Thyroid / Endocrinology", "Pharmacy – Readmission"
  ];

  const [globalDomain, setGlobalDomain] = useState(DOMAINS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const STEPS = [
    { id: 1, label: "Clinical\nContext" },
    { id: 2, label: "Data\nExploration" },
    { id: 3, label: "Data\nPreparation" },
    { id: 4, label: "Model &\nParameters" },
    { id: 5, label: "Results" },
    { id: 6, label: "Explainability" },
    { id: 7, label: "Ethics & Bias" }
  ];

  const handleStepClick = (stepId) => {
    if (stepId > 3) return; 
    if (stepId === 3 && !schemaOK) {
      setShowBypassError(true);
      return;
    }
    setShowBypassError(false);
    setCurrentStep(stepId);
  };

  const handleNextStep = () => {
    if (currentStep === 2 && !schemaOK) {
      setShowBypassError(true);
      return;
    }
    if (currentStep < 7) {
      setShowBypassError(false);
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "sans-serif", display: "flex", flexDirection: "column" }}>
      
      <header style={{ backgroundColor: "#1a1f24", padding: "0.75rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white", zIndex: 1000 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M2 12H5L8 4L12 20L16 10L18 12H22" stroke="#00d1b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: "1.3rem", fontWeight: "bold" }}>HEALTH-AI</span>
        </div>
        <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{ position: "relative", backgroundColor: "#2d3748", padding: "0.5rem 1.2rem", borderRadius: "8px", cursor: "pointer", userSelect: "none" }}>
          Domain: <span style={{ color: "white", fontWeight: "bold", marginLeft: "8px" }}>{globalDomain}</span>
          {isDropdownOpen && (
            <div style={{ position: "absolute", top: "125%", right: 0, backgroundColor: "#1e293b", borderRadius: "12px", width: "250px", boxShadow: "0 10px 15px rgba(0,0,0,0.5)", zIndex: 1100, maxHeight: "400px", overflowY: "auto" }}>
              {DOMAINS.map((d, i) => (
                <div key={i} onClick={() => { setGlobalDomain(d); setIsDropdownOpen(false); }} style={{ padding: "0.75rem 1rem", color: "white", borderBottom: "1px solid #334155" }}>
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <div style={{ backgroundColor: "white", padding: "2rem 6rem", borderBottom: "1px dashed #cbd5e1", position: "relative" }}>
        <div style={{ position: "absolute", top: "calc(2rem + 20px)", left: "8rem", right: "8rem", height: "2px", backgroundColor: "#e2e8f0" }}>
          <div style={{ height: "100%", backgroundColor: "#0f766e", width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`, transition: "width 0.3s" }}></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
          {STEPS.map((step) => (
            <div key={step.id} onClick={() => handleStepClick(step.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", width: "100px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: currentStep >= step.id ? "#0f766e" : "white", color: currentStep >= step.id ? "white" : "#94a3b8", border: `2px solid ${currentStep >= step.id ? "#0f766e" : "#cbd5e1"}`, fontWeight: "bold" }}>
                {currentStep > step.id ? "✓" : step.id}
              </div>
              <div style={{ textAlign: "center", fontSize: "0.75rem", marginTop: "8px", color: currentStep >= step.id ? "#0f766e" : "#94a3b8", whiteSpace: "pre-line" }}>{step.label}</div>
            </div>
          ))}
        </div>
      </div>

      <main style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto", flex: 1, width: "100%" }}>
        {showBypassError && (
          <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "1rem", marginBottom: "2rem", borderRadius: "8px", borderLeft: "5px solid #b91c1c" }}>
            ⚠️ <b>Action Blocked:</b> You must complete and save the Column Mapping before proceeding to Step 3.
          </div>
        )}
        
        {currentStep === 1 && <DomainSelector domains={DOMAINS} globalDomain={globalDomain} setGlobalDomain={setGlobalDomain} />}
        
        {/* YENİ: onLoaded fonksiyonuna 'stats' parametresini ekledik */}
        {currentStep === 2 && (
          <UploadSection 
            onLoaded={(stats) => { 
                setDatasetStats(stats); 
                setDataLoaded(true); 
            }} 
            onOpenMapper={() => setIsModalOpen(true)} 
            schemaOK={schemaOK} 
          />
        )}

        {/* YENİ: PreprocessSection'a hafızadaki veriyi (stats) gönderdik */}
        {currentStep === 3 && <PreprocessSection stats={datasetStats} />}
      </main>

      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", width: "90%", maxWidth: "1150px", maxHeight: "90vh", overflowY: "auto", padding: "2rem" }}>
            <ColumnMapper 
              previewData={KAGGLE_SAMPLE} 
              onSaved={(shouldClose) => { 
                setSchemaOK(true); 
                setShowBypassError(false); 
                if (shouldClose) setIsModalOpen(false); 
              }} 
              onCancel={() => setIsModalOpen(false)} 
            />
          </div>
        </div>
      )}

      <footer style={{ backgroundColor: "white", padding: "1rem 4rem", display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", position: "sticky", bottom: 0 }}>
        <button 
          onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)} 
          disabled={currentStep === 1} 
          style={{ padding: "0.8rem 2rem", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer" }}
        >
          ← Previous
        </button>
        <button 
          onClick={handleNextStep} 
          style={{ padding: "0.8rem 2rem", backgroundColor: "#116964", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
        >
          Next Step →
        </button>
      </footer>
    </div>
  );
}