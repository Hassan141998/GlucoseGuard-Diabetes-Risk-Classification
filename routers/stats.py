from fastapi import APIRouter
from database import get_db
from schemas import StatsResponse
from services.model_service import get_model_service

router = APIRouter(tags=["Stats"])


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    svc = get_model_service()
    metrics = svc.get_metrics()

    with get_db() as conn:
        cur = conn.cursor()

        # Totals
        cur.execute("""
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN result='Diabetic' THEN 1 ELSE 0 END) AS diabetic,
                SUM(CASE WHEN result='Non-Diabetic' THEN 1 ELSE 0 END) AS non_diabetic,
                AVG(probability) AS avg_prob,
                AVG(glucose) AS avg_glucose,
                AVG(bmi) AS avg_bmi,
                AVG(age) AS avg_age
            FROM predictions
        """)
        totals = cur.fetchone()

        # Risk distribution
        cur.execute("""
            SELECT risk_level, COUNT(*) AS cnt
            FROM predictions
            GROUP BY risk_level
        """)
        risk_rows = cur.fetchall()

        # 7-day trend
        cur.execute("""
            SELECT
                DATE(created_at) AS day,
                COUNT(*) AS total,
                SUM(CASE WHEN result='Diabetic' THEN 1 ELSE 0 END) AS diabetic
            FROM predictions
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY day
            ORDER BY day
        """)
        trend_rows = cur.fetchall()

        # Model usage
        cur.execute("""
            SELECT model_used, COUNT(*) AS cnt
            FROM predictions
            GROUP BY model_used
        """)
        usage_rows = cur.fetchall()

    total = int(totals["total"] or 0)
    diabetic = int(totals["diabetic"] or 0)
    non_diabetic = int(totals["non_diabetic"] or 0)
    risk_dist = {r["risk_level"]: int(r["cnt"]) for r in risk_rows}
    trend = [
        {"day": str(r["day"]), "total": int(r["total"]), "diabetic": int(r["diabetic"])}
        for r in trend_rows
    ]
    model_usage = {r["model_used"]: int(r["cnt"]) for r in usage_rows}

    return StatsResponse(
        total_predictions=total,
        diabetic_count=diabetic,
        non_diabetic_count=non_diabetic,
        diabetic_rate=round(diabetic / total, 4) if total else 0.0,
        avg_probability=round(float(totals["avg_prob"] or 0), 4),
        risk_distribution=risk_dist,
        avg_glucose=round(float(totals["avg_glucose"] or 0), 2),
        avg_bmi=round(float(totals["avg_bmi"] or 0), 2),
        avg_age=round(float(totals["avg_age"] or 0), 2),
        recent_trend=trend,
        model_usage=model_usage,
        model_metrics=metrics,
    )
