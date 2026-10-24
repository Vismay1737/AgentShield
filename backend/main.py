"""AgentShield Backend - Main Application Entry Point"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_db
from app.core.seed import seed_initial_data
from app.api import health, dashboard, agents, actions, approvals, audit_logs, alerts, policies, demo, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB and seed data on startup."""
    await init_db()
    await seed_initial_data()
    yield


app = FastAPI(
    title="AgentShield API",
    description="AI Agent Security Gateway — monitors, evaluates, and controls AI agent actions before execution.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(health.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(actions.router, prefix="/api")
app.include_router(approvals.router, prefix="/api")
app.include_router(audit_logs.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(policies.router, prefix="/api")
app.include_router(demo.router, prefix="/api")
app.include_router(websocket.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "AgentShield API", "docs": "/api/docs"}
