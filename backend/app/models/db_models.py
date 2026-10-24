"""SQLAlchemy ORM models for AgentShield."""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _uuid():
    return str(uuid.uuid4())


class AgentModel(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    permissions: Mapped[str] = mapped_column(Text, default="[]")  # JSON list
    status: Mapped[str] = mapped_column(String, default="active")  # active, suspended, inactive
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    action_count: Mapped[int] = mapped_column(Integer, default=0)
    block_count: Mapped[int] = mapped_column(Integer, default=0)


class ActionModel(Base):
    __tablename__ = "actions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    agent_id: Mapped[str] = mapped_column(String, nullable=False)
    action_type: Mapped[str] = mapped_column(String, nullable=False)
    target_resource: Mapped[str] = mapped_column(String, nullable=False)
    operation: Mapped[str] = mapped_column(String, default="")
    sensitivity: Mapped[str] = mapped_column(String, default="public")
    destination: Mapped[str] = mapped_column(String, nullable=True)
    context: Mapped[str] = mapped_column(Text, default="")
    justification: Mapped[str] = mapped_column(Text, default="")

    # Security evaluation results
    decision: Mapped[str] = mapped_column(String, nullable=False)  # ALLOW, REVIEW, BLOCK
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_level: Mapped[str] = mapped_column(String, default="LOW")
    policy_rule: Mapped[str] = mapped_column(String, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    flags: Mapped[str] = mapped_column(Text, default="[]")  # JSON list

    # Execution
    execution_status: Mapped[str] = mapped_column(String, default="pending")  # pending, executed, blocked, expired
    authorization_token: Mapped[str] = mapped_column(String, nullable=True)
    execution_result: Mapped[str] = mapped_column(Text, nullable=True)

    # Approval info
    approval_id: Mapped[str] = mapped_column(String, nullable=True)
    approved_by: Mapped[str] = mapped_column(String, nullable=True)
    approved_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Anomaly info
    anomaly_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    anomaly_severity: Mapped[str] = mapped_column(String, nullable=True)
    anomaly_reason: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ApprovalModel(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    action_id: Mapped[str] = mapped_column(String, nullable=False)
    agent_id: Mapped[str] = mapped_column(String, nullable=False)
    action_type: Mapped[str] = mapped_column(String, nullable=False)
    target_resource: Mapped[str] = mapped_column(String, nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    reason: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="pending")  # pending, approved, rejected, expired
    reviewed_by: Mapped[str] = mapped_column(String, nullable=True)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    review_note: Mapped[str] = mapped_column(Text, nullable=True)
    # Snapshot of action parameters at review time (for revalidation)
    action_snapshot: Mapped[str] = mapped_column(Text, default="{}")  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    action_id: Mapped[str] = mapped_column(String, nullable=False)
    agent_id: Mapped[str] = mapped_column(String, nullable=False)
    action_type: Mapped[str] = mapped_column(String, nullable=False)
    target_resource: Mapped[str] = mapped_column(String, nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    decision: Mapped[str] = mapped_column(String, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="")
    policy_rule: Mapped[str] = mapped_column(String, default="")
    execution_status: Mapped[str] = mapped_column(String, default="pending")
    approved_by: Mapped[str] = mapped_column(String, nullable=True)
    approved_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    anomaly_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AlertModel(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    agent_id: Mapped[str] = mapped_column(String, nullable=False)
    action_id: Mapped[str] = mapped_column(String, nullable=True)
    alert_type: Mapped[str] = mapped_column(String, nullable=False)  # anomaly, policy_violation, suspicious
    severity: Mapped[str] = mapped_column(String, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    message: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_response: Mapped[str] = mapped_column(Text, default="")
    related_action_ids: Mapped[str] = mapped_column(Text, default="[]")  # JSON list
    status: Mapped[str] = mapped_column(String, default="open")  # open, acknowledged, resolved
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PolicyModel(Base):
    __tablename__ = "policies"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    condition: Mapped[str] = mapped_column(Text, default="")
    required_permission: Mapped[str] = mapped_column(String, nullable=True)
    decision: Mapped[str] = mapped_column(String, nullable=False)
    risk_base: Mapped[int] = mapped_column(Integer, default=50)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    explicit_block: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
