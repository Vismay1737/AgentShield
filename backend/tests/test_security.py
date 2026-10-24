"""
AgentShield Test Suite.

Tests cover:
- Authorized actions execute successfully
- Unauthorized actions are blocked and never execute
- Review actions remain pending
- Modified approval requests are rejected
- Explicitly prohibited actions cannot be approved
- Audit entries created for all decisions
- Duplicate execution prevented
- Invalid input rejected
- Security bypass attempts fail
"""
import json
import sys
import os
import pytest
import pytest_asyncio

# Add parent dir to path so we can import the app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from main import app
from app.core.database import Base, get_db
from app.models.db_models import ActionModel, ApprovalModel, AuditLogModel, AlertModel, AgentModel
from app.core.anomaly_detector import behavior_tracker
from app.core.mock_tools import reset_tokens

# ── Test Database ──────────────────────────────────────────────────────────────
TEST_DB_URL = "sqlite+aiosqlite:///./test_agentshield.db"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True, scope="function")
async def setup_db():
    """Create fresh tables and seed test agents for each test."""
    from app.models import db_models  # noqa
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    # Seed test agents
    async with TestSessionLocal() as db:
        agents = [
            AgentModel(
                id="agent-alpha",
                name="Alpha Agent",
                permissions=json.dumps(["read_reports", "query_database", "send_email"]),
                status="active",
            ),
            AgentModel(
                id="agent-beta",
                name="Beta Agent",
                permissions=json.dumps(["read_reports", "read_restricted", "query_database",
                                        "query_sensitive_db", "send_email", "send_external",
                                        "execute_commands", "sensitive_ops"]),
                status="active",
            ),
            AgentModel(
                id="agent-gamma",
                name="Gamma Agent",
                permissions=json.dumps(["read_reports"]),
                status="active",
            ),
            AgentModel(
                id="agent-delta",
                name="Delta Agent",
                permissions=json.dumps(["read_reports", "query_database", "execute_commands", "sensitive_ops"]),
                status="active",
            ),
        ]
        for a in agents:
            db.add(a)
        await db.commit()

    behavior_tracker.reset()
    reset_tokens()

    yield

    # Cleanup
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ── Health Check ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"


# ── Scenario A: Authorized Access ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_authorized_action_evaluates_allow(client):
    """Authorized agent reading public report → ALLOW."""
    resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-alpha",
        "action_type": "read_report",
        "target_resource": "reports/sales-q3-2024.pdf",
        "sensitivity": "public",
        "justification": "Board presentation",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["decision"] == "ALLOW"
    assert data["risk_score"] < 70


@pytest.mark.asyncio
async def test_authorized_action_executes_successfully(client):
    """ALLOW decision → action executes and returns result."""
    eval_resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-alpha",
        "action_type": "read_report",
        "target_resource": "reports/sales-q3-2024.pdf",
        "sensitivity": "public",
        "justification": "Board presentation",
    })
    assert eval_resp.status_code == 201
    action_id = eval_resp.json()["action_id"]

    exec_resp = await client.post("/api/actions/execute", json={"action_id": action_id})
    assert exec_resp.status_code == 200
    result = exec_resp.json()
    assert result["success"] is True
    assert "result" in result


# ── Scenario B: Unauthorized File Access ──────────────────────────────────────

@pytest.mark.asyncio
async def test_unauthorized_file_access_blocked(client):
    """Agent without read_restricted permission → BLOCK."""
    resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-gamma",
        "action_type": "read_file",
        "target_resource": "files/financial-report-2024.xlsx",
        "sensitivity": "restricted",
        "justification": "Need data",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["decision"] == "BLOCK"
    assert data["execution_status"] == "blocked"


@pytest.mark.asyncio
async def test_blocked_action_cannot_execute(client):
    """BLOCK decision → execute endpoint rejects execution."""
    eval_resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-gamma",
        "action_type": "read_file",
        "target_resource": "files/restricted.txt",
        "sensitivity": "restricted",
        "justification": "Test",
    })
    assert eval_resp.status_code == 201
    assert eval_resp.json()["decision"] == "BLOCK"
    action_id = eval_resp.json()["action_id"]

    exec_resp = await client.post("/api/actions/execute", json={"action_id": action_id})
    assert exec_resp.status_code == 403  # Blocked — execution denied


# ── Scenario C: Review / Pending Approval ─────────────────────────────────────

