"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Activity, Shield, BarChart3, History, Settings,
  AlertTriangle, Wifi, WifiOff, RefreshCw
} from "lucide-react";
import { api, PredictPayload, PredictResponse, PredictionRecord, StatsResponse } from "./lib/api";
import InputForm from "./components/InputForm";
import ResultPanel from "./components/ResultPanel";
import HistoryTable from "./components/HistoryTable";
import AdminDashboard from "./components/AdminDashboard";

const NeuralBackground = dynamic(() => import("./components/NeuralBackground"), { ssr: false });

type Tab = "predict" | "history" | "admin";

export default function Home() {
  const [tab, setTab] = useState<Tab>("predict");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [inputData, setInputData] = useState<PredictPayload | null>(null);
  const [history, setHistory] = useState<PredictionRecord[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "error">("unknown");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  // API health check
  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/health")
      .then(r => setApiStatus(r.ok ? "ok" : "error"))
      .catch(() => setApiStatus("error"));
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await api.history({ limit: 100 });
      setHistory(data);
    } catch (e: any) {
      console.error("History fetch failed:", e.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.stats();
      setStats(data);
    } catch (e: any) {
      console.error("Stats fetch failed:", e.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "history") loadHistory();
    if (tab === "admin") loadStats();
  }, [tab, loadHistory, loadStats]);

  const handlePredict = async (data: PredictPayload) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setInputData(data);
    try {
      const res = await api.predict(data);
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Prediction failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteRecord(id);
      setHistory(h => h.filter(r => r.id !== id));
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "predict", label: "Predict", icon: Activity },
    { id: "history", label: "History", icon: History },
    { id: "admin",   label: "Dashboard", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#040810] text-slate-100">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-navy-900 border-b border-white/5">
        <div className="absolute inset-0">
          <NeuralBackground />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-navy-900/40 to-navy-900/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#00d4ff15_0%,transparent_60%)]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 sm:py-14">
          {/* API status pill */}
          <div className="flex justify-end mb-4">
            <div className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border
              ${apiStatus === "ok" ? "border-risk-low/30 text-risk-low bg-risk-low/10"
              : apiStatus === "error" ? "border-risk-high/30 text-risk-high bg-risk-high/10"
              : "border-white/10 text-slate-500"}`}>
              {apiStatus === "ok" ? <Wifi size={11} /> : apiStatus === "error" ? <WifiOff size={11} /> : null}
              API {apiStatus === "ok" ? "Online" : apiStatus === "error" ? "Offline" : "Checking…"}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Logo */}
            <div className="relative w-14 h-14 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-cyan-glow/20 animate-pulse-glow" />
              <div className="relative w-14 h-14 rounded-2xl bg-navy-800 border border-cyan-glow/30 flex items-center justify-center">
                <Shield size={28} className="text-cyan-glow" />
              </div>
            </div>

            <div>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight text-white">
                Glucose<span className="text-cyan-glow">Guard</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1 font-mono">
                AI-powered diabetes risk classification · RF · LR · SVM
              </p>
            </div>

            {/* Stats pills */}
            {stats && (
              <div className="sm:ml-auto flex flex-wrap gap-2">
                {[
                  { label: "Analyses", val: stats.total_predictions },
                  { label: "Diabetic Rate", val: `${(stats.diabetic_rate * 100).toFixed(0)}%` },
                  { label: "Avg Glucose", val: `${stats.avg_glucose.toFixed(0)}` },
                ].map(s => (
                  <div key={s.label} className="glass-card px-3 py-1.5 text-center">
                    <div className="font-mono text-sm font-bold text-cyan-glow">{s.val}</div>
                    <div className="text-xs font-mono text-slate-600">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disclaimer banner */}
          {showBanner && (
            <div className="mt-5 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 text-xs font-mono text-amber-300">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                <strong>Medical Disclaimer:</strong> GlucoseGuard is a research tool for educational purposes only.
                Results are not medical diagnoses. Always consult a qualified healthcare professional.
              </span>
              <button onClick={() => setShowBanner(false)} className="ml-auto shrink-0 text-amber-500 hover:text-amber-300">✕</button>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="flex gap-1 border-b border-white/5">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-display font-medium transition-all duration-200
                    ${tab === t.id
                      ? "text-cyan-glow border-b-2 border-cyan-glow -mb-px"
                      : "text-slate-500 hover:text-slate-300"}`}>
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* ── PREDICT TAB ──────────────────────────────────────────────── */}
        {tab === "predict" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input */}
            <div className="space-y-5">
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={18} className="text-cyan-glow" />
                  <h2 className="section-title mb-0">Patient Input</h2>
                </div>
                <InputForm onSubmit={handlePredict} loading={loading} />
              </div>

              {/* Quick reference */}
              <div className="glass-card p-4">
                <h3 className="label-text mb-3">Normal Ranges Reference</h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    ["Glucose (fasting)", "70–99 mg/dL"],
                    ["BMI (normal)",      "18.5–24.9"],
                    ["Blood Pressure",    "< 80 mm Hg"],
                    ["Insulin (fasting)", "< 25 μU/mL"],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between gap-2 py-1 border-b border-white/5">
                      <span className="text-slate-500">{l}</span>
                      <span className="text-slate-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Results */}
            <div>
              {error && (
                <div className="glass-card p-4 border border-risk-high/20 bg-risk-high/5 flex items-start gap-3 mb-4">
                  <AlertTriangle size={16} className="text-risk-high shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-risk-high">Prediction Failed</div>
                    <div className="text-xs font-mono text-slate-400 mt-1">{error}</div>
                    {apiStatus === "error" && (
                      <div className="text-xs font-mono text-slate-500 mt-2">
                        Make sure the FastAPI backend is running: <code className="text-cyan-glow">python app.py</code>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {loading && (
                <div className="glass-card p-8 flex flex-col items-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-glow/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-glow animate-spin" />
                    <div className="absolute inset-2 rounded-full border border-cyan-glow/10 animate-ping" />
                  </div>
                  <div className="text-sm font-mono text-slate-400">Running ML analysis…</div>
                  <div className="text-xs font-mono text-slate-600">RF · LR · SVM models evaluating</div>
                </div>
              )}

              {result && inputData && !loading && (
                <ResultPanel result={result} inputData={inputData} />
              )}

              {!result && !loading && !error && (
                <div className="glass-card p-10 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-glow/10 border border-cyan-glow/20 flex items-center justify-center">
                    <Shield size={32} className="text-cyan-glow/50" />
                  </div>
                  <div className="text-slate-500 font-mono text-sm">
                    Fill in the patient data and click<br />
                    <span className="text-cyan-glow">Run Analysis</span> to get your risk assessment
                  </div>
                  <div className="text-xs text-slate-600 font-mono max-w-xs">
                    Results include probability score, risk gauge, model comparison, feature importance, and personalized recommendations.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ──────────────────────────────────────────────── */}
        {tab === "history" && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <History size={18} className="text-cyan-glow" />
                <h2 className="section-title mb-0">Prediction History</h2>
              </div>
              <button onClick={loadHistory} disabled={historyLoading}
                className="btn-ghost flex items-center gap-2 py-2 px-3 text-sm">
                <RefreshCw size={14} className={historyLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {historyLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 rounded-xl shimmer" />
                ))}
              </div>
            ) : (
              <HistoryTable records={history} onDelete={handleDelete} onRefresh={loadHistory} />
            )}
          </div>
        )}

        {/* ── ADMIN TAB ────────────────────────────────────────────────── */}
        {tab === "admin" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-cyan-glow" />
                <h2 className="section-title mb-0">Analytics Dashboard</h2>
              </div>
              <button onClick={loadStats} disabled={statsLoading}
                className="btn-ghost flex items-center gap-2 py-2 px-3 text-sm">
                <RefreshCw size={14} className={statsLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {statsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}
              </div>
            ) : stats ? (
              <AdminDashboard stats={stats} />
            ) : (
              <div className="glass-card p-10 text-center text-slate-600 font-mono text-sm">
                No stats available yet — run some predictions first
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 mt-16 py-8 text-center">
        <div className="text-xs font-mono text-slate-700 space-y-1">
          <div>
            <span className="text-cyan-glow/60">GlucoseGuard</span> · Built with FastAPI + Next.js + scikit-learn
          </div>
          <div>Pima Indians Diabetes Dataset · Random Forest · Logistic Regression · SVM</div>
          <div className="text-slate-800">Not a medical device · For research purposes only</div>
        </div>
      </footer>
    </div>
  );
}
