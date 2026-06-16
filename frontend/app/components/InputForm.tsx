"use client";
import { useState } from "react";
import { Activity, User, Droplets, Heart, Scale, Baby, Dna, Syringe } from "lucide-react";
import { PredictPayload } from "../lib/api";

interface Props {
  onSubmit: (data: PredictPayload) => void;
  loading: boolean;
  onChange?: (data: PredictPayload) => void;
}

const FIELDS = [
  { key: "glucose",     label: "Glucose",       unit: "mg/dL",  icon: Droplets,  min: 40,  max: 500, step: 1,   default: 120, tip: "Plasma glucose concentration (fasting)" },
  { key: "bmi",         label: "BMI",            unit: "kg/m²",  icon: Scale,     min: 10,  max: 70,  step: 0.1, default: 25,  tip: "Body mass index" },
  { key: "age",         label: "Age",            unit: "years",  icon: User,      min: 1,   max: 120, step: 1,   default: 35,  tip: "Age in years" },
  { key: "insulin",     label: "Insulin",        unit: "μU/mL",  icon: Syringe,   min: 0,   max: 900, step: 1,   default: 80,  tip: "2-hour serum insulin" },
  { key: "bp",          label: "Blood Pressure", unit: "mm Hg",  icon: Heart,     min: 40,  max: 180, step: 1,   default: 72,  tip: "Diastolic blood pressure" },
  { key: "skin",        label: "Skin Thickness", unit: "mm",     icon: Activity,  min: 0,   max: 100, step: 0.5, default: 20,  tip: "Triceps skin fold thickness" },
  { key: "dpf",         label: "Diabetes Pedigree", unit: "",    icon: Dna,       min: 0,   max: 5,   step: 0.01,default: 0.3, tip: "Family history score (0-2.5 typical)" },
  { key: "pregnancies", label: "Pregnancies",    unit: "",       icon: Baby,      min: 0,   max: 20,  step: 1,   default: 1,   tip: "Number of times pregnant" },
];

const DEFAULT_VALS: PredictPayload = {
  glucose: 120, bmi: 25, age: 35, insulin: 80,
  bp: 72, skin: 20, dpf: 0.3, pregnancies: 1,
};

export default function InputForm({ onSubmit, loading, onChange }: Props) {
  const [vals, setVals] = useState<PredictPayload>(DEFAULT_VALS);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [notes, setNotes] = useState("");

  const update = (key: string, value: number) => {
    const next = { ...vals, [key]: value };
    setVals(next);
    onChange?.(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...vals, patient_id: patientId || undefined, notes: notes || undefined });
  };

  const reset = () => {
    setVals(DEFAULT_VALS);
    onChange?.(DEFAULT_VALS);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map(f => {
          const Icon = f.icon;
          const val = vals[f.key as keyof PredictPayload] as number;
          // Normalized position for range slider thumb
          const pct = ((val - f.min) / (f.max - f.min)) * 100;

          return (
            <div key={f.key} className="group relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-mono text-slate-400 uppercase tracking-widest cursor-pointer"
                  onMouseEnter={() => setTooltip(f.key)}
                  onMouseLeave={() => setTooltip(null)}>
                  <Icon size={12} className="text-cyan-glow/70" />
                  {f.label}
                  {f.unit && <span className="text-slate-600 normal-case tracking-normal">({f.unit})</span>}
                </label>
                <span className="font-mono text-sm font-semibold text-cyan-glow tabular-nums">
                  {val}{f.unit ? ` ${f.unit}` : ""}
                </span>
              </div>

              {/* Tooltip */}
              {tooltip === f.key && (
                <div className="tooltip -top-9 left-0 z-20">{f.tip}</div>
              )}

              {/* Slider */}
              <div className="relative">
                <input
                  type="range" min={f.min} max={f.max} step={f.step} value={val}
                  onChange={e => update(f.key, parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                    bg-navy-700 accent-cyan-glow"
                  style={{
                    background: `linear-gradient(to right, #00d4ff ${pct}%, #162240 ${pct}%)`
                  }}
                />
              </div>

              {/* Number input */}
              <input
                type="number" min={f.min} max={f.max} step={f.step} value={val}
                onChange={e => update(f.key, parseFloat(e.target.value) || 0)}
                className="input-field mt-2 text-center text-sm"
              />
            </div>
          );
        })}
      </div>

      {/* Optional fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
        <div>
          <label className="label-text">Patient ID (optional)</label>
          <input type="text" value={patientId} onChange={e => setPatientId(e.target.value)}
            placeholder="e.g. PT-00123"
            className="input-field" />
        </div>
        <div>
          <label className="label-text">Clinical Notes (optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Fasting sample, HbA1c ordered"
            className="input-field" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              Analyzing…
            </>
          ) : (
            <>
              <Activity size={16} />
              Run Analysis
            </>
          )}
        </button>
        <button type="button" onClick={reset} className="btn-ghost px-4">
          Reset
        </button>
      </div>
    </form>
  );
}
