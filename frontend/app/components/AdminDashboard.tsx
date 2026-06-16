"use client";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from "recharts";
import { StatsResponse } from "../lib/api";
import { Activity, Users, AlertTriangle, TrendingUp, Brain } from "lucide-react";

interface Props { stats: StatsResponse; }

const RISK_COLORS = { Low: "#00e676", Moderate: "#ffab40", High: "#ff5252" };
const MODEL_COLORS = ["#00d4ff", "#a78bfa", "#34d399"];

export default function AdminDashboard({ stats }: Props) {
  const riskPieData = Object.entries(stats.risk_distribution).map(([name, value]) => ({ name, value }));
  const trendData = stats.recent_trend.map(d => ({
    ...d,
    nonDiabetic: d.total - d.diabetic,
  }));

  const statCards = [
    { label: "Total Analyses", val: stats.total_predictions, icon: Activity, color: "#00d4ff", sub: "all time" },
    { label: "Diabetic Risk",  val: `${(stats.diabetic_rate * 100).toFixed(1)}%`, icon: AlertTriangle, color: "#ff5252", sub: `${stats.diabetic_count} cases` },
    { label: "Avg Glucose",    val: `${stats.avg_glucose.toFixed(0)} mg/dL`, icon: TrendingUp, color: "#ffab40", sub: "mean across all" },
    { label: "Avg BMI",        val: stats.avg_bmi.toFixed(1), icon: Users, color: "#a78bfa", sub: `avg age ${stats.avg_age.toFixed(0)}y` },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass-card p-4">
              <div className="flex items-start justify-between mb-2">
                <Icon size={16} style={{ color: s.color }} />
                <span className="text-xs font-mono text-slate-600">{s.sub}</span>
              </div>
              <div className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.val}</div>
              <div className="text-xs font-mono text-slate-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk distribution pie */}
        <div className="glass-card p-4">
          <h3 className="label-text mb-3">Risk Distribution</h3>
          {riskPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value">
                  {riskPieData.map((entry, i) => (
                    <Cell key={i}
                      fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS] || "#888"}
                      stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a0f1e", border: "1px solid #ffffff11", borderRadius: 8, fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v: string) => <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "#94a3b8" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-600 font-mono text-sm">
              No predictions yet
            </div>
          )}
        </div>

        {/* 7-day trend */}
        <div className="glass-card p-4">
          <h3 className="label-text mb-3">7-Day Prediction Trend</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-diabetic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff5252" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff5252" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-healthy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff06" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                <Tooltip contentStyle={{ background: "#0a0f1e", border: "1px solid #ffffff11", borderRadius: 8, fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                <Area type="monotone" dataKey="diabetic" name="Diabetic"
                  stroke="#ff5252" fill="url(#grad-diabetic)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="nonDiabetic" name="Non-Diabetic"
                  stroke="#00e676" fill="url(#grad-healthy)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-600 font-mono text-sm">
              No recent data
            </div>
          )}
        </div>
      </div>

      {/* Model metrics */}
      <div className="glass-card p-4">
        <h3 className="label-text mb-4 flex items-center gap-2">
          <Brain size={14} className="text-cyan-glow" />
          Model Performance Metrics
        </h3>
        {stats.model_metrics.length > 0 ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={stats.model_metrics.map(m => ({
                  name: m.model_name.replace("Logistic Regression", "Log. Reg."),
                  Accuracy: +(m.accuracy * 100).toFixed(1),
                  "F1 Score": +(m.f1_score * 100).toFixed(1),
                  "ROC-AUC": +(m.roc_auc * 100).toFixed(1),
                }))}
                margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid stroke="#ffffff06" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                <YAxis domain={[60, 100]} tick={{ fill: "#64748b", fontSize: 10, fontFamily: "IBM Plex Mono" }} unit="%" />
                <Tooltip contentStyle={{ background: "#0a0f1e", border: "1px solid #ffffff11", borderRadius: 8, fontSize: 11, fontFamily: "IBM Plex Mono" }}
                  formatter={(v: number) => `${v}%`} />
                <Bar dataKey="Accuracy" fill="#00d4ff" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                <Bar dataKey="F1 Score" fill="#a78bfa" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                <Bar dataKey="ROC-AUC" fill="#34d399" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex gap-4 justify-center">
              {[["Accuracy", "#00d4ff"], ["F1 Score", "#a78bfa"], ["ROC-AUC", "#34d399"]].map(([l, c]) => (
                <div key={l} className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                  <span className="w-3 h-2 rounded-sm" style={{ background: c }} />{l}
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5 mt-2">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-navy-800/60 border-b border-white/5">
                    {["Model", "Accuracy", "F1 Score", "ROC-AUC", "Precision", "Recall"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-slate-500 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.model_metrics.map((m, i) => (
                    <tr key={m.model_name} className="border-b border-white/5 hover:bg-white/2">
                      <td className="px-3 py-2 font-semibold" style={{ color: MODEL_COLORS[i] }}>{m.model_name}</td>
                      {["accuracy", "f1_score", "roc_auc"].map(k => (
                        <td key={k} className="px-3 py-2 text-slate-300">
                          {((m as any)[k] * 100).toFixed(1)}%
                        </td>
                      ))}
                      <td className="px-3 py-2 text-slate-500">—</td>
                      <td className="px-3 py-2 text-slate-500">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-600 font-mono text-sm">
            Train models first to see metrics
          </div>
        )}
      </div>
    </div>
  );
}
