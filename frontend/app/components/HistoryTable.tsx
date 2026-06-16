"use client";
import { useState } from "react";
import { Download, Trash2, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { PredictionRecord, api } from "../lib/api";

interface Props { records: PredictionRecord[]; onDelete: (id: number) => void; onRefresh: () => void; }

const RISK_STYLE: Record<string, string> = {
  Low: "risk-badge-low", Moderate: "risk-badge-moderate", High: "risk-badge-high",
};

export default function HistoryTable({ records, onDelete, onRefresh }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<"created_at" | "probability">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = records
    .filter(r => filter === "All" || r.risk_level === filter)
    .sort((a, b) => {
      const av = sortKey === "probability" ? a.probability : new Date(a.created_at).getTime();
      const bv = sortKey === "probability" ? b.probability : new Date(b.created_at).getTime();
      return sortDir === "desc" ? bv - av : av - bv;
    });

  const toggleSort = (key: "created_at" | "probability") => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: string }) =>
    sortKey === k ? (sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {["All", "Low", "Moderate", "High"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-mono border transition-all
                ${filter === f ? "bg-cyan-glow/20 border-cyan-glow text-cyan-glow" : "border-white/10 text-slate-500 hover:border-white/20"}`}>
              {f}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-slate-600">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-navy-800/80 border-b border-white/5">
              <th className="px-3 py-2.5 text-left text-slate-500 font-normal">#</th>
              <th className="px-3 py-2.5 text-left text-slate-500 font-normal cursor-pointer hover:text-slate-300"
                onClick={() => toggleSort("created_at")}>
                <span className="flex items-center gap-1">Time <SortIcon k="created_at" /></span>
              </th>
              <th className="px-3 py-2.5 text-left text-slate-500 font-normal">Result</th>
              <th className="px-3 py-2.5 text-left text-slate-500 font-normal cursor-pointer hover:text-slate-300"
                onClick={() => toggleSort("probability")}>
                <span className="flex items-center gap-1">Prob. <SortIcon k="probability" /></span>
              </th>
              <th className="px-3 py-2.5 text-left text-slate-500 font-normal">Risk</th>
              <th className="px-3 py-2.5 text-left text-slate-500 font-normal">Glucose</th>
              <th className="px-3 py-2.5 text-left text-slate-500 font-normal">BMI</th>
              <th className="px-3 py-2.5 text-left text-slate-500 font-normal">Age</th>
              <th className="px-3 py-2.5 text-right text-slate-500 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-10 text-slate-600">No records found</td></tr>
            )}
            {filtered.map(r => (
              <>
                <tr key={r.id}
                  className="border-b border-white/5 hover:bg-white/2 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                  <td className="px-3 py-2.5 text-slate-600">{r.id}</td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {new Date(r.created_at).toLocaleString(undefined, {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${r.result === "Diabetic" ? "text-risk-high bg-risk-high/10" : "text-risk-low bg-risk-low/10"}`}>
                      {r.result}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-cyan-glow">{(r.probability * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${RISK_STYLE[r.risk_level] || ""}`}>
                      {r.risk_level}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{r.glucose}</td>
                  <td className="px-3 py-2.5 text-slate-400">{r.bmi}</td>
                  <td className="px-3 py-2.5 text-slate-400">{r.age}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      <a href={api.reportUrl(r.id)} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-glow hover:bg-cyan-glow/10 transition-all"
                        title="Download PDF">
                        <Download size={13} />
                      </a>
                      <button onClick={() => onDelete(r.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-risk-high hover:bg-risk-high/10 transition-all"
                        title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded row */}
                {expandedId === r.id && (
                  <tr key={`${r.id}-exp`} className="bg-navy-800/30">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-600">Insulin</span>
                          <div className="text-slate-300 font-semibold">{r.insulin} μU/mL</div>
                        </div>
                        <div>
                          <span className="text-slate-600">Blood Pressure</span>
                          <div className="text-slate-300 font-semibold">{r.bp} mm Hg</div>
                        </div>
                        <div>
                          <span className="text-slate-600">Skin Thickness</span>
                          <div className="text-slate-300 font-semibold">{r.skin} mm</div>
                        </div>
                        <div>
                          <span className="text-slate-600">Pedigree</span>
                          <div className="text-slate-300 font-semibold">{r.dpf}</div>
                        </div>
                        {r.rf_probability != null && (
                          <div>
                            <span className="text-slate-600">RF Prob.</span>
                            <div className="text-cyan-glow font-semibold">{(r.rf_probability * 100).toFixed(1)}%</div>
                          </div>
                        )}
                        {r.lr_probability != null && (
                          <div>
                            <span className="text-slate-600">LR Prob.</span>
                            <div className="text-purple-400 font-semibold">{(r.lr_probability * 100).toFixed(1)}%</div>
                          </div>
                        )}
                        {r.svm_probability != null && (
                          <div>
                            <span className="text-slate-600">SVM Prob.</span>
                            <div className="text-emerald-400 font-semibold">{(r.svm_probability * 100).toFixed(1)}%</div>
                          </div>
                        )}
                        {r.patient_id && (
                          <div>
                            <span className="text-slate-600">Patient ID</span>
                            <div className="text-slate-300 font-semibold">{r.patient_id}</div>
                          </div>
                        )}
                      </div>
                      {r.explanation && (
                        <div className="mt-2 text-xs text-slate-500 italic border-t border-white/5 pt-2">
                          {r.explanation}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
