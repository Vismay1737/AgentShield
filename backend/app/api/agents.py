"""Agents CRUD endpoints."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.db_models import AgentModel
from app.models.schemas import AgentResponse

router = APIRouter(tags=["Agents"])


def _agent_to_response(agent: AgentModel) -> AgentResponse:
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        permissions=json.loads(agent.permissions),
        status=agent.status,
        created_at=agent.created_at.isoformat(),
        last_seen=agent.last_seen.isoformat(),
        action_count=agent.action_count,
        block_count=agent.block_count,
    )


@router.get("/agents", response_model=list[AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentModel).order_by(AgentModel.created_at.desc()))
    agents = result.scalars().all()
    return [_agent_to_response(a) for a in agents]


@router.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    agent = await db.get(AgentModel, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found.")
    return _agent_to_response(agent)


@router.post("/agents/{agent_id}/status", response_model=AgentResponse)
async def update_agent_status(agent_id: str, payload: dict, db: AsyncSession = Depends(get_db)):
    agent = await db.get(AgentModel, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found.")
    new_status = payload.get("status", "quarantined")
    agent.status = new_status
    await db.commit()
    await db.refresh(agent)
    return _agent_to_response(agent)