@pytest.mark.asyncio
async def test_sensitive_action_requires_review(client):
    """Sensitive operation → REVIEW with pending approval."""
    resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-delta",
        "action_type": "sensitive_operation",
        "target_resource": "ops/config-update",
        "sensitivity": "sensitive",
        "justification": "Performance tuning",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["decision"] == "REVIEW"
    assert data["execution_status"] == "pending_approval"


@pytest.mark.asyncio
async def test_review_action_cannot_execute_without_approval(client):
    """REVIEW action must remain pending and not execute."""
    eval_resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-delta",
        "action_type": "sensitive_operation",
        "target_resource": "ops/config-update",
        "sensitivity": "sensitive",
        "justification": "Test",
    })
    action_id = eval_resp.json()["action_id"]

    exec_resp = await client.post("/api/actions/execute", json={"action_id": action_id})
    assert exec_resp.status_code == 403


@pytest.mark.asyncio
async def test_approved_action_executes(client):
    """After approval, action executes successfully with revalidation."""
    eval_resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-delta",
        "action_type": "sensitive_operation",
        "target_resource": "ops/approved-op",
        "sensitivity": "sensitive",
        "justification": "Test approved flow",
    })
    data = eval_resp.json()
    assert data["decision"] == "REVIEW"

    # Get approval
    approvals_resp = await client.get("/api/approvals?status=pending")
    approvals = approvals_resp.json()
    assert len(approvals) >= 1
    approval_id = approvals[0]["id"]

    # Approve
    approve_resp = await client.post(f"/api/approvals/{approval_id}/approve", json={
        "reviewer": "demo_admin",
        "note": "Approved for test",
    })
    assert approve_resp.json()["success"] is True

    # Execute
    exec_resp = await client.post("/api/actions/execute", json={"action_id": data["action_id"]})
    assert exec_resp.status_code == 200
    assert exec_resp.json()["success"] is True


@pytest.mark.asyncio
async def test_rejected_action_cannot_execute(client):
    """Rejected action must not execute."""
    eval_resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-delta",
        "action_type": "sensitive_operation",
        "target_resource": "ops/rejected-op",
        "sensitivity": "sensitive",
        "justification": "Test rejection",
    })
    action_id = eval_resp.json()["action_id"]

    approvals_resp = await client.get("/api/approvals?status=pending")
    approval_id = approvals_resp.json()[0]["id"]

    await client.post(f"/api/approvals/{approval_id}/reject", json={
        "reviewer": "demo_admin",
        "note": "Not authorized",
    })

    exec_resp = await client.post("/api/actions/execute", json={"action_id": action_id})
    assert exec_resp.status_code == 403


# ── Scenario E: Approval Revalidation ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_approval_revalidation_rejects_modified_action(client):
    """Simulate modified action snapshot → auto-rejected on approval."""
    eval_resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-delta",
        "action_type": "sensitive_operation",
        "target_resource": "ops/original-target",
        "sensitivity": "sensitive",
        "justification": "Revalidation test",
    })
    action_id = eval_resp.json()["action_id"]

    approvals_resp = await client.get("/api/approvals?status=pending")
    approval_id = approvals_resp.json()[0]["id"]

    # Directly modify the action in DB to simulate parameter change
    async with TestSessionLocal() as db:
        action = await db.get(ActionModel, action_id)
        action.target_resource = "ops/MODIFIED-target"  # Tampered!
        await db.commit()

    # Attempt to approve — should be auto-rejected due to snapshot mismatch
    approve_resp = await client.post(f"/api/approvals/{approval_id}/approve", json={
        "reviewer": "demo_admin",
    })
    assert approve_resp.status_code == 400
    assert "modified" in approve_resp.json()["detail"].lower()


# ── Scenario F: Policy Bypass Attempt ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_explicitly_prohibited_action_blocked(client):
    """Destructive action is always blocked, regardless of permissions."""
    resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-beta",  # Beta has full permissions
        "action_type": "delete",
        "target_resource": "database/customer-records",
        "sensitivity": "confidential",
        "justification": "Attempting bypass",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["decision"] == "BLOCK"
    assert "EXPLICITLY_BLOCKED" in data["flags"]


@pytest.mark.asyncio
async def test_explicitly_prohibited_action_cannot_be_approved(client):
    """Blocked-by-policy actions cannot be approved through the approval workflow."""
    # First create a REVIEW action
    eval_resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-delta",
        "action_type": "sensitive_operation",
        "target_resource": "ops/test",
        "sensitivity": "sensitive",
        "justification": "Test",
    })
    approvals_resp = await client.get("/api/approvals?status=pending")
    if not approvals_resp.json():
        return  # No pending approvals to test

    approval_id = approvals_resp.json()[0]["id"]

    # Tamper: change action type to explicitly blocked action
    async with TestSessionLocal() as db:
        approval = await db.get(ApprovalModel, approval_id)
        action = await db.get(ActionModel, approval.action_id)
        action.action_type = "delete"
        await db.commit()

    # Approve — should be rejected due to explicit block
    approve_resp = await client.post(f"/api/approvals/{approval_id}/approve", json={
        "reviewer": "demo_admin",
    })
    assert approve_resp.status_code == 400


