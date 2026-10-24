"""
AgentShield Security Gateway Service.

This is the central authorization function that every action MUST pass through.
It enforces all security decisions before tool execution.
"""
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.policy_engine import evaluate_policy, Decision, POLICIES
from app.core.anomaly_detector import detect_anomalies, behavior_tracker
from app.core.mock_tools import execute_tool, issue_authorization_token, revoke_token, MockToolError
from app.core.ws_manager import ws_manager
from app.models.db_models import (
    AgentModel, ActionModel, ApprovalModel, AuditLogModel, AlertModel, PolicyModel
)
from app.models.schemas import ActionRequest


APPROVAL_EXPIRY_HOURS = 24
EXPLICITLY_BLOCKED_ACTIONS = {"delete", "drop_database", "format", "overwrite", "grant_permission"}


async def evaluate_action(request: ActionRequest, db: AsyncSession) -> ActionModel:
    """
    Central authorization function. Evaluates an action request through the full
    security pipeline. Returns an ActionModel with the decision.

    This function MUST be called before any tool execution.
    """
    action_id = str(uuid.uuid4())

    # 1. Identity and Permission Validation — fetch agent
    agent = await db.get(AgentModel, request.agent_id)
    if agent is None:
        # Unknown agent — block immediately
        action = ActionModel(
            id=action_id,
            agent_id=request.agent_id,
            action_type=request.action_type,
            target_resource=request.target_resource,
            operation=request.operation,
            sensitivity=request.sensitivity,
            destination=request.destination,
            context=request.context,
            justification=request.justification,
            decision="BLOCK",
            risk_score=100,
            risk_level="HIGH",
            policy_rule="POL-IDENTITY",
            explanation=f"Unknown agent '{request.agent_id}'. All actions from unregistered agents are blocked.",
            flags=json.dumps(["UNKNOWN_AGENT"]),
            execution_status="blocked",
        )
        db.add(action)
        await db.commit()
        await db.refresh(action)
        await _create_audit_log(action, db)
        return action

    agent_permissions = json.loads(agent.permissions)

    # 2. Behavioral Anomaly Detection (pre-policy, uses history)
    anomaly = detect_anomalies(
        agent_id=request.agent_id,
        action_type=request.action_type,
        target_resource=request.target_resource,
        current_decision="unknown",  # Will be updated after policy eval
    )

    # 3. Policy Engine Evaluation
    policy_result = evaluate_policy(
        action_type=request.action_type,
        sensitivity=request.sensitivity,
        agent_permissions=agent_permissions,
        target_resource=request.target_resource,
        agent_id=request.agent_id,
        destination=request.destination,
        anomaly_penalty=anomaly.anomaly_penalty,
    )

    # 4. Record to behavior tracker
    behavior_tracker.record_action(
        agent_id=request.agent_id,
        action_type=request.action_type,
        target_resource=request.target_resource,
        decision=policy_result.decision.value,
        action_id=action_id,
    )

    # 5. Issue authorization token only for ALLOW decisions
    auth_token = None
    if policy_result.decision == Decision.ALLOW:
        auth_token = issue_authorization_token(
            action_id=action_id,
            agent_id=request.agent_id,
            action_type=request.action_type,
            target_resource=request.target_resource,
        )

    execution_status = {
        Decision.ALLOW: "authorized",
        Decision.REVIEW: "pending_approval",
        Decision.BLOCK: "blocked",
    }[policy_result.decision]

    flags = policy_result.flags.copy()
    if anomaly.detected:
        flags.append("ANOMALY_DETECTED")

    # 6. Persist action record
    action = ActionModel(
        id=action_id,
        agent_id=request.agent_id,
        action_type=request.action_type,
        target_resource=request.target_resource,
        operation=request.operation,
        sensitivity=request.sensitivity,
        destination=request.destination,
        context=request.context,
        justification=request.justification,
        decision=policy_result.decision.value,
        risk_score=policy_result.risk_score,
        risk_level=policy_result.risk_level.value,
        policy_rule=policy_result.policy_rule,
        explanation=policy_result.explanation,
        flags=json.dumps(flags),
        execution_status=execution_status,
        authorization_token=auth_token,
        anomaly_detected=anomaly.detected,
        anomaly_severity=anomaly.severity if anomaly.detected else None,
        anomaly_reason=anomaly.reason if anomaly.detected else None,
    )
    db.add(action)

    # 7. Update agent stats
    agent.action_count += 1
    if policy_result.decision == Decision.BLOCK:
        agent.block_count += 1
    agent.last_seen = datetime.utcnow()

    # 8. Create approval request if REVIEW
    if policy_result.decision == Decision.REVIEW:
        approval = ApprovalModel(
            id=str(uuid.uuid4()),
            action_id=action_id,
            agent_id=request.agent_id,
            action_type=request.action_type,
            target_resource=request.target_resource,
            risk_score=policy_result.risk_score,
            reason=policy_result.explanation,
            status="pending",
            action_snapshot=json.dumps({
                "action_type": request.action_type,
                "target_resource": request.target_resource,
                "sensitivity": request.sensitivity,
                "destination": request.destination,
                "agent_id": request.agent_id,
            }),
            expires_at=datetime.utcnow() + timedelta(hours=APPROVAL_EXPIRY_HOURS),
        )
        db.add(approval)
        action.approval_id = approval.id

    await db.commit()
    await db.refresh(action)

    # 9. Create audit log entry
    await _create_audit_log(action, db)

    # 10. Create alert if anomaly detected
    if anomaly.detected:
        await _create_anomaly_alert(action, anomaly, db)

    # 11. Broadcast to WebSocket clients
    await ws_manager.broadcast("action_evaluated", {
        "action_id": action_id,
        "agent_id": request.agent_id,
        "action_type": request.action_type,
        "decision": policy_result.decision.value,
        "risk_score": policy_result.risk_score,
    })

    return action


