const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PredictPayload {
  glucose: number; bmi: number; age: number; insulin: number;
  bp: number; skin: number; dpf: number; pregnancies: number;
  patient_id?: string; notes?: string;
}

export interface ModelResult {
  model_name: string; probability: number; prediction: string;
  accuracy: number; f1_score: number; roc_auc: number;
}

export interface FeatureImportance {
  feature: string; importance: number; shap_value: number; direction: string;
}

export interface PredictResponse {
  id: number; result: string; probability: number; risk_level: string;
  risk_score: number; model_results: ModelResult[];
  feature_importance: FeatureImportance[]; explanation: string;
  top_factors: string[]; recommendations: string[]; created_at: string;
}

export interface PredictionRecord {
  id: number; glucose: number; bmi: number; age: number; insulin: number;
  bp: number; skin: number; dpf: number; pregnancies: number;
  result: string; probability: number; risk_level: string; model_used: string;
  rf_probability?: number; lr_probability?: number; svm_probability?: number;
  top_feature?: string; explanation?: string; patient_id?: string;
  notes?: string; created_at: string;
}

export interface StatsResponse {
  total_predictions: number; diabetic_count: number; non_diabetic_count: number;
  diabetic_rate: number; avg_probability: number;
  risk_distribution: Record<string, number>; avg_glucose: number;
  avg_bmi: number; avg_age: number;
  recent_trend: { day: string; total: number; diabetic: number }[];
  model_usage: Record<string, number>;
  model_metrics: { model_name: string; accuracy: number; f1_score: number; roc_auc: number }[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

export const api = {
  predict: (payload: PredictPayload) =>
    request<PredictResponse>("/api/predict", { method: "POST", body: JSON.stringify(payload) }),

  whatif: (payload: PredictPayload, baseline = 0) =>
    request<{ probability: number; risk_level: string; risk_score: number; delta: number }>(
      `/api/whatif?baseline=${baseline}`, { method: "POST", body: JSON.stringify(payload) }
    ),

  history: (params?: { limit?: number; result?: string; risk?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.result) qs.set("result", params.result);
    if (params?.risk) qs.set("risk", params.risk);
    return request<PredictionRecord[]>(`/api/history?${qs}`);
  },

  stats: () => request<StatsResponse>("/api/stats"),

  deleteRecord: (id: number) =>
    request<{ deleted: number }>(`/api/history/${id}`, { method: "DELETE" }),

  reportUrl: (id: number) => `${API}/api/report/${id}`,
};
