"use client";
import { Download, CheckCircle, AlertCircle, XCircle, ChevronRight } from "lucide-react";
import { PredictResponse, api } from "../lib/api";
import RiskGauge from "./RiskGauge";
import ModelComparison from "./ModelComparison";
import FeatureChart from "./FeatureChart";
import WhatIfSimulator from "./WhatIfSimulator";

interface Props { result: PredictResponse; inputData: any; }

const RISK_ICON: Record<string, React.ElementType> = {
  Low: CheckCircle, Moderate: AlertCircle, High: XCircle,
};
const RISK_COLOR: Record<string, string> = {
  Low: "#00e676", Moderate: "#ffab40", High: "#ff5252",
};

export default function ResultPanel({ result, inputData }: Props) {
  const RiskIcon = RISK_ICON[result.risk_level] || AlertCircle;
  const riskColor = RISK_COLOR[result.risk_level] || "#00d4ff";

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Top: Gauge + summary */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <RiskGauge probability={result.probability} riskLevel={result.risk_level} size={180} />
          <div className="flex-1 space-y-3">
            {/* Risk badge */}
            <div className="flex items-center gap-2">
              <RiskIcon size={20} style={{ color: riskColor }} />
              <span className="font-display font-bold text-xl" style={{ color: riskColor }}>
                {result.risk_level} Risk
              </span>
              <span className="text-slate-500 text-sm font-mono ml-1">— {result.result}</span>
            </div>

            {/* Explanation */}
            <p className="text-sm text-slate-300 leading-relaxed border-l-2 pl-3"
              style={{ borderColor: riskColor + "66" }}>
              {result.explanation}
            </p>

            {/* Top factors */}
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">Top Risk Factors</div>
              {result.top_factors.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <ChevronRight size={12} style={{ color: riskColor }} className="shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            {/* Download */}
            <a href={api.reportUrl(result.id)} target="_blank" rel="noopener noreferrer"
              className="btn-ghost inline-flex items-center gap-2 text-sm py-2 px-4">
              <Download size={14} />
              Download PDF Report
            </a>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="glass-card p-5">
        <h3 className="section-title mb-3">Recommendations</h3>
        <div className="space-y-2">
          {result.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
              <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold"
                style={{ background: riskColor + "22", color: riskColor }}>
                {i + 1}
              </span>
              {r}
            </div>
          ))}
        </div>
      </div>

      {/* Model comparison */}
      <div className="glass-card p-5">
        <h3 className="section-title mb-4">Model Comparison</h3>
        <ModelComparison models={result.model_results} />
      </div>

      {/* Feature importance */}
      <div className="glass-card p-5">
        <h3 className="section-title mb-4">Feature Importance</h3>
        <FeatureChart features={result.feature_importance} />
      </div>

      {/* What-If */}
      <div className="glass-card p-5">
        <h3 className="section-title mb-1">What-If Simulator</h3>
        <p className="text-xs text-slate-500 font-mono mb-4">
          Adjust values to see how changes affect your risk in real-time
        </p>
        <WhatIfSimulator baseline={inputData} baselineProb={result.probability} />
      </div>
    </div>
  );
}
