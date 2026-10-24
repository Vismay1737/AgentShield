"""Demo Lab scenarios — safe, reproducible test scenarios."""
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete

from app.core.database import get_db
from app.core.anomaly_detector import behavior_tracker
from app.core.mock_tools import reset_tokens
from app.models.db_models import ActionModel, ApprovalModel, AuditLogModel, AlertModel, AgentModel
from app.services.gateway import evaluate_action, execute_action
from app.models.schemas import ActionRequest

router = APIRouter(tags=["Demo"])


DEMO_SCENARIOS = [
    {
        "id": "scenario-a",
        "name": "Scenario A: Authorized Access",
        "description": "Alpha Agent requests a public sales report. Expected: ALLOW and tool executes.",
        "expected_decision": "ALLOW",
        "request": {
            "agent_id": "agent-alpha",
            "action_type": "read_report",
            "target_resource": "reports/sales-q3-2024.pdf",
            "operation": "read",
            "sensitivity": "public",
            "context": "Generating quarterly summary",
            "justification": "Required for board presentation.",
        },
    },
    {
        "id": "scenario-b",
        "name": "Scenario B: Unauthorized File Access",
        "description": "Gamma Agent (minimal permissions) requests a restricted financial file. Expected: BLOCK.",
        "expected_decision": "BLOCK",
        "request": {
            "agent_id": "agent-gamma",
            "action_type": "read_file",
            "target_resource": "files/financial-report-2024.xlsx",
            "operation": "read",
            "sensitivity": "restricted",
            "context": "Attempting to access restricted report",
            "justification": "Need data for analysis.",
        },
    },
    {
        "id": "scenario-c",
        "name": "Scenario C: Sensitive Action Requiring Approval",
        "description": "Delta Agent requests a sensitive operation. Expected: REVIEW (pending approval).",
        "expected_decision": "REVIEW",
        "request": {
            "agent_id": "agent-delta",
            "action_type": "sensitive_operation",
            "target_resource": "ops/system-config-update",
            "operation": "update",
            "sensitivity": "sensitive",
            "context": "Production configuration change",
            "justification": "Required for performance optimization.",
        },
    },
    {
        "id": "scenario-d",
        "name": "Scenario D: Suspicious Behavior (Anomaly Detection)",
        "description": "Gamma Agent repeatedly tries to access restricted resources, triggering anomaly detection.",
        "expected_decision": "BLOCK",
        "multi_request": True,
        "requests": [
            {
                "agent_id": "agent-gamma",
                "action_type": "read_file",
                "target_resource": f"files/restricted-doc-{i}.txt",
                "operation": "read",
                "sensitivity": "restricted",
                "context": "Repeated access attempt",
                "justification": f"Attempt {i}",
            }
            for i in range(1, 5)
        ],
    },
    {
        "id": "scenario-e",
        "name": "Scenario E: Approval Revalidation",
        "description": "Shows that modifying action params after approval triggers auto-rejection.",
        "expected_decision": "REVIEW",
        "request": {
            "agent_id": "agent-delta",
            "action_type": "sensitive_operation",
            "target_resource": "ops/data-export",
            "operation": "export",
            "sensitivity": "sensitive",
            "context": "Data export scenario",
            "justification": "Scheduled export.",
        },
    },
    {
        "id": "scenario-f",
        "name": "Scenario F: Policy Bypass Attempt",
        "description": "An agent tries to execute a destructive operation. Expected: BLOCK (explicit policy).",
        "expected_decision": "BLOCK",
        "request": {
            "agent_id": "agent-beta",
            "action_type": "delete",
            "target_resource": "database/customer-records",
            "operation": "delete",
            "sensitivity": "confidential",
            "context": "Attempting policy bypass",
            "justification": "Cleanup task.",
        },
    },
]


@router.get("/demo/scenarios")
async def list_scenarios():
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "description": s["description"],
            "expected_decision": s["expected_decision"],
        }
        for s in DEMO_SCENARIOS
    ]


@router.post("/demo/run/{scenario_id}")
async def run_scenario(scenario_id: str, db: AsyncSession = Depends(get_db)):
    """Run a specific demo scenario and return results."""
    scenario = next((s for s in DEMO_SCENARIOS if s["id"] == scenario_id), None)
    if scenario is None:
        return {"error": f"Scenario '{scenario_id}' not found."}

    results = []

    if scenario.get("multi_request"):
        for req_data in scenario["requests"]:
            request = ActionRequest(**req_data)
            action = await evaluate_action(request, db)
            results.append({
                "action_id": action.id,
                "decision": action.decision,
                "risk_score": action.risk_score,
                "explanation": action.explanation,
                "anomaly_detected": action.anomaly_detected,
                "anomaly_reason": action.anomaly_reason,
            })
    else:
        request = ActionRequest(**scenario["request"])
        action = await evaluate_action(request, db)
        result = {
            "action_id": action.id,
            "decision": action.decision,
            "risk_score": action.risk_score,
            "risk_level": action.risk_level,
            "policy_rule": action.policy_rule,
            "explanation": action.explanation,
            "execution_status": action.execution_status,
            "anomaly_detected": action.anomaly_detected,
        }

        # For ALLOW decisions, execute immediately as part of the demo
        if action.decision == "ALLOW":
            exec_result = await execute_action(action.id, db)
            result["execution_result"] = exec_result

        results.append(result)

    return {
        "scenario_id": scenario_id,
        "scenario_name": scenario["name"],
        "expected_decision": scenario["expected_decision"],
        "results": results,
    }


@router.post("/demo/reset")
async def reset_demo(db: AsyncSession = Depends(get_db)):
    """
    Reset demo state: clear all actions, approvals, audit logs, alerts.
    Agents are preserved. Restores a clean known state.
    """
    await db.execute(delete(AuditLogModel))
    await db.execute(delete(AlertModel))
    await db.execute(delete(ApprovalModel))
    await db.execute(delete(ActionModel))

    # Reset agent counters
    result = await db.execute(
        __import__('sqlalchemy', fromlist=['select']).select(AgentModel)
    )
    from sqlalchemy import select as sa_select
    agents_result = await db.execute(sa_select(AgentModel))
    for agent in agents_result.scalars().all():
        agent.action_count = 0
        agent.block_count = 0

    await db.commit()

    # Reset in-memory state
    behavior_tracker.reset()
    reset_tokens()

    return {"success": True, "message": "Demo state reset to clean baseline."}
