"use client";
import { useState, useCallback, useRef } from "react";
import { Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { api, PredictPayload } from "../lib/api";
import RiskGauge from "./RiskGauge";

interface Props { baseline: PredictPayload; baselineProb: number; }

const SLIDERS = [
  { key: "glucose",     label: "Glucose",    unit: "mg/dL", min: 60,  max: 400, step: 1   },
  { key: "bmi",         label: "BMI",        unit: "kg/m²", min: 15,  max: 65,  step: 0.5 },
  { key: "age",         label: "Age",        unit: "yrs",   min: 18,  max: 90,  step: 1   },
  { key: "insulin",     label: "Insulin",    unit: "μU/mL", min: 0,   max: 800, step: 5   },
  { key: "bp",          label: "Blood Pres.","unit": "mmHg",min: 50,  max: 150, step: 1   },
  { key: "dpf",         label: "Pedigree",   unit: "",      min: 0,   max: 3,   step: 0.05},
];

export default function WhatIfSimulator({ baseline, baselineProb }: Props) {
  const [vals, setVals] = useState<PredictPayload>({ ...baseline });
  const [result, setResult] = useState<{ probability: number; risk_level: string; risk_score: number; delta: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const runWhatIf = useCallback(async (newVals: PredictPayload) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.whatif(newVals, baselineProb);
        setResult(res);
      } catch {
        // Fallback: simple heuristic
        const glucoseFactor = (newVals.glucose - 120) / 300;
        const bmiFactor = (newVals.bmi - 25) / 50;
        const prob = Math.max(0.01, Math.min(0.99, baselineProb + glucoseFactor * 0.3 + bmiFactor * 0.15));
        const risk = prob < 0.3 ? "Low" : prob < 0.6 ? "Moderate" : "High";
        setResult({ probability: prob, risk_level: risk, risk_score: Math.round(prob * 100), delta: prob - baselineProb });
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [baselineProb]);

  const update = (key: string, value: number) => {
    const next = { ...vals, [key]: value };
    setVals(next);
    runWhatIf(next);
  };

  const reset = () => {
    setVals({ ...baseline });
    setResult(null);
  };

  const delta = result ? result.delta : 0;
  const deltaAbs = Math.abs(delta * 100);
  const DeltaIcon = delta > 0.01 ? TrendingUp : delta < -0.01 ? TrendingDown : Minus;
  const deltaColor = delta > 0.01 ? "#ff5252" : delta < -0.01 ? "#00e676" : "#94a3b8";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={16} className="text-cyan-glow" />
        <span className="text-sm font-mono text-slate-400">Adjust values to see real-time risk changes</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SLIDERS.map(s => {
          const val = vals[s.key as keyof PredictPayload] as number;
          const pct = ((val - s.min) / (s.max - s.min)) * 100;
          const baseVal = baseline[s.key as keyof PredictPayload] as number;
          const changed = Math.abs(val - baseVal) > 0.001;

          return (
            <div key={s.key} className={`glass-card p-3 transition-all duration-200 ${changed ? "border-cyan-glow/30" : ""}`}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">{s.label}</label>
                <div className="flex items-center gap-2">
                  {changed && (
                    <span className="text-xs font-mono text-slate-600">
                      was {baseVal}{s.unit}
                    </span>
                  )}
                  <span className={`text-sm font-mono font-bold ${changed ? "text-cyan-glow" : "text-slate-300"}`}>
                    {val}{s.unit}
                  </span>
                </div>
              </div>
              <input type="range" min={s.min} max={s.max} step={s.step} value={val}
                onChange={e => update(s.key, parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, ${changed ? "#00d4ff" : "#475569"} ${pct}%, #162240 ${pct}%)` }}
              />
            </div>
          );
        })}
      </div>

      {/* Result panel */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-display font-semibold text-white">Live Risk Update</h4>
          <button onClick={reset} className="text-xs font-mono text-slate-500 hover:text-cyan-glow transition-colors">
            Reset to baseline
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Baseline */}
          <div className="text-center">
            <div className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Baseline</div>
            <RiskGauge
              probability={baselineProb}
              riskLevel={baselineProb < 0.3 ? "Low" : baselineProb < 0.6 ? "Moderate" : "High"}
              animate={false} size={140} />
          </div>

          {/* What-If */}
          <div className="text-center">
            <div className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">
              {loading ? "Calculating…" : "What-If"}
            </div>
            <RiskGauge
              probability={result ? result.probability : baselineProb}
              riskLevel={result ? result.risk_level : (baselineProb < 0.3 ? "Low" : baselineProb < 0.6 ? "Moderate" : "High")}
              animate={false} size={140} />
          </div>
        </div>

        {/* Delta */}
        {result && (
          <div className="mt-4 flex items-center justify-center gap-2 py-2 rounded-xl border"
            style={{ borderColor: deltaColor + "44", background: deltaColor + "11" }}>
            <DeltaIcon size={16} style={{ color: deltaColor }} />
            <span className="font-mono text-sm font-semibold" style={{ color: deltaColor }}>
              {delta > 0 ? "+" : ""}{(delta * 100).toFixed(1)}% change in probability
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
