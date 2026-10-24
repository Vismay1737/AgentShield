"""Approval queue endpoints."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.db_models import ApprovalModel
from app.models.schemas import ApprovalResponse, ApprovalActionRequest
from app.services.gateway import process_approval

router = APIRouter(tags=["Approvals"])


def _approval_to_response(approval: ApprovalModel) -> ApprovalResponse:
    return ApprovalResponse(
        id=approval.id,
        action_id=approval.action_id,
        agent_id=approval.agent_id,
        action_type=approval.action_type,
        target_resource=approval.target_resource,
        risk_score=approval.risk_score,
        reason=approval.reason,
        status=approval.status,
        reviewed_by=approval.reviewed_by,
        reviewed_at=approval.reviewed_at.isoformat() if approval.reviewed_at else None,
        review_note=approval.review_note,
        created_at=approval.created_at.isoformat(),
        expires_at=approval.expires_at.isoformat() if approval.expires_at else None,
        action_snapshot=approval.action_snapshot,
    )


@router.get("/approvals", response_model=list[ApprovalResponse])
async def list_approvals(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(ApprovalModel).order_by(ApprovalModel.created_at.desc())
    if status:
        q = q.where(ApprovalModel.status == status)
    result = await db.execute(q)
    approvals = result.scalars().all()
    return [_approval_to_response(a) for a in approvals]


@router.get("/approvals/{approval_id}", response_model=ApprovalResponse)
async def get_approval(approval_id: str, db: AsyncSession = Depends(get_db)):
    approval = await db.get(ApprovalModel, approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found.")
    return _approval_to_response(approval)


@router.post("/approvals/{approval_id}/approve")
async def approve_action(
    approval_id: str,
    request: ApprovalActionRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await process_approval(
        approval_id=approval_id,
        approve=True,
        reviewer=request.reviewer,
        note=request.note,
        db=db,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/approvals/{approval_id}/reject")
async def reject_action(
    approval_id: str,
    request: ApprovalActionRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await process_approval(
        approval_id=approval_id,
        approve=False,
        reviewer=request.reviewer,
        note=request.note,
        db=db,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result
