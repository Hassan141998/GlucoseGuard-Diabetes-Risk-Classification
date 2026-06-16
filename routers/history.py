from fastapi import APIRouter, Query
from typing import List, Optional
from database import get_db
from schemas import PredictionRecord

router = APIRouter(tags=["History"])


@router.get("/history", response_model=List[PredictionRecord])
async def get_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    result_filter: Optional[str] = Query(None, alias="result"),
    risk_filter: Optional[str] = Query(None, alias="risk"),
    patient_id: Optional[str] = None,
):
    with get_db() as conn:
        cur = conn.cursor()
        conditions = []
        params: list = []

        if result_filter:
            conditions.append("result = %s")
            params.append(result_filter)
        if risk_filter:
            conditions.append("risk_level = %s")
            params.append(risk_filter)
        if patient_id:
            conditions.append("patient_id = %s")
            params.append(patient_id)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        params += [limit, offset]

        cur.execute(f"""
            SELECT id, glucose, bmi, age, insulin, bp, skin, dpf, pregnancies,
                   result, probability, risk_level, model_used,
                   rf_probability, lr_probability, svm_probability,
                   top_feature, explanation, patient_id, notes, created_at
            FROM predictions
            {where}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, params)
        rows = cur.fetchall()

    return [PredictionRecord(**dict(r)) for r in rows]


@router.delete("/history/{prediction_id}")
async def delete_prediction(prediction_id: int):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM predictions WHERE id = %s RETURNING id", (prediction_id,))
        deleted = cur.fetchone()
    if not deleted:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Record not found")
    return {"deleted": prediction_id}
