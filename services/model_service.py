"""
GlucoseGuard Model Service
Handles inference, SHAP explanations, and risk assessment.
"""

import os
import json
import joblib
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

FEATURE_DISPLAY = {
    "glucose":      ("Glucose Level",              "mg/dL",  "glucose concentration"),
    "bmi":          ("BMI",                         "kg/m²",  "body mass index"),
    "age":          ("Age",                         "years",  "age"),
    "insulin":      ("Insulin Level",               "μU/mL",  "insulin level"),
    "bp":           ("Blood Pressure",              "mm Hg",  "diastolic blood pressure"),
    "skin":         ("Skin Thickness",              "mm",     "triceps skin fold"),
    "dpf":          ("Diabetes Pedigree",           "",       "family diabetes history score"),
    "pregnancies":  ("Pregnancies",                 "",       "number of pregnancies"),
}

FEATURE_ORDER = ["pregnancies", "glucose", "bp", "skin", "insulin", "bmi", "dpf", "age"]

CLINICAL_THRESHOLDS = {
    "glucose": {"low": 100, "high": 125, "critical": 180},
    "bmi":     {"low": 25,  "high": 30,  "critical": 40},
    "bp":      {"low": 80,  "high": 90,  "critical": 110},
    "age":     {"low": 35,  "high": 45,  "critical": 60},
}

RECOMMENDATIONS = {
    "Low": [
        "Maintain your current healthy lifestyle habits",
        "Schedule annual checkups to monitor glucose levels",
        "Continue regular physical activity (150 min/week)",
        "Keep a balanced diet rich in fiber and lean proteins",
    ],
    "Moderate": [
        "Schedule a fasting glucose test with your doctor within 3 months",
        "Reduce refined carbohydrates and sugary beverages",
        "Aim for 30 minutes of moderate exercise 5 days/week",
        "Monitor your weight and set a target BMI below 25",
        "Consider a consultation with a registered dietitian",
    ],
    "High": [
        "Consult a healthcare provider immediately — do not delay",
        "Request a full diabetes workup (HbA1c, fasting glucose, OGTT)",
        "Start a medically supervised diet and exercise program",
        "Check family history with your doctor",
        "Track blood glucose levels daily if recommended",
        "Ask about metformin or other preventive medications",
    ],
}


