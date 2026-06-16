from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class PredictRequest(BaseModel):
    glucose: float = Field(..., ge=0, le=600, description="Plasma glucose concentration (mg/dL)")
    bmi: float = Field(..., ge=0, le=100, description="Body Mass Index")
    age: int = Field(..., ge=1, le=120, description="Age in years")
    insulin: float = Field(..., ge=0, le=900, description="2-Hour serum insulin (mu U/ml)")
    bp: float = Field(..., ge=0, le=200, description="Diastolic blood pressure (mm Hg)")
    skin: float = Field(..., ge=0, le=100, description="Triceps skin fold thickness (mm)")
    dpf: float = Field(..., ge=0, le=5, description="Diabetes pedigree function")
    pregnancies: int = Field(..., ge=0, le=20, description="Number of pregnancies")
    patient_id: Optional[str] = Field(None, description="Optional patient identifier")
    notes: Optional[str] = Field(None, description="Optional clinical notes")
    model_preference: Optional[str] = Field("rf", description="Preferred model: rf, lr, svm")

    @field_validator("glucose")
    @classmethod
    def glucose_reasonable(cls, v):
        if v < 40 and v != 0:
            raise ValueError("Glucose below 40 is critically low — please verify")
        return v


class ModelResult(BaseModel):
    model_name: str
    probability: float
    prediction: str
    accuracy: float
    f1_score: float
    roc_auc: float


class FeatureImportance(BaseModel):
    feature: str
    importance: float
    shap_value: float
    direction: str  # "increases" or "decreases"


class PredictResponse(BaseModel):
    id: int
    result: str
    probability: float
    risk_level: str  # Low / Moderate / High
    risk_score: int  # 0-100
    model_results: List[ModelResult]
    feature_importance: List[FeatureImportance]
    explanation: str
    top_factors: List[str]
    recommendations: List[str]
    created_at: datetime


class PredictionRecord(BaseModel):
    id: int
    glucose: float
    bmi: float
    age: int
    insulin: float
    bp: float
    skin: float
    dpf: float
    pregnancies: int
    result: str
    probability: float
    risk_level: str
    model_used: str
    rf_probability: Optional[float]
    lr_probability: Optional[float]
    svm_probability: Optional[float]
    top_feature: Optional[str]
    explanation: Optional[str]
    patient_id: Optional[str]
    notes: Optional[str]
    created_at: datetime


class StatsResponse(BaseModel):
    total_predictions: int
    diabetic_count: int
    non_diabetic_count: int
    diabetic_rate: float
    avg_probability: float
    risk_distribution: Dict[str, int]
    avg_glucose: float
    avg_bmi: float
    avg_age: float
    recent_trend: List[Dict[str, Any]]
    model_usage: Dict[str, int]
    model_metrics: List[Dict[str, Any]]


class WhatIfRequest(BaseModel):
    glucose: float = Field(..., ge=0, le=600)
    bmi: float = Field(..., ge=0, le=100)
    age: int = Field(..., ge=1, le=120)
    insulin: float = Field(..., ge=0, le=900)
    bp: float = Field(..., ge=0, le=200)
    skin: float = Field(..., ge=0, le=100)
    dpf: float = Field(..., ge=0, le=5)
    pregnancies: int = Field(..., ge=0, le=20)


class WhatIfResponse(BaseModel):
    probability: float
    risk_level: str
    risk_score: int
    delta: float  # change from baseline
