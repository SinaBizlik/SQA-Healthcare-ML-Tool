from app.schemas import DomainContextResponse

DOMAIN_CONTEXTS: dict[str, dict[str, str]] = {
    "Cardiology": {
        "clinical_question": "Can we predict which heart failure patients are at highest risk of hospital readmission within 30 days of discharge, so we can provide enhanced post-discharge support and monitoring?",
        "patient_impact": "Heart failure readmissions are often preventable with proper post-discharge care. Early identification of high-risk patients enables targeted interventions that can improve patient outcomes and quality of life.",
        "healthcare_system_impact": "30-day heart failure readmissions cost healthcare systems approximately €15,000 per patient. Reducing preventable readmissions can significantly lower healthcare costs while improving care quality.",
        "clinical_workflow": "This prediction model will help clinicians prioritize which patients need intensive discharge planning, home health visits, and closer follow-up monitoring.",
        "clinical_note": "Machine learning models are decision support tools, not replacements for clinical judgment. All predictions should be reviewed by qualified healthcare professionals and integrated with comprehensive patient assessments, clinical guidelines, and individual patient circumstances."
    },
    "Neurology": {
        "clinical_question": "Can we predict early onset of Alzheimer's disease using patient cognitive test scores and demographic data?",
        "patient_impact": "Early detection allows patients and families to plan ahead and begin treatments that may slow symptom progression.",
        "healthcare_system_impact": "Proactive management reduces emergency interventions and long-term care costs.",
        "clinical_workflow": "Helps neurologists flag high-risk individuals for advanced imaging or specialized memory care.",
        "clinical_note": "Machine learning models are decision support tools, not replacements for clinical judgment."
    },
    "Oncology": {
        "clinical_question": "Can we classify benign vs. malignant tumors accurately based on biopsy characteristics?",
        "patient_impact": "Reduces the waiting time for diagnoses, alleviating patient anxiety and speeding up life-saving treatments.",
        "healthcare_system_impact": "Optimizes pathology lab workflows and reduces the need for secondary biopsies.",
        "clinical_workflow": "Acts as a second opinion for pathologists, highlighting areas of concern in tissue samples.",
        "clinical_note": "Machine learning models are decision support tools, not replacements for clinical judgment."
    },
    "Radiology": {
        "clinical_question": "Can we automate the detection of pneumonia in chest X-ray images?",
        "patient_impact": "Faster triage for acute respiratory distress patients in the emergency department.",
        "healthcare_system_impact": "Decreases radiologist burnout by pre-screening and prioritizing critical scans.",
        "clinical_workflow": "Integrates directly into the PACS system to flag abnormal X-rays before the radiologist opens them.",
        "clinical_note": "Machine learning models are decision support tools, not replacements for clinical judgment."
    },
    "Pathology": {
        "clinical_question": "Can we predict disease progression based on cellular morphology anomalies?",
        "patient_impact": "Enables personalized medicine by accurately staging diseases at the microscopic level.",
        "healthcare_system_impact": "Standardizes grading across different laboratories, reducing human error.",
        "clinical_workflow": "Assists in slide review by automatically counting and classifying abnormal cells.",
        "clinical_note": "Machine learning models are decision support tools, not replacements for clinical judgment."
    },
    "Emergency Medicine": {
        "clinical_question": "Can we predict patient admission probability directly from triage vitals and initial complaints?",
        "patient_impact": "Reduces waiting room times and speeds up the allocation of hospital beds.",
        "healthcare_system_impact": "Improves ER throughput and resource allocation during peak hours.",
        "clinical_workflow": "Alerts the charge nurse to request bed assignments early for high-risk triage patients.",
        "clinical_note": "Machine learning models are decision support tools, not replacements for clinical judgment."
    },
    "General Medicine": {
        "clinical_question": "Can we identify patients at risk of developing Type 2 Diabetes within the next 5 years?",
        "patient_impact": "Empowers patients to make lifestyle changes before the onset of chronic disease.",
        "healthcare_system_impact": "Massive reduction in chronic care costs, medication, and management programs.",
        "clinical_workflow": "Triggers automated referrals to nutritionists and preventative care pathways during routine check-ups.",
        "clinical_note": "Machine learning models are decision support tools, not replacements for clinical judgment."
    }
}

DEFAULT_DOMAINS = [
    "Cardiology",
    "Neurology",
    "Oncology",
    "Radiology",
    "Pathology",
    "Emergency Medicine",
    "General Medicine",
]


def get_all_domains() -> list[str]:
    return DEFAULT_DOMAINS


def get_context_for_domain(domain: str) -> DomainContextResponse:
    info = DOMAIN_CONTEXTS.get(domain, DOMAIN_CONTEXTS["Cardiology"])
    return DomainContextResponse(
        domain=domain,
        clinical_question=info["clinical_question"],
        patient_impact=info["patient_impact"],
        healthcare_system_impact=info["healthcare_system_impact"],
        clinical_workflow=info["clinical_workflow"],
        clinical_note=info["clinical_note"]
    )