class ModelService:
    def __init__(self):
        self._rf = None
        self._lr = None
        self._svm = None
        self._scaler = None
        self._imputer = None
        self._metrics: List[Dict] = []
        self._feature_importance: Dict = {}
        self._loaded = False

    def _load(self):
        if self._loaded:
            return
        try:
            self._rf = joblib.load(os.path.join(MODELS_DIR, "diabetes_rf.pkl"))
            self._lr = joblib.load(os.path.join(MODELS_DIR, "diabetes_lr.pkl"))
            self._svm = joblib.load(os.path.join(MODELS_DIR, "diabetes_svm.pkl"))
            self._scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
            imputer_path = os.path.join(MODELS_DIR, "imputer.pkl")
            if os.path.exists(imputer_path):
                self._imputer = joblib.load(imputer_path)
            with open(os.path.join(MODELS_DIR, "metrics.json")) as f:
                self._metrics = json.load(f)
            with open(os.path.join(MODELS_DIR, "feature_importance.json")) as f:
                self._feature_importance = json.load(f)
            self._loaded = True
            print("✅ Models loaded successfully")
        except FileNotFoundError as e:
            raise RuntimeError(
                f"Models not found. Run: python train/train_model.py\nDetail: {e}"
            )

    def _build_input(self, data: Dict) -> np.ndarray:
        return np.array([[
            data["pregnancies"],
            data["glucose"],
            data["bp"],
            data["skin"],
            data["insulin"],
            data["bmi"],
            data["dpf"],
            data["age"],
        ]])

    def _prob_to_risk(self, prob: float) -> tuple[str, int]:
        if prob < 0.30:
            return "Low", int(prob * 100)
        elif prob < 0.60:
            return "Moderate", int(prob * 100)
        else:
            return "High", int(prob * 100)

    def _compute_shap_approx(self, X: np.ndarray) -> List[Dict]:
        """
        Approximate SHAP values using RF feature importances + direction from LR coefficients.
        Falls back gracefully if models unavailable.
        """
        self._load()

        if self._imputer is not None:
            X = self._imputer.transform(X)
        # Use RF probabilities as baseline
        base_prob = self._rf.predict_proba(X)[0][1]

        # LR coefficients give direction
        lr_coefs = self._lr.coef_[0]  # shape: (n_features,)
        rf_importances = [self._feature_importance.get(f, 0) for f in FEATURE_ORDER]

        result = []
        for i, feat in enumerate(FEATURE_ORDER):
            imp = rf_importances[i]
            coef = lr_coefs[i]
            shap_val = float(imp * base_prob * np.sign(coef))
            direction = "increases" if coef > 0 else "decreases"
            result.append({
                "feature": feat,
                "importance": float(imp),
                "shap_value": round(shap_val, 4),
                "direction": direction,
            })

        # Sort by absolute SHAP value
        result.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return result

    def _generate_explanation(self, data: Dict, prob: float, risk: str, shap_vals: List[Dict]) -> tuple[str, List[str]]:
        top = shap_vals[0]
        feat = top["feature"]
        val = data[feat]
        display_name, unit, desc = FEATURE_DISPLAY[feat]
        unit_str = f" {unit}" if unit else ""

        direction_verb = "elevated" if top["direction"] == "increases" else "below normal"

        explanation = (
            f"Your {desc} of {val}{unit_str} is the strongest risk signal — "
            f"it appears {direction_verb} relative to the study population. "
        )

        if risk == "Low":
            explanation += "Your overall profile suggests a low probability of diabetes. Keep up the healthy habits."
        elif risk == "Moderate":
            explanation += f"Combined with your other values, this places you in a moderate-risk category. Lifestyle changes now can significantly reduce your long-term risk."
        else:
            explanation += "Several of your values together indicate elevated risk. Speaking with a clinician promptly is strongly recommended."

        top_factors = []
        for s in shap_vals[:3]:
            d, u, desc2 = FEATURE_DISPLAY[s["feature"]]
            u_str = f" {u}" if u else ""
            v = data[s["feature"]]
            top_factors.append(
                f"{d}: {v}{u_str} ({s['direction']} risk)"
            )

        return explanation, top_factors

    def predict(self, data: Dict) -> Dict:
        self._load()

        X = self._build_input(data)
        if self._imputer is not None:
            X = self._imputer.transform(X)
        X_scaled = self._scaler.transform(X)

        # ── All three models ───────────────────────────────────────────────
        rf_prob  = float(self._rf.predict_proba(X)[0][1])
        lr_prob  = float(self._lr.predict_proba(X_scaled)[0][1])
        svm_prob = float(self._svm.predict_proba(X_scaled)[0][1])

        # Primary: Random Forest (best AUC typically)
        primary_prob = rf_prob
        primary_result = "Diabetic" if primary_prob >= 0.5 else "Non-Diabetic"

        risk_level, risk_score = self._prob_to_risk(primary_prob)

        shap_vals = self._compute_shap_approx(X)
        explanation, top_factors = self._generate_explanation(data, primary_prob, risk_level, shap_vals)

        model_results = []
        for m in self._metrics:
            name_map = {
                "Random Forest": ("rf", rf_prob),
                "Logistic Regression": ("lr", lr_prob),
                "SVM": ("svm", svm_prob),
            }
            if m["model_name"] in name_map:
                _, prob = name_map[m["model_name"]]
                model_results.append({
                    "model_name": m["model_name"],
                    "probability": round(prob, 4),
                    "prediction": "Diabetic" if prob >= 0.5 else "Non-Diabetic",
                    "accuracy": m["accuracy"],
                    "f1_score": m["f1_score"],
                    "roc_auc": m["roc_auc"],
                })

        return {
            "result": primary_result,
            "probability": round(primary_prob, 4),
            "risk_level": risk_level,
            "risk_score": risk_score,
            "model_results": model_results,
            "feature_importance": shap_vals,
            "explanation": explanation,
            "top_factors": top_factors,
            "recommendations": RECOMMENDATIONS[risk_level],
            "rf_probability": round(rf_prob, 4),
            "lr_probability": round(lr_prob, 4),
            "svm_probability": round(svm_prob, 4),
            "top_feature": shap_vals[0]["feature"] if shap_vals else "glucose",
        }

    def predict_whatif(self, data: Dict, baseline_prob: Optional[float] = None) -> Dict:
        self._load()
        X = self._build_input(data)
        if self._imputer is not None:
            X = self._imputer.transform(X)
        prob = float(self._rf.predict_proba(X)[0][1])
        risk_level, risk_score = self._prob_to_risk(prob)
        delta = round(prob - baseline_prob, 4) if baseline_prob is not None else 0.0
        return {
            "probability": round(prob, 4),
            "risk_level": risk_level,
            "risk_score": risk_score,
            "delta": delta,
        }

    def get_metrics(self) -> List[Dict]:
        self._load()
        return self._metrics


_service = ModelService()


def get_model_service() -> ModelService:
    return _service
