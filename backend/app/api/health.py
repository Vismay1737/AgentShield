"""Health check endpoint."""
from datetime import datetime
from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AgentShield API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
    }
