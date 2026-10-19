"use client";
import { useMemo } from "react";
import type { SeriesLine } from "./types";

const COLORS = [
  "#5b9dff", "#2dd4bf", "#fbbf24", "#f87171", "#a78bfa",
  "#34d399", "#fb923c", "#f472b6", "#60a5fa", "#4ade80",
];

export default function ScoreGraph({ series }: { series: SeriesLine[] }) {
  const W = 920, H = 300, PAD_L = 46, PAD_B = 28, PAD_T = 14, PAD_R = 14;

  const { lines, yTicks } = useMemo(() => {
    let maxScore = 0, minT = Infinity, maxT = -Infinity;
    for (const s of series) {
      for (const pt of s.line) {
        maxScore = Math.max(maxScore, pt.score);
        minT = Math.min(minT, pt.t);
        maxT = Math.max(maxT, pt.t);
      }
    }
    if (!isFinite(minT)) { minT = 0; maxT = 1; }
    if (maxT === minT) maxT = minT + 1;
    maxScore = Math.max(maxScore, 1);

    const x = (t: number) => PAD_L + ((t - minT) / (maxT - minT)) * (W - PAD_L - PAD_R);
    const y = (v: number) => H - PAD_B - (v / maxScore) * (H - PAD_T - PAD_B);

    const lines = series.map((s, i) => {
      const pts = [{ t: s.line[0].t, score: 0 }, ...s.line];
      const d = pts.map((p, j) => `${j === 0 ? "M" : "L"} ${x(p.t).toFixed(1)} ${y(p.score).toFixed(1)}`).join(" ");
      return { d, color: COLORS[i % COLORS.length], name: s.name, last: pts[pts.length - 1], x, y };
    });

    const yTicks: { v: number; y: number }[] = [];
    const steps = 4;
    for (let k = 0; k <= steps; k++) {
      const v = Math.round((maxScore / steps) * k);
      yTicks.push({ v, y: y(v) });
    }
    return { lines, yTicks };
  }, [series]);

  return (
    <div>
      <div className="graph-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 560 }} role="img" aria-label="Top teams score over time">
          {yTicks.map((tk, i) => (
            <g key={i}>
              <line x1={PAD_L} y1={tk.y} x2={W - PAD_R} y2={tk.y} stroke="#243049" strokeWidth="1" />
              <text x={PAD_L - 8} y={tk.y + 4} textAnchor="end" fontSize="11" fill="#6b7a98" fontFamily="var(--font-mono)">{tk.v}</text>
            </g>
          ))}
          {lines.map((ln, i) => (
            <g key={i}>
              <path d={ln.d} fill="none" stroke={ln.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={ln.x(ln.last.t)} cy={ln.y(ln.last.score)} r="3.4" fill={ln.color} />
            </g>
          ))}
        </svg>
      </div>
      <div className="legend">
        {lines.map((ln, i) => (
          <span key={i}><i style={{ background: ln.color }} />{ln.name}</span>
        ))}
      </div>
    </div>
  );
}
