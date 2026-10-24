"""Actions evaluate and execute endpoints."""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.db_models import ActionModel
from app.models.schemas import ActionRequest, ExecuteRequest, ActionResponse
from app.services.gateway import evaluate_action, execute_action

router = APIRouter(tags=["Actions"])


def _action_to_response(action: ActionModel) -> ActionResponse:
    return ActionResponse(
        action_id=action.id,
        agent_id=action.agent_id,
        action_type=action.action_type,
        target_resource=action.target_resource,
        decision=action.decision,
        risk_score=action.risk_score,
        risk_level=action.risk_level,
        policy_rule=action.policy_rule,
        explanation=action.explanation,
        flags=json.loads(action.flags) if action.flags else [],
        anomaly_detected=action.anomaly_detected,
        anomaly_severity=action.anomaly_severity,
        anomaly_reason=action.anomaly_reason,
        execution_status=action.execution_status,
        authorization_token=action.authorization_token if action.decision == "ALLOW" else None,
        created_at=action.created_at.isoformat(),
    )


@router.get("/actions", response_model=list[ActionResponse])
async def list_actions(
    agent_id: str | None = Query(None),
    decision: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    q = select(ActionModel).order_by(ActionModel.created_at.desc())
    if agent_id:
        q = q.where(ActionModel.agent_id == agent_id)
    if decision:
        q = q.where(ActionModel.decision == decision.upper())
    q = q.offset(offset).limit(limit)
    result = await db.execute(q)
    actions = result.scalars().all()
    return [_action_to_response(a) for a in actions]


@router.get("/actions/{action_id}", response_model=ActionResponse)
async def get_action(action_id: str, db: AsyncSession = Depends(get_db)):
    action = await db.get(ActionModel, action_id)
    if action is None:
        raise HTTPException(status_code=404, detail="Action not found.")
    return _action_to_response(action)


@router.post("/actions/evaluate", response_model=ActionResponse, status_code=201)
async def evaluate_action_endpoint(request: ActionRequest, db: AsyncSession = Depends(get_db)):
    """
    Submit an action request for security evaluation.
    Returns the security decision without executing the action.
    """
    action = await evaluate_action(request, db)
    return _action_to_response(action)


@router.post("/actions/execute")
async def execute_action_endpoint(request: ExecuteRequest, db: AsyncSession = Depends(get_db)):
    """
    Execute a previously evaluated and authorized action.
    Backend ALWAYS revalidates authorization — never trusts frontend state.
    """
    result = await execute_action(request.action_id, db)
    if not result.get("success"):
        raise HTTPException(status_code=403, detail=result.get("error", "Execution denied."))
    return result
