"""Dashboard summary endpoint."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.db_models import ActionModel, ApprovalModel, AlertModel, AgentModel
from app.models.schemas import DashboardSummary

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    # Total actions
    total = (await db.execute(select(func.count(ActionModel.id)))).scalar() or 0
    allowed = (await db.execute(select(func.count(ActionModel.id)).where(ActionModel.decision == "ALLOW"))).scalar() or 0
    blocked = (await db.execute(select(func.count(ActionModel.id)).where(ActionModel.decision == "BLOCK"))).scalar() or 0
    review = (await db.execute(select(func.count(ActionModel.id)).where(ActionModel.decision == "REVIEW"))).scalar() or 0

    # Pending approvals
    pending = (await db.execute(
        select(func.count(ApprovalModel.id)).where(ApprovalModel.status == "pending")
    )).scalar() or 0

    # Open alerts
    open_alerts = (await db.execute(
        select(func.count(AlertModel.id)).where(AlertModel.status == "open")
    )).scalar() or 0

    # High-risk alerts
    high_risk = (await db.execute(
        select(func.count(AlertModel.id)).where(
            AlertModel.status == "open",
            AlertModel.severity.in_(["HIGH", "CRITICAL"])
        )
    )).scalar() or 0

    # Active agents
    active_agents = (await db.execute(
        select(func.count(AgentModel.id)).where(AgentModel.status == "active")
    )).scalar() or 0

    # Risk distribution from actions
    low = (await db.execute(select(func.count(ActionModel.id)).where(ActionModel.risk_level == "LOW"))).scalar() or 0
    medium = (await db.execute(select(func.count(ActionModel.id)).where(ActionModel.risk_level == "MEDIUM"))).scalar() or 0
    high = (await db.execute(select(func.count(ActionModel.id)).where(ActionModel.risk_level == "HIGH"))).scalar() or 0

    # Recent 10 decisions
    recent_result = await db.execute(
        select(ActionModel).order_by(ActionModel.created_at.desc()).limit(10)
    )
    recent_actions = recent_result.scalars().all()
    recent_decisions = [
        {
            "action_id": a.id,
            "agent_id": a.agent_id,
            "action_type": a.action_type,
            "target_resource": a.target_resource,
            "decision": a.decision,
            "risk_score": a.risk_score,
            "created_at": a.created_at.isoformat(),
        }
        for a in recent_actions
    ]

    # Decision trend (last 7 days)
    trend = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        a = (await db.execute(select(func.count(ActionModel.id)).where(ActionModel.created_at >= day_start, ActionModel.created_at < day_end, ActionModel.decision == "ALLOW"))).scalar() or 0
        b = (await db.execute(select(func.count(ActionModel.id)).where(ActionModel.created_at >= day_start, ActionModel.created_at < day_end, ActionModel.decision == "BLOCK"))).scalar() or 0
        r = (await db.execute(select(func.count(ActionModel.id)).where(ActionModel.created_at >= day_start, ActionModel.created_at < day_end, ActionModel.decision == "REVIEW"))).scalar() or 0
        trend.append({
            "date": day.strftime("%m/%d"),
            "allowed": a,
            "blocked": b,
            "review": r,
        })

    return DashboardSummary(
        total_actions=total,
        allowed_actions=allowed,
        blocked_actions=blocked,
        review_actions=review,
        pending_approvals=pending,
        high_risk_alerts=high_risk,
        active_agents=active_agents,
        open_alerts=open_alerts,
        risk_distribution={"low": low, "medium": medium, "high": high},
        recent_decisions=recent_decisions,
        decision_trend=trend,
    )
