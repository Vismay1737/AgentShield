"""Audit logs endpoint."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.db_models import AuditLogModel
from app.models.schemas import AuditLogResponse

router = APIRouter(tags=["Audit Logs"])


def _log_to_response(log: AuditLogModel) -> AuditLogResponse:
    return AuditLogResponse(
        id=log.id,
        action_id=log.action_id,
        agent_id=log.agent_id,
        action_type=log.action_type,
        target_resource=log.target_resource,
        risk_score=log.risk_score,
        decision=log.decision,
        explanation=log.explanation,
        policy_rule=log.policy_rule,
        execution_status=log.execution_status,
        approved_by=log.approved_by,
        approved_at=log.approved_at.isoformat() if log.approved_at else None,
        anomaly_detected=log.anomaly_detected,
        timestamp=log.timestamp.isoformat(),
    )


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    agent_id: str | None = Query(None),
    decision: str | None = Query(None),
    search: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    q = select(AuditLogModel).order_by(AuditLogModel.timestamp.desc())

    if agent_id:
        q = q.where(AuditLogModel.agent_id == agent_id)
    if decision:
        q = q.where(AuditLogModel.decision == decision.upper())
    if search:
        like = f"%{search}%"
        q = q.where(
            AuditLogModel.target_resource.ilike(like) |
            AuditLogModel.action_type.ilike(like) |
            AuditLogModel.explanation.ilike(like)
        )
    if date_from:
        from datetime import datetime
        q = q.where(AuditLogModel.timestamp >= datetime.fromisoformat(date_from))
    if date_to:
        from datetime import datetime
        q = q.where(AuditLogModel.timestamp <= datetime.fromisoformat(date_to))

    q = q.offset(offset).limit(limit)
    result = await db.execute(q)
    logs = result.scalars().all()
    return [_log_to_response(log) for log in logs]
