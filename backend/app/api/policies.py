"""Policies endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.db_models import PolicyModel

router = APIRouter(tags=["Policies"])


@router.get("/policies")
async def list_policies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PolicyModel).order_by(PolicyModel.id))
    policies = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "condition": p.condition,
            "required_permission": p.required_permission,
            "decision": p.decision,
            "risk_base": p.risk_base,
            "enabled": p.enabled,
            "explicit_block": p.explicit_block,
            "created_at": p.created_at.isoformat(),
        }
        for p in policies
    ]


@router.patch("/policies/{policy_id}/toggle")
async def toggle_policy(policy_id: str, db: AsyncSession = Depends(get_db)):
    """Toggle a policy's enabled state (cannot toggle explicit_block policies)."""
    policy = await db.get(PolicyModel, policy_id)
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found.")
    if policy.explicit_block:
        raise HTTPException(status_code=400, detail="Explicit block policies cannot be disabled.")
    policy.enabled = not policy.enabled
    await db.commit()
    return {"success": True, "policy_id": policy_id, "enabled": policy.enabled}
