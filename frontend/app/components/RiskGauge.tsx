"use client";
import { useEffect, useRef } from "react";

interface Props { probability: number; riskLevel: string; animate?: boolean; size?: number; }

const RISK_COLORS: Record<string, string> = {
  Low: "#00e676",
  Moderate: "#ffab40",
  High: "#ff5252",
};

export default function RiskGauge({ probability, riskLevel, animate = true, size = 200 }: Props) {
  const circleRef = useRef<SVGCircleElement>(null);
  const r = 80;
  const circ = 2 * Math.PI * r;
  // Arc spans 240° (from 150° to 390°), starting from bottom-left
  const arcLen = (circ * 240) / 360;
  const filledLen = arcLen * probability;
  const gapLen = circ - filledLen;
  const color = RISK_COLORS[riskLevel] || "#00d4ff";
  const pct = Math.round(probability * 100);

  useEffect(() => {
    if (!animate || !circleRef.current) return;
    circleRef.current.style.strokeDashoffset = String(arcLen);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (circleRef.current) {
          circleRef.current.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)";
          circleRef.current.style.strokeDashoffset = String(arcLen - filledLen);
        }
      });
    });
  }, [probability, arcLen, filledLen, animate]);

  const cx = size / 2, cy = size / 2;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
        {/* Defs */}
        <defs>
          <filter id="glow-gauge">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00e676" />
            <stop offset="50%" stopColor="#ffab40" />
            <stop offset="100%" stopColor="#ff5252" />
          </linearGradient>
        </defs>

        {/* Background arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="#162240" strokeWidth={12}
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeDashoffset={-circ * (60 / 360)}
          strokeLinecap="round"
          transform={`rotate(150 ${cx} ${cy})`}
        />

        {/* Track ticks */}
        {[0, 0.3, 0.6, 1].map((t, i) => {
          const angle = (150 + t * 240) * (Math.PI / 180);
          const x1 = cx + (r - 18) * Math.cos(angle);
          const y1 = cy + (r - 18) * Math.sin(angle);
          const x2 = cx + (r - 8) * Math.cos(angle);
          const y2 = cy + (r - 8) * Math.sin(angle);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#ffffff22" strokeWidth={1.5} />
          );
        })}

        {/* Filled arc */}
        <circle
          ref={circleRef}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeDashoffset={animate ? arcLen : arcLen - filledLen}
          filter="url(#glow-gauge)"
          transform={`rotate(150 ${cx} ${cy})`}
          style={{ transition: animate ? undefined : "none" }}
        />

        {/* Center content */}
        <text x={cx} y={cy - 14} textAnchor="middle" fill={color}
          fontSize="36" fontWeight="700" fontFamily="IBM Plex Mono">
          {pct}%
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8"
          fontSize="11" fontFamily="IBM Plex Mono">
          PROBABILITY
        </text>
        <text x={cx} y={cy + 30} textAnchor="middle" fill={color}
          fontSize="14" fontWeight="600" fontFamily="Syne">
          {riskLevel} Risk
        </text>

        {/* Labels */}
        <text x={cx - r - 4} y={cy + r * 0.55 + 4} textAnchor="middle"
          fill="#64748b" fontSize="9" fontFamily="IBM Plex Mono">LOW</text>
        <text x={cx + r + 4} y={cy + r * 0.55 + 4} textAnchor="middle"
          fill="#64748b" fontSize="9" fontFamily="IBM Plex Mono">HIGH</text>
      </svg>
    </div>
  );
}