async def execute_action(action_id: str, db: AsyncSession) -> dict:
    """
    Execute an authorized action. MUST revalidate authorization before execution.
    Never trusts frontend decision — revalidates from database state.
    """
    action = await db.get(ActionModel, action_id)
    if action is None:
        return {"error": "Action not found", "success": False}

    # Revalidation checks
    if action.execution_status == "executed":
        return {"error": "Action already executed (duplicate execution prevented).", "success": False}

    if action.execution_status == "blocked":
        return {"error": "Action was blocked by security policy. Cannot execute.", "success": False}

    if action.decision == "BLOCK":
        return {"error": "Blocked actions cannot be executed.", "success": False}

    if action.decision == "REVIEW" and action.execution_status != "approved":
        return {"error": "Action requires human approval before execution.", "success": False}

    if action.decision != "ALLOW" and action.execution_status != "approved":
        return {"error": f"Unexpected state: decision={action.decision}, status={action.execution_status}", "success": False}

    # For approved actions, re-fetch and validate the agent still has permissions
    if action.execution_status == "approved":
        agent = await db.get(AgentModel, action.agent_id)
        if agent is None or agent.status != "active":
            action.execution_status = "blocked"
            await db.commit()
            return {"error": "Agent is no longer active. Execution blocked.", "success": False}

        agent_permissions = json.loads(agent.permissions)
        recheck = evaluate_policy(
            action_type=action.action_type,
            sensitivity=action.sensitivity,
            agent_permissions=agent_permissions,
            target_resource=action.target_resource,
            agent_id=action.agent_id,
            destination=action.destination,
        )
        if recheck.decision == Decision.BLOCK:
            action.execution_status = "blocked"
            action.explanation += " [REVALIDATION FAILED: " + recheck.explanation + "]"
            await db.commit()
            await _update_audit_execution(action_id, "blocked", db)
            return {"error": f"Revalidation failed: {recheck.explanation}", "success": False}

        # Issue fresh token for post-approval execution
        token = issue_authorization_token(
            action_id=action_id,
            agent_id=action.agent_id,
            action_type=action.action_type,
            target_resource=action.target_resource,
        )
        action.authorization_token = token

    # Execute the mock tool
    try:
        result = execute_tool(
            action_type=action.action_type,
            target_resource=action.target_resource,
            destination=action.destination,
            token=action.authorization_token,
        )
        action.execution_status = "executed"
        action.execution_result = json.dumps(result)
        await db.commit()
        await _update_audit_execution(action_id, "executed", db)

        await ws_manager.broadcast("action_executed", {
            "action_id": action_id,
            "agent_id": action.agent_id,
            "action_type": action.action_type,
            "status": "executed",
        })

        return {"success": True, "result": result, "action_id": action_id}

    except MockToolError as e:
        action.execution_status = "blocked"
        action.execution_result = json.dumps({"error": str(e)})
        await db.commit()
        await _update_audit_execution(action_id, "blocked", db)
        return {"error": str(e), "success": False}