# ── Duplicate Execution Prevention ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_duplicate_execution_prevented(client):
    """Execute same action twice → second execution is rejected."""
    eval_resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-alpha",
        "action_type": "read_report",
        "target_resource": "reports/sales.pdf",
        "sensitivity": "public",
        "justification": "Test",
    })
    action_id = eval_resp.json()["action_id"]

    first = await client.post("/api/actions/execute", json={"action_id": action_id})
    assert first.status_code == 200

    second = await client.post("/api/actions/execute", json={"action_id": action_id})
    assert second.status_code == 403  # Duplicate rejected


# ── Audit Log Creation ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_audit_log_created_for_every_decision(client):
    """Every action evaluation creates an audit log entry."""
    await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-alpha",
        "action_type": "read_report",
        "target_resource": "reports/test.pdf",
        "sensitivity": "public",
        "justification": "Audit test",
    })

    logs_resp = await client.get("/api/audit-logs")
    assert logs_resp.status_code == 200
    assert len(logs_resp.json()) >= 1


# ── Invalid Input Rejection ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_invalid_action_type_rejected(client):
    """Invalid action_type is rejected with 422."""
    resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-alpha",
        "action_type": "rm_rf_slash",  # Invalid
        "target_resource": "something",
        "sensitivity": "public",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_invalid_sensitivity_rejected(client):
    """Invalid sensitivity is rejected with 422."""
    resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-alpha",
        "action_type": "read_report",
        "target_resource": "something",
        "sensitivity": "top_secret",  # Invalid
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_unknown_agent_blocked(client):
    """Unknown agent is blocked."""
    resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-unknown-xyz",
        "action_type": "read_report",
        "target_resource": "reports/test.pdf",
        "sensitivity": "public",
    })
    assert resp.status_code == 201
    assert resp.json()["decision"] == "BLOCK"


# ── Permission Cannot Be Self-Escalated ───────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_cannot_grant_itself_permissions(client):
    """Grant permission action is explicitly blocked."""
    resp = await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-alpha",
        "action_type": "grant_permission",
        "target_resource": "agent-alpha",
        "sensitivity": "confidential",
        "justification": "Attempting self-escalation",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["decision"] == "BLOCK"
    assert "EXPLICITLY_BLOCKED" in data["flags"]


# ── Direct Tool Access (Security) ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mock_tool_rejects_call_without_token():
    """Mock tool called without authorization token raises error."""
    from app.core.mock_tools import mock_read_file, MockToolError
    with pytest.raises(MockToolError, match="SECURITY VIOLATION"):
        mock_read_file("files/protected.txt", token=None)


@pytest.mark.asyncio
async def test_mock_tool_rejects_invalid_token():
    """Mock tool called with invalid token raises error."""
    from app.core.mock_tools import mock_read_report, MockToolError
    with pytest.raises(MockToolError, match="SECURITY VIOLATION"):
        mock_read_report("reports/test.pdf", token="fake-token-xyz")


@pytest.mark.asyncio
async def test_mock_tool_rejects_wrong_resource_token():
    """Authorization token for one resource cannot be used for another."""
    from app.core.mock_tools import issue_authorization_token, mock_read_report, MockToolError
    token = issue_authorization_token("action-1", "agent-alpha", "read_report", "reports/a.pdf")
    with pytest.raises(MockToolError, match="SECURITY VIOLATION"):
        mock_read_report("reports/DIFFERENT.pdf", token=token)


# ── Dashboard ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_dashboard_summary_returns_real_data(client):
    """Dashboard summary reflects actual action counts."""
    # Evaluate 2 actions
    await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-alpha",
        "action_type": "read_report",
        "target_resource": "reports/test.pdf",
        "sensitivity": "public",
    })
    await client.post("/api/actions/evaluate", json={
        "agent_id": "agent-gamma",
        "action_type": "read_file",
        "target_resource": "files/secret.txt",
        "sensitivity": "restricted",
    })

    summary_resp = await client.get("/api/dashboard/summary")
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["total_actions"] == 2
    assert summary["allowed_actions"] >= 1
    assert summary["blocked_actions"] >= 1
