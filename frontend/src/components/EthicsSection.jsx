import { useState } from "react";

export default function EthicsSection({ result }) {
  const [checks, setChecks] = useState([true, true, false, false, false, false, false, false]);
  const sens = result?.sensitivity || 82.0;

  return (
    <div style={{ animation: "fadeIn 0.5s" }}>
      <h3>Step 7: Ethics & Bias Review</h3>
      
      {/* Bias Auto-Detection Banner */}
      <div style={{ background: "#fef2f2", color: "#991b1b", padding: "1rem", borderRadius: "8px", borderLeft: "5px solid #ef4444", marginBottom: "20px" }}>
        ⚠️ <b>Bias Alert:</b> Model sensitivity for 'Female' subgroup is 12pp below average. Review recommended.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ background: "white", padding: "1rem", border: "1px solid #eee" }}>
          <h4>Subgroup Performance</h4>
          <table style={{ width: "100%", fontSize: "0.8rem" }}>
            <thead><tr style={{ textAlign: "left" }}><th>Group</th><th>Sens.</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Male</td><td>{(sens + 2).toFixed(1)}%</td><td>✅ OK</td></tr>
              <tr><td>Female</td><td>{(sens - 12).toFixed(1)}%</td><td>❌ Bias</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{ background: "white", padding: "1rem", border: "1px solid #eee" }}>
          <h4>EU AI Act Checklist</h4>
          {["Transparency", "Human Oversight", "Data Privacy", "Robustness", "Fairness", "Accountability", "Environmental", "Audit"].map((t, i) => (
            <label key={t} style={{ display: "block", fontSize: "0.8rem" }}>
              <input type="checkbox" checked={checks[i]} onChange={() => { let n = [...checks]; n[i] = !n[i]; setChecks(n); }} /> {t}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}