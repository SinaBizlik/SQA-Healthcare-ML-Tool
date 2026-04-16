import { useState } from "react";

export default function DomainSelector({ domains, globalDomain, setGlobalDomain }) {
  const CLINICAL_CONTEXTS = {
    "Cardiology – Heart Attack": {
      question: "Can we predict the acute risk of myocardial infarction in patients presenting with atypical chest pain by analyzing cardiovascular biomarkers and clinical history?",
      patientImpact: "Early identification allows for immediate reperfusion therapy, significantly reducing the probability of permanent cardiac muscle damage.",
      systemImpact: "Accurate triage reduces unnecessary admissions for low-risk chest pain, saving significant hospital resources.",
      clinicalWorkflow: "Acts as a decision support tool, flagging high-risk patient profiles for prioritized access to the cardiac catheterization lab."
    },
    "Radiology – Pneumonia": {
      question: "How effectively can machine learning distinguish between normal lung presentation and pneumonia patterns using NIH Chest X-Ray clinical features?",
      patientImpact: "Patients receive appropriate respiratory therapy faster, preventing the progression of simple infections into respiratory failure.",
      systemImpact: "Automated screening of imaging metadata optimizes the radiology department's workflow and diagnostic turnaround time.",
      clinicalWorkflow: "Integrated into the diagnostic pipeline to ensure that suspicious findings are reviewed by a senior radiologist as a priority."
    },
    "Nephrology – CKD": {
      question: "Can we accurately determine chronic kidney disease presence and stage by evaluating routine lab values such as creatinine and electrolyte balance?",
      patientImpact: "Early and precise staging allows for therapeutic interventions that can delay the onset of end-stage renal disease and the need for dialysis.",
      systemImpact: "Proactive management of CKD reduces the massive long-term costs of recurring dialysis services.",
      clinicalWorkflow: "Monitors long-term lab trends, alerting nephrologists when a patient's data indicates a transition to a more severe stage."
    },
    "Oncology – Breast": {
      question: "Can machine learning reliably classify breast biopsy findings as malignant or benign based on microscopic cell measurements?",
      patientImpact: "Women avoid the physiological trauma of invasive surgical procedures for benign masses while ensuring malignant tumors are caught at a treatable stage.",
      systemImpact: "Standardizing biopsy interpretation reduces the rate of false positives and lowers the burden on oncology surgical units.",
      clinicalWorkflow: "Provides a secondary validation for pathologists, highlighting specific cell clusters that indicate malignancy for closer inspection."
    },
    "Neurology – Parkinson's": {
      question: "To what extent can Parkinson's disease presence be predicted using non-invasive voice biomarkers and vocal frequency analysis?",
      patientImpact: "Early diagnosis enables the initiation of neuroprotective strategies years earlier, preserving motor function and independence.",
      systemImpact: "Reducing fall-related emergency visits and specialized nursing home admissions provides a significant economic benefit.",
      clinicalWorkflow: "Analyzes periodic voice assessments to alert neurologists if vocal patterns show signs of early-onset disease progression."
    },
    "Endocrinology – Diabetes": {
      question: "Can we predict the onset of Type 2 diabetes within a 5-year window by evaluating metabolic markers and clinical risk factors?",
      patientImpact: "Identifies patients who will benefit most from intensive lifestyle coaching and Metformin therapy, preventing full diabetic complications.",
      systemImpact: "Preventing diabetes prevents lifelong costs associated with its complications, such as heart disease and kidney failure.",
      clinicalWorkflow: "Primary care practitioners use the model to stratify their patient population, focusing resources on those in the high-risk category."
    },
    "Hepatology – Liver": {
      question: "Can a predictive model accurately detect the presence of liver disease by analyzing routine liver function blood test results?",
      patientImpact: "Earlier detection of liver dysfunction allows for curative treatments before the onset of irreversible cirrhosis or hepatocellular carcinoma.",
      systemImpact: "Identifying carriers early prevents future high-cost liver transplants and long-term care for end-stage liver disease.",
      clinicalWorkflow: "The model runs as a background process on all routine metabolic panels, alerting clinicians when a profile suggests pathology."
    },
    "Cardiology – Stroke": {
      question: "How effectively can we predict ischemic stroke risk by integrating patient demographics with known comorbidities like hypertension?",
      patientImpact: "High-risk patients receive immediate anticoagulation or carotid interventions, preventing debilitating strokes and preserving cognitive function.",
      systemImpact: "Preventing major strokes saves the system the massive socio-economic cost of post-stroke rehabilitation and disability.",
      clinicalWorkflow: "Used in primary care clinics to prioritize patients who need emergency cardiovascular imaging and aggressive monitoring."
    },
    "Mental Health – Depression": {
      question: "Can we determine depression severity and symptom categorization by analyzing survey responses such as PHQ-9 metrics?",
      patientImpact: "Patients receive treatment plans tailored to their specific severity level, reducing the risk of self-harm and social withdrawal.",
      systemImpact: "Effective outpatient management lowers the demand for high-cost acute psychiatric inpatient beds.",
      clinicalWorkflow: "Provides the psychiatrist with a 'Severity Index' to track treatment response over time during outpatient visits."
    },
    "Pulmonology – COPD": {
      question: "Can machine learning predict the risk of acute COPD exacerbations by analyzing longitudinal spirometry data and patient activity?",
      patientImpact: "Ensures patients receive correct maintenance therapy, preventing acute attacks that lead to lung function decline.",
      systemImpact: "Reducing exacerbation-related hospitalizations lowers emergency department congestion and inpatient costs.",
      clinicalWorkflow: "Monitors patient-reported data and spirometry, flagging high-risk profiles for immediate clinical review before a crisis occurs."
    },
    "Haematology – Anaemia": {
      question: "Is it possible to automate the classification of anaemia types by analyzing full blood count results and laboratory parameters?",
      patientImpact: "Patients receive the correct treatment (e.g., iron vs. genetic counseling) faster, resolving chronic fatigue symptoms sooner.",
      systemImpact: "Automated hematology screening reduces the time pathologists spend on manual blood smear reviews, increasing lab capacity.",
      clinicalWorkflow: "Provides a 'Differential Category' alongside raw blood count results, helping general practitioners make faster referral decisions."
    },
    "Dermatology": {
      question: "Can we reliably distinguish between benign and malignant skin lesions using dermoscopy features and clinical skin measurements?",
      patientImpact: "Early identification of melanoma saves lives, while accurate benign classification avoids unnecessary surgical scars.",
      systemImpact: "Reducing redundant skin biopsies for benign lesions saves millions in surgical and pathology costs.",
      clinicalWorkflow: "Dermatologists use the model as a 'second opinion' during clinical exams to confirm suspicious lesion categories."
    },
    "Ophthalmology": {
      question: "How accurately can machine learning grade the severity of diabetic retinopathy using retinal photography and clinical findings?",
      patientImpact: "Prevents irreversible blindness in diabetic patients by catching microvascular changes early enough for laser therapy.",
      systemImpact: "Moving retinopathy screening from hospitals to community clinics via AI reduces the ophthalmology department's burden.",
      clinicalWorkflow: "Instantly flags those with high-grade severity for immediate specialist referral based on retinal photography analysis."
    },
    "Orthopaedics – Spine": {
      question: "Can biomechanical measures be used to accurately differentiate between a normal spine and conditions such as disc herniation?",
      patientImpact: "Patients receive targeted physical therapy or surgical intervention sooner, avoiding chronic pain and mobility limitations.",
      systemImpact: "Decreasing the long-term socio-economic cost of workplace disability provides a massive economic benefit to the system.",
      clinicalWorkflow: "Orthopedists use the model's biomechanical analysis to guide the initial diagnosis and correct treatment pathway."
    },
    "ICU / Sepsis": {
      question: "Can we predict the onset of sepsis in ICU patients by evaluating real-time vital signs and multivariate laboratory test results?",
      patientImpact: "Early detection literally saves lives in the critical care setting, as every hour of delayed diagnosis increases mortality.",
      systemImpact: "Preventing full septic shock reduces the length of ICU stays and the need for expensive life-support interventions.",
      clinicalWorkflow: "Acts as a continuous monitor on the ICU ward, sounding an alert the moment a patient's data indicates early-stage sepsis."
    },
    "Obstetrics – Fetal Health": {
      question: "How effectively can fetal health be classified as normal or pathological using automated cardiotocography (CTG) analysis?",
      patientImpact: "Early detection of fetal distress allows for timely intervention, preventing neonatal brain damage or stillbirth.",
      systemImpact: "Reducing missed fetal distress signals lowers the rate of lifelong disability care and related legal costs for hospitals.",
      clinicalWorkflow: "Integrated into the labor ward monitors to flag pathological CTG patterns for immediate review by the obstetrician."
    },
    "Cardiology – Arrhythmia": {
      question: "Can machine learning reliably detect the presence of cardiac arrhythmia by analyzing standardized ECG features and heart rhythm?",
      patientImpact: "Early detection prevents stroke and sudden cardiac arrest through timely anticoagulation or ablation therapies.",
      systemImpact: "Automated ECG screening reduces the time spent by cardiologists on routine rhythm analysis, allowing focus on complex cases.",
      clinicalWorkflow: "Pre-analyzes every ECG performed in the clinic, highlighting 'Arrhythmia Detected' cases for prioritized review."
    },
    "Oncology – Cervical": {
      question: "Can we classify cervical cancer risk levels by integrating demographic data with behavioral risk factors and biopsy findings?",
      patientImpact: "Personalized screening intervals mean low-risk women have fewer exams, while high-risk patients are identified before cancer develops.",
      systemImpact: "A risk-stratified screening program is 20% more cost-effective than standard age-based screening approaches.",
      clinicalWorkflow: "Integrated into the screening registry to suggest recall dates based on the individual's specific clinical risk profile."
    },
    "Thyroid / Endocrinology": {
      question: "Can thyroid function be accurately classified into hypo, hyper, or normal categories based on TSH and hormonal panel data?",
      patientImpact: "Patients receive the correct medication faster, resolving metabolic and energy symptoms more effectively.",
      systemImpact: "Automated pre-sorting of endocrine lab results allows specialists to focus on high-complexity autoimmune cases.",
      clinicalWorkflow: "Pre-populates EHR with suggested diagnostic categories based on the latest lab panel data, streamlining the clinic."
    },
    "Pharmacy – Readmission": {
      question: "Can we predict the 30-day hospital readmission risk for diabetic patients based on their medication regimens and lab results?",
      patientImpact: "Identifies patients who need intensive education on medication adherence before discharge to prevent symptomatic relapses.",
      systemImpact: "Reducing readmissions for chronic conditions like diabetes lowers the overall hospital bed occupancy and costs.",
      clinicalWorkflow: "Pharmacists receive a 'High Risk' list each morning, allowing them to prioritize these patients for discharge counseling."
    }
  };

  const context = CLINICAL_CONTEXTS[globalDomain] || CLINICAL_CONTEXTS["Cardiology – Heart Attack"];

  const PRODUCTION_STEPS = [
    { s: 1, t: "Problem Definition", d: "Clear statement of what clinical question you're trying to answer" },
    { s: 2, t: "Dataset & Variables", d: "List of patient data you'll collect (e.g., age, lab results, medications)" },
    { s: 3, t: "Clean Dataset", d: "Data that's been checked for errors, missing values filled in appropriately" },
    { s: 4, t: "Model Choice", d: "Selection of appropriate algorithm (e.g., logistic regression, random forest)" },
    { s: 5, t: "Trained Model", d: "Algorithm that has 'learned' patterns from historical patient data" },
    { s: 6, t: "Performance Metrics", d: "How accurate the model is (e.g., catches 85% of high-risk patients)" },
    { s: 7, t: "Implementation Plan", d: "How the model will be integrated into clinical workflow and monitored" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", paddingBottom: "2rem", borderBottom: "1px dashed #cbd5e1" }}>
        {domains.map((domain, idx) => (
          <button
            key={idx}
            onClick={() => setGlobalDomain(domain)}
            style={{
              padding: "0.8rem 0.5rem", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "0.75rem",
              backgroundColor: globalDomain === domain ? "#0f766e" : "white",
              color: globalDomain === domain ? "white" : "#4b5563",
              border: `1px solid ${globalDomain === domain ? "#0f766e" : "#cbd5e1"}`,
              transition: "all 0.2s"
            }}
          >
            {domain}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "2rem" }}>
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "2.5rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.3rem", color: "#1e293b" }}>Step 1 of 7: Clinical Context & Problem Definition</h2>
          <div style={{ backgroundColor: "#d1fae5", color: "#065f46", padding: "0.5rem 1rem", borderRadius: "6px", display: "inline-block", fontSize: "0.85rem", fontWeight: "bold", margin: "1.5rem 0" }}>
            Domain: {globalDomain}
          </div>
          <div style={{ backgroundColor: "#eff6ff", padding: "1.5rem", borderRadius: "12px", border: "1px solid #dbeafe", marginBottom: "2rem" }}>
            <h3 style={{ marginTop: 0, fontSize: "1.1rem", color: "#1e40af" }}>Clinical Question</h3>
            <p style={{ margin: 0, fontSize: "1.1rem", color: "#1e3a8a", lineHeight: "1.6" }}>
              "{context.question}"
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Why This Matters</h3>
            <div style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>
              <strong style={{ display: "block", marginBottom: "0.3rem" }}>Patient Impact:</strong> 
              <span style={{ color: "#475569" }}>{context.patientImpact}</span>
            </div>
            <div style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>
              <strong style={{ display: "block", marginBottom: "0.3rem" }}>Healthcare System Impact:</strong> 
              <span style={{ color: "#475569" }}>{context.systemImpact}</span>
            </div>
            <div style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>
              <strong style={{ display: "block", marginBottom: "0.3rem" }}>Clinical Workflow:</strong> 
              <span style={{ color: "#475569" }}>{context.clinicalWorkflow}</span>
            </div>
          </div>
          <div style={{ backgroundColor: "#fffbeb", padding: "1.5rem", borderRadius: "12px", borderLeft: "4px solid #f59e0b", marginTop: "2.5rem" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
               <span style={{ fontSize: "1.2rem" }}>⚠️</span>
               <div>
                 <strong style={{ display: "block", marginBottom: "0.5rem" }}>Important Clinical Note</strong>
                 <p style={{ margin: 0, fontSize: "0.9rem", color: "#92400e", lineHeight: "1.5" }}>
                   Machine learning models are decision support tools, not replacements for clinical judgment. All predictions should be reviewed by qualified professionals.
                 </p>
               </div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "2rem", border: "1px solid #e2e8f0" }}>
          <h3 style={{ marginTop: 0, fontSize: "1.1rem", paddingBottom: "1.5rem", color: "#1e293b" }}>WHAT WILL BE PRODUCED IN EACH STEP</h3>
          <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#64748b", textAlign: "left", fontSize: "0.8rem" }}>
                <th style={{ padding: "0.5rem" }}>Step</th>
                <th style={{ padding: "0.5rem" }}>What You Will Create</th>
                <th style={{ padding: "0.5rem" }}>Plain English Meaning</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTION_STEPS.map(item => (
                <tr key={item.s} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: item.s === 1 ? "#f0fdfa" : "transparent" }}>
                  <td style={{ padding: "1.2rem 0.5rem" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: item.s === 1 ? "#0f766e" : "#f1f5f9", color: item.s === 1 ? "white" : "#64748b", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", fontSize: "0.8rem" }}>{item.s}</div>
                  </td>
                  <td style={{ padding: "1.2rem 0.5rem", fontWeight: "bold", color: item.s === 1 ? "#0f766e" : "#334155", maxWidth: "120px" }}>{item.t}</td>
                  <td style={{ padding: "1.2rem 0.5rem", color: "#64748b", lineHeight: "1.4" }}>{item.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}