async def process_approval(
    approval_id: str,
    approve: bool,
    reviewer: str,
    note: Optional[str],
    db: AsyncSession,
) -> dict:
    """
    Process a human approval decision. Revalidates before marking approved.
    Explicitly blocked actions CANNOT be approved through this workflow.
    """
    approval = await db.get(ApprovalModel, approval_id)
    if approval is None:
        return {"error": "Approval request not found.", "success": False}

    if approval.status != "pending":
        return {"error": f"Approval already processed: {approval.status}", "success": False}

    # Check expiry
    if approval.expires_at and datetime.utcnow() > approval.expires_at:
        approval.status = "expired"
        await db.commit()
        return {"error": "Approval request has expired.", "success": False}

    action = await db.get(ActionModel, approval.action_id)
    if action is None:
        return {"error": "Associated action not found.", "success": False}

    # Snapshot revalidation — detect if action was modified
    snapshot = json.loads(approval.action_snapshot)
    if (
        snapshot.get("action_type") != action.action_type
        or snapshot.get("target_resource") != action.target_resource
        or snapshot.get("agent_id") != action.agent_id
    ):
        approval.status = "rejected"
        approval.reviewed_by = reviewer
        approval.reviewed_at = datetime.utcnow()
        approval.review_note = "Action parameters were modified after approval request. Auto-rejected."
        action.execution_status = "blocked"
        await db.commit()
        return {"error": "Action parameters modified after request. Auto-rejected for security.", "success": False}

    # Explicitly blocked actions cannot be approved
    if action.action_type in EXPLICITLY_BLOCKED_ACTIONS:
        approval.status = "rejected"
        approval.reviewed_by = reviewer
        approval.reviewed_at = datetime.utcnow()
        approval.review_note = "Explicitly prohibited action cannot be approved."
        await db.commit()
        return {"error": "This action type is explicitly prohibited and cannot be approved.", "success": False}

    now = datetime.utcnow()
    approval.reviewed_by = reviewer
    approval.reviewed_at = now
    approval.review_note = note

    if approve:
        approval.status = "approved"
        action.execution_status = "approved"
        action.approved_by = reviewer
        action.approved_at = now
    else:
        approval.status = "rejected"
        action.execution_status = "blocked"
        if action.authorization_token:
            revoke_token(action.authorization_token)

    await db.commit()
    await _update_audit_execution(action.id, action.execution_status, db)

    await ws_manager.broadcast("approval_processed", {
        "approval_id": approval_id,
        "action_id": approval.action_id,
        "status": approval.status,
        "reviewer": reviewer,
    })

    return {
        "success": True,
        "approval_id": approval_id,
        "action_id": approval.action_id,
        "status": approval.status,
    }


async def _create_audit_log(action: ActionModel, db: AsyncSession):
    """Create an immutable audit log entry for an action decision."""
    log = AuditLogModel(
        id=str(uuid.uuid4()),
        action_id=action.id,
        agent_id=action.agent_id,
        action_type=action.action_type,
        target_resource=action.target_resource,
        risk_score=action.risk_score,
        decision=action.decision,
        explanation=action.explanation,
        policy_rule=action.policy_rule,
        execution_status=action.execution_status,
        approved_by=action.approved_by,
        approved_at=action.approved_at,
        anomaly_detected=action.anomaly_detected,
    )
    db.add(log)
    await db.commit()


async def _update_audit_execution(action_id: str, new_status: str, db: AsyncSession):
    """Update audit log with final execution status."""
    result = await db.execute(
        select(AuditLogModel).where(AuditLogModel.action_id == action_id).order_by(desc(AuditLogModel.timestamp)).limit(1)
    )
    log = result.scalar_one_or_none()
    if log:
        log.execution_status = new_status
        await db.commit()


async def _create_anomaly_alert(action: ActionModel, anomaly, db: AsyncSession):
    """Create an alert record for detected anomalies."""
    alert = AlertModel(
        id=str(uuid.uuid4()),
        agent_id=action.agent_id,
        action_id=action.id,
        alert_type="anomaly",
        severity=anomaly.severity,
        message=anomaly.reason,
        recommended_response=anomaly.recommended_response,
        related_action_ids=json.dumps(anomaly.related_action_ids),
        status="open",
    )
    db.add(alert)
    await db.commit()

    await ws_manager.broadcast("alert_created", {
        "alert_id": alert.id,
        "agent_id": action.agent_id,
        "severity": anomaly.severity,
        "message": anomaly.reason,
    })
