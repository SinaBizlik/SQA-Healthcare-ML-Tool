export default function Stepper({ step }) {
  return (
    <div className="stepper">
      <div className={`step-pill ${step === 1 ? "active" : ""}`}>Step 1 — Clinical Context</div>
      <div className={`step-pill ${step === 2 ? "active" : ""}`}>Step 2 — Data Upload</div>
      <div className={`step-pill ${step === 3 ? "active" : ""}`}>Step 3 — Data Preparation</div>
    </div>
  );
}