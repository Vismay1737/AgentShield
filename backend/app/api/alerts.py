"""Security alerts endpoints."""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.db_models import AlertModel
from app.models.schemas import AlertResponse

router = APIRouter(tags=["Alerts"])


def _alert_to_response(alert: AlertModel) -> AlertResponse:
    return AlertResponse(
        id=alert.id,
        agent_id=alert.agent_id,
        action_id=alert.action_id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        message=alert.message,
        recommended_response=alert.recommended_response,
        related_action_ids=json.loads(alert.related_action_ids) if alert.related_action_ids else [],
        status=alert.status,
        created_at=alert.created_at.isoformat(),
    )


@router.get("/alerts", response_model=list[AlertResponse])
async def list_alerts(
    status: str | None = Query(None),
    severity: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(AlertModel).order_by(AlertModel.created_at.desc())
    if status:
        q = q.where(AlertModel.status == status)
    if severity:
        q = q.where(AlertModel.severity == severity.upper())
    result = await db.execute(q)
    alerts = result.scalars().all()
    return [_alert_to_response(a) for a in alerts]


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, db: AsyncSession = Depends(get_db)):
    alert = await db.get(AlertModel, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.status = "acknowledged"
    await db.commit()
    return {"success": True, "alert_id": alert_id, "status": "acknowledged"}
