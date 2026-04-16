import { useEffect, useRef, useState } from "react";

const COLORS = { 0: "#f87171", 1: "#4ade80" };
const LABELS = { 0: "Readmitted", 1: "Not Readmitted" };

function generateDemoPoints(k) {
  const points = [];
  const rng = (min, max) => Math.random() * (max - min) + min;
  for (let i = 0; i < 40; i++) {
    const label = Math.random() > 0.45 ? 1 : 0;
    let x, y;
    if (label === 1) { x = rng(0.3, 0.9); y = rng(0.2, 0.8); }
    else { x = rng(0.1, 0.7); y = rng(0.2, 0.8); }
    points.push({ x, y, label });
  }
  return points;
}

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export default function KNNVisualizer({ k = 5, scatterData }) {
  const [points, setPoints] = useState([]);
  const [newPatient] = useState({ x: 0.52, y: 0.48 });
  const [hover, setHover] = useState(null);
  const W = 720, H = 220;

  useEffect(() => {
    if (scatterData?.train_points) {
      // Real data from backend
      const pts = scatterData.train_points.map(([x, y, label]) => ({ x, y, label }));
      // Normalize
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const norm = pts.map((p) => ({
        x: (p.x - minX) / (maxX - minX + 0.001) * 0.85 + 0.07,
        y: (p.y - minY) / (maxY - minY + 0.001) * 0.8 + 0.05,
        label: p.label,
      }));
      setPoints(norm);
    } else {
      setPoints(generateDemoPoints(k));
    }
  }, [scatterData, k]);

  const sorted = [...points].sort((a, b) => dist(a, newPatient) - dist(b, newPatient));
  const neighbours = sorted.slice(0, k);
  const kRadius = neighbours.length > 0 ? dist(neighbours[neighbours.length - 1], newPatient) : 0.15;

  const px = (v) => v * W;
  const py = (v) => v * H;

  const prediction = neighbours.filter((n) => n.label === 1).length > neighbours.length / 2 ? 1 : 0;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
        {/* K-radius circle */}
        <circle
          cx={px(newPatient.x)} cy={py(newPatient.y)}
          r={kRadius * W}
          fill="rgba(15,118,110,0.06)" stroke="#0f766e" strokeWidth="1.5" strokeDasharray="6 4"
        />
        {/* Neighbour lines */}
        {neighbours.map((n, i) => (
          <line key={i}
            x1={px(newPatient.x)} y1={py(newPatient.y)}
            x2={px(n.x)} y2={py(n.y)}
            stroke="#0f766e" strokeWidth="1" strokeOpacity="0.4"
          />
        ))}
        {/* All points */}
        {points.map((p, i) => {
          const isNeighbour = neighbours.includes(p);
          return (
            <circle key={i}
              cx={px(p.x)} cy={py(p.y)}
              r={isNeighbour ? 7 : 5}
              fill={COLORS[p.label]}
              opacity={isNeighbour ? 1 : 0.55}
              stroke={isNeighbour ? "white" : "none"}
              strokeWidth={2}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer", filter: isNeighbour ? "drop-shadow(0 0 3px rgba(0,0,0,0.3))" : "none" }}
            />
          );
        })}
        {/* New patient star */}
        <text x={px(newPatient.x)} y={py(newPatient.y) + 5} textAnchor="middle" fontSize="18" fill="#1e293b">★</text>
        {/* Tooltip */}
        {hover !== null && points[hover] && (
          <g>
            <rect x={px(points[hover].x) + 10} y={py(points[hover].y) - 24} width="110" height="22" rx="4" fill="#1e293b" opacity="0.85" />
            <text x={px(points[hover].x) + 65} y={py(points[hover].y) - 9} textAnchor="middle" fontSize="11" fill="white">
              {LABELS[points[hover].label]}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        {[0, 1].map((label) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#64748b" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: COLORS[label] }} />
            {LABELS[label]}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#64748b" }}>
          <span>★</span> New Patient
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#64748b" }}>
          <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#0f766e" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
          K-radius
        </div>
        {neighbours.length > 0 && (
          <div style={{ marginLeft: "auto", fontSize: "0.8rem", backgroundColor: prediction === 1 ? "#dcfce7" : "#fef2f2", color: prediction === 1 ? "#16a34a" : "#dc2626", padding: "3px 10px", borderRadius: "999px", fontWeight: "bold" }}>
            Prediction: {LABELS[prediction]}
          </div>
        )}
      </div>
    </div>
  );
}