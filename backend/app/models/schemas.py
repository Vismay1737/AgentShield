"""Pydantic request/response schemas."""
import json
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator


class ActionRequest(BaseModel):
    """Schema for an agent submitting an action request."""
    agent_id: str = Field(..., min_length=1, description="Identifier of the requesting agent")
    action_type: str = Field(..., min_length=1, description="Type of action: read_report, read_file, query_database, send_email, execute_command, sensitive_operation")
    target_resource: str = Field(..., min_length=1, description="Target resource path or name")
    operation: str = Field(default="", description="Specific operation detail")
    sensitivity: str = Field(default="public", description="Resource sensitivity: public, internal, sensitive, restricted, confidential")
    destination: Optional[str] = Field(default=None, description="Destination (for email/transfer actions)")
    context: str = Field(default="", description="Contextual information about the action")
    justification: str = Field(default="", description="Agent's justification for the action")

    @field_validator("action_type")
    @classmethod
    def validate_action_type(cls, v: str) -> str:
        allowed = {"read_report", "read_file", "query_database", "send_email", "execute_command", "sensitive_operation", "grant_permission", "delete", "drop_database"}
        if v not in allowed:
            raise ValueError(f"action_type must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("sensitivity")
    @classmethod
    def validate_sensitivity(cls, v: str) -> str:
        allowed = {"public", "internal", "sensitive", "restricted", "confidential"}
        if v not in allowed:
            raise ValueError(f"sensitivity must be one of: {', '.join(sorted(allowed))}")
        return v


class ExecuteRequest(BaseModel):
    """Schema to request execution of an already-evaluated action."""
    action_id: str = Field(..., description="ID of the previously evaluated action")
    authorization_token: Optional[str] = Field(default=None, description="Authorization token (for ALLOW decisions)")


class ApprovalActionRequest(BaseModel):
    """Schema for human approval or rejection."""
    reviewer: str = Field(default="demo_admin", description="Identity of the human reviewer")
    note: Optional[str] = Field(default=None, description="Review note or reason")


class ActionResponse(BaseModel):
    action_id: str
    agent_id: str
    action_type: str
    target_resource: str
    decision: str
    risk_score: int
    risk_level: str
    policy_rule: str
    explanation: str
    flags: list[str]
    anomaly_detected: bool
    anomaly_severity: Optional[str]
    anomaly_reason: Optional[str]
    execution_status: str
    authorization_token: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class AgentResponse(BaseModel):
    id: str
    name: str
    description: str
    permissions: list[str]
    status: str
    created_at: str
    last_seen: str
    action_count: int
    block_count: int

    class Config:
        from_attributes = True


class ApprovalResponse(BaseModel):
    id: str
    action_id: str
    agent_id: str
    action_type: str
    target_resource: str
    risk_score: int
    reason: str
    status: str
    reviewed_by: Optional[str]
    reviewed_at: Optional[str]
    review_note: Optional[str]
    created_at: str
    expires_at: Optional[str]
    action_snapshot: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: str
    action_id: str
    agent_id: str
    action_type: str
    target_resource: str
    risk_score: int
    decision: str
    explanation: str
    policy_rule: str
    execution_status: str
    approved_by: Optional[str]
    approved_at: Optional[str]
    anomaly_detected: bool
    timestamp: str

    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    id: str
    agent_id: str
    action_id: Optional[str]
    alert_type: str
    severity: str
    message: str
    recommended_response: str
    related_action_ids: list[str]
    status: str
    created_at: str

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    total_actions: int
    allowed_actions: int
    blocked_actions: int
    review_actions: int
    pending_approvals: int
    high_risk_alerts: int
    active_agents: int
    open_alerts: int
    risk_distribution: dict[str, int]
    recent_decisions: list[dict]
    decision_trend: list[dict]
