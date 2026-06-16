"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, LabelList } from "recharts";
import { FeatureImportance } from "../lib/api";

const FEATURE_LABELS: Record<string, string> = {
  glucose: "Glucose", bmi: "BMI", age: "Age", insulin: "Insulin",
  bp: "Blood Pressure", skin: "Skin Thickness", dpf: "Pedigree", pregnancies: "Pregnancies",
};

interface Props { features: FeatureImportance[]; }

export default function FeatureChart({ features }: Props) {
  const data = features.map(f => ({
    name: FEATURE_LABELS[f.feature] || f.feature,
    value: Math.abs(f.shap_value) * 100,
    raw: f.shap_value,
    direction: f.direction,
    importance: f.importance,
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <div className="glass-card p-4">
        <div className="label-text mb-3">SHAP Feature Impact (approximated)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "IBM Plex Mono" }}
              width={110} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#0a0f1e", border: "1px solid #ffffff11", borderRadius: 8, fontSize: 11, fontFamily: "IBM Plex Mono" }}
              formatter={(v: number, _: string, props: any) => [
                `${v.toFixed(2)} (${props.payload.direction} risk)`, "Impact"
              ]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {data.map((entry, i) => (
                <Cell key={i}
                  fill={entry.direction === "increases" ? "#ff5252" : "#00e676"}
                  fillOpacity={0.8 - i * 0.06}
                />
              ))}
              <LabelList dataKey="value" position="right"
                formatter={(v: number) => v.toFixed(2)}
                style={{ fill: "#64748b", fontSize: 10, fontFamily: "IBM Plex Mono" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex gap-4 justify-center mt-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <span className="w-3 h-2 rounded-sm bg-risk-high opacity-80" />
            Increases risk
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <span className="w-3 h-2 rounded-sm bg-risk-low opacity-80" />
            Decreases risk
          </div>
        </div>
      </div>

      {/* Feature list */}
      <div className="space-y-2">
        {data.slice(0, 5).map((f, i) => (
          <div key={f.name} className="glass-card p-3 flex items-center gap-3">
            <span className="font-mono text-xs text-slate-600 w-4 text-center">#{i + 1}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-slate-300">{f.name}</span>
                <span className="text-xs font-mono"
                  style={{ color: f.direction === "increases" ? "#ff5252" : "#00e676" }}>
                  {f.direction} risk
                </span>
              </div>
              <div className="h-1 bg-navy-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(f.value / (data[0].value || 1) * 100, 100)}%`,
                    background: f.direction === "increases"
                      ? "linear-gradient(90deg, #ff5252, #ff525288)"
                      : "linear-gradient(90deg, #00e676, #00e67688)"
                  }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
