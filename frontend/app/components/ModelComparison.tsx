"use client";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ModelResult } from "../lib/api";

const MODEL_COLORS: Record<string, string> = {
  "Random Forest": "#00d4ff",
  "Logistic Regression": "#a78bfa",
  "SVM": "#34d399",
};

interface Props { models: ModelResult[]; }

export default function ModelComparison({ models }: Props) {
  // Radar data for all 3 metrics
  const radarData = [
    { metric: "Accuracy", ...Object.fromEntries(models.map(m => [m.model_name, m.accuracy * 100])) },
    { metric: "F1 Score", ...Object.fromEntries(models.map(m => [m.model_name, m.f1_score * 100])) },
    { metric: "ROC-AUC",  ...Object.fromEntries(models.map(m => [m.model_name, m.roc_auc * 100])) },
    { metric: "Prob",     ...Object.fromEntries(models.map(m => [m.model_name, m.probability * 100])) },
  ];

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-1 gap-3">
        {models.map(m => {
          const color = MODEL_COLORS[m.model_name] || "#00d4ff";
          const isDiabetic = m.prediction === "Diabetic";
          return (
            <div key={m.model_name}
              className="glass-card p-4 border-l-2"
              style={{ borderLeftColor: color }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-display font-semibold text-white text-sm">{m.model_name}</h4>
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded-full mt-1 inline-block"
                    style={{ color, background: color + "22", border: `1px solid ${color}44` }}>
                    {m.prediction}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl font-bold" style={{ color }}>
                    {(m.probability * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500 font-mono">probability</div>
                </div>
              </div>

              {/* Metrics bars */}
              <div className="space-y-2">
                {[
                  { label: "Accuracy", val: m.accuracy },
                  { label: "F1 Score", val: m.f1_score },
                  { label: "ROC-AUC",  val: m.roc_auc  },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 w-20 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${val * 100}%`, background: color }} />
                    </div>
                    <span className="text-xs font-mono w-12 text-right" style={{ color }}>
                      {(val * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Radar chart */}
      <div className="glass-card p-4">
        <h4 className="label-text mb-3">Model Comparison Radar</h4>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#ffffff0f" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "IBM Plex Mono" }} />
            {models.map(m => (
              <Radar key={m.model_name} name={m.model_name} dataKey={m.model_name}
                stroke={MODEL_COLORS[m.model_name]} fill={MODEL_COLORS[m.model_name]}
                fillOpacity={0.12} strokeWidth={1.5} />
            ))}
            <Tooltip
              contentStyle={{ background: "#0a0f1e", border: "1px solid #ffffff11", borderRadius: 8, fontSize: 11, fontFamily: "IBM Plex Mono" }}
              formatter={(v: number) => `${v.toFixed(1)}%`}
            />
          </RadarChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          {models.map(m => (
            <div key={m.model_name} className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
              <span className="w-3 h-0.5 rounded" style={{ background: MODEL_COLORS[m.model_name] }} />
              {m.model_name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
