"""
/api/predict — POST
/api/whatif  — POST
/api/report/{id} — GET (PDF)
"""

import io
import os
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from schemas import PredictRequest, PredictResponse, WhatIfRequest, WhatIfResponse
from database import get_db
from services.model_service import get_model_service

router = APIRouter(tags=["Prediction"])


@router.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    svc = get_model_service()
    data = {
        "glucose":      req.glucose,
        "bmi":          req.bmi,
        "age":          req.age,
        "insulin":      req.insulin,
        "bp":           req.bp,
        "skin":         req.skin,
        "dpf":          req.dpf,
        "pregnancies":  req.pregnancies,
    }

    try:
        result = svc.predict(data)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # ── Persist to DB ──────────────────────────────────────────────────────
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO predictions (
                glucose, bmi, age, insulin, bp, skin, dpf, pregnancies,
                result, probability, risk_level, model_used,
                rf_probability, lr_probability, svm_probability,
                top_feature, explanation, patient_id, notes
            ) VALUES (
                %(glucose)s, %(bmi)s, %(age)s, %(insulin)s, %(bp)s, %(skin)s, %(dpf)s, %(pregnancies)s,
                %(result)s, %(probability)s, %(risk_level)s, %(model_used)s,
                %(rf_probability)s, %(lr_probability)s, %(svm_probability)s,
                %(top_feature)s, %(explanation)s, %(patient_id)s, %(notes)s
            ) RETURNING id, created_at
        """, {
            **data,
            "result":         result["result"],
            "probability":    result["probability"],
            "risk_level":     result["risk_level"],
            "model_used":     "Random Forest",
            "rf_probability": result["rf_probability"],
            "lr_probability": result["lr_probability"],
            "svm_probability":result["svm_probability"],
            "top_feature":    result["top_feature"],
            "explanation":    result["explanation"],
            "patient_id":     req.patient_id,
            "notes":          req.notes,
        })
        row = cur.fetchone()

    return PredictResponse(
        id=row["id"],
        created_at=row["created_at"],
        **{k: v for k, v in result.items() if k in PredictResponse.model_fields},
    )


@router.post("/whatif", response_model=WhatIfResponse)
async def whatif(req: WhatIfRequest, baseline: float = 0.0):
    svc = get_model_service()
    data = {
        "glucose":     req.glucose,
        "bmi":         req.bmi,
        "age":         req.age,
        "insulin":     req.insulin,
        "bp":          req.bp,
        "skin":        req.skin,
        "dpf":         req.dpf,
        "pregnancies": req.pregnancies,
    }
    try:
        result = svc.predict_whatif(data, baseline_prob=baseline if baseline else None)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return WhatIfResponse(**result)


@router.get("/report/{prediction_id}")
async def download_report(prediction_id: int):
    """Generate a downloadable PDF report for a given prediction ID."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM predictions WHERE id = %s", (prediction_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.units import cm
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab not installed")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    # ── Header ─────────────────────────────────────────────────────────────
    title_style = ParagraphStyle("Title", parent=styles["Heading1"],
                                  fontSize=22, textColor=colors.HexColor("#0a0f1e"),
                                  spaceAfter=6)
    story.append(Paragraph("GlucoseGuard — Diabetes Risk Report", title_style))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%B %d, %Y %H:%M')} UTC  |  Report ID: {row['id']}",
        styles["Normal"]
    ))
    story.append(Spacer(1, 0.5*cm))

    # ── Risk Banner ────────────────────────────────────────────────────────
    risk_colors = {"Low": "#00c851", "Moderate": "#ffbb33", "High": "#ff4444"}
    risk_col = risk_colors.get(row["risk_level"], "#888888")
    banner_data = [[
        Paragraph(f"<b>RISK LEVEL: {row['risk_level'].upper()}</b>", styles["Normal"]),
        Paragraph(f"<b>Probability: {row['probability']*100:.1f}%</b>", styles["Normal"]),
        Paragraph(f"<b>Result: {row['result']}</b>", styles["Normal"]),
    ]]
    banner_table = Table(banner_data, colWidths=[6*cm, 5*cm, 5*cm])
    banner_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(risk_col)),
        ("TEXTCOLOR",  (0, 0), (-1, -1), colors.white),
        ("FONTSIZE",   (0, 0), (-1, -1), 11),
        ("PADDING",    (0, 0), (-1, -1), 8),
        ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Patient Data ───────────────────────────────────────────────────────
    story.append(Paragraph("<b>Patient Input Values</b>", styles["Heading2"]))
    fields = [
        ("Glucose", f"{row['glucose']} mg/dL"),
        ("BMI", f"{row['bmi']} kg/m²"),
        ("Age", f"{row['age']} years"),
        ("Insulin", f"{row['insulin']} μU/mL"),
        ("Blood Pressure", f"{row['bp']} mm Hg"),
        ("Skin Thickness", f"{row['skin']} mm"),
        ("Diabetes Pedigree", str(row['dpf'])),
        ("Pregnancies", str(row['pregnancies'])),
    ]
    table_data = [["Parameter", "Value"]] + fields
    t = Table(table_data, colWidths=[8*cm, 8*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0a0f1e")),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTSIZE",   (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING",    (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.4*cm))

    # ── Explanation ────────────────────────────────────────────────────────
    if row.get("explanation"):
        story.append(Paragraph("<b>Clinical Interpretation</b>", styles["Heading2"]))
        story.append(Paragraph(row["explanation"], styles["Normal"]))
        story.append(Spacer(1, 0.3*cm))

    # ── Model Probabilities ────────────────────────────────────────────────
    story.append(Paragraph("<b>Model Comparison</b>", styles["Heading2"]))
    model_data = [
        ["Model", "Probability", "Prediction"],
        ["Random Forest",       f"{(row.get('rf_probability') or 0)*100:.1f}%",
         "Diabetic" if (row.get('rf_probability') or 0) >= 0.5 else "Non-Diabetic"],
        ["Logistic Regression", f"{(row.get('lr_probability') or 0)*100:.1f}%",
         "Diabetic" if (row.get('lr_probability') or 0) >= 0.5 else "Non-Diabetic"],
        ["SVM",                 f"{(row.get('svm_probability') or 0)*100:.1f}%",
         "Diabetic" if (row.get('svm_probability') or 0) >= 0.5 else "Non-Diabetic"],
    ]
    mt = Table(model_data, colWidths=[6*cm, 5*cm, 5*cm])
    mt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#00d4ff")),
        ("FONTSIZE",   (0, 0), (-1, -1), 10),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING",    (0, 0), (-1, -1), 6),
        ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(mt)
    story.append(Spacer(1, 0.3*cm))

    # ── Disclaimer ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.5*cm))
    disclaimer = ParagraphStyle("Disclaimer", parent=styles["Normal"],
                                 fontSize=8, textColor=colors.grey)
    story.append(Paragraph(
        "⚠ DISCLAIMER: This report is generated by an AI model for informational purposes only. "
        "It is not a medical diagnosis. Consult a qualified healthcare professional for clinical decisions.",
        disclaimer
    ))

    doc.build(story)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=glucoseguard_report_{prediction_id}.pdf"}
    )
