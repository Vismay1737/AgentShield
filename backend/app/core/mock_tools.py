"""
Mock Tool Environment.

Simulates protected tools that agents can request to execute.
NO real system operations are performed. All tools are sandboxed mocks.

CRITICAL: Tools check authorization token before executing.
Any call without a valid gateway authorization token is rejected.
"""
import uuid
from datetime import datetime
from typing import Optional

# Authorization token issued by the security gateway per approved action
_authorized_tokens: dict[str, dict] = {}


def issue_authorization_token(action_id: str, agent_id: str, action_type: str, target_resource: str) -> str:
    """Issue a one-time authorization token for an approved action."""
    token = f"agsh-{uuid.uuid4().hex}"
    _authorized_tokens[token] = {
        "action_id": action_id,
        "agent_id": agent_id,
        "action_type": action_type,
        "target_resource": target_resource,
        "used": False,
        "issued_at": datetime.utcnow(),
    }
    return token


def consume_authorization_token(token: str, action_type: str, target_resource: str) -> tuple[bool, str]:
    """
    Validate and consume a one-time authorization token.
    Returns (valid: bool, reason: str)
    """
    if token not in _authorized_tokens:
        return False, "Invalid or expired authorization token."

    record = _authorized_tokens[token]
    if record["used"]:
        return False, "Authorization token already used (duplicate execution prevented)."
    if record["action_type"] != action_type:
        return False, f"Token action mismatch: expected '{record['action_type']}', got '{action_type}'."
    if record["target_resource"] != target_resource:
        return False, f"Token resource mismatch: expected '{record['target_resource']}', got '{target_resource}'."

    # Mark as used (prevent replay)
    _authorized_tokens[token]["used"] = True
    return True, "Authorization valid."


def revoke_token(token: str):
    """Revoke an unused token (e.g., on rejection)."""
    if token in _authorized_tokens:
        del _authorized_tokens[token]


def reset_tokens():
    """Reset all tokens (for demo reset)."""
    _authorized_tokens.clear()


# ─── Mock Tools ────────────────────────────────────────────────────────────────

class MockToolError(Exception):
    pass


def _require_auth(token: Optional[str], action_type: str, target_resource: str):
    """Verify authorization before any tool executes."""
    if not token:
        raise MockToolError("SECURITY VIOLATION: No authorization token provided. Action blocked.")
    valid, reason = consume_authorization_token(token, action_type, target_resource)
    if not valid:
        raise MockToolError(f"SECURITY VIOLATION: {reason}")


def mock_read_report(target_resource: str, token: Optional[str] = None) -> dict:
    """Simulate reading a public/internal report."""
    _require_auth(token, "read_report", target_resource)
    return {
        "tool": "mock_read_report",
        "resource": target_resource,
        "content": f"[MOCK] Report content for '{target_resource}': Sales Q3 2024 summary. Revenue: $4.2M. Growth: 12%.",
        "timestamp": datetime.utcnow().isoformat(),
        "status": "success",
    }


def mock_read_file(target_resource: str, token: Optional[str] = None) -> dict:
    """Simulate reading a file (restricted files require authorization)."""
    _require_auth(token, "read_file", target_resource)
    return {
        "tool": "mock_read_file",
        "resource": target_resource,
        "content": f"[MOCK] File content for '{target_resource}': This is simulated file content.",
        "timestamp": datetime.utcnow().isoformat(),
        "status": "success",
    }


def mock_query_database(target_resource: str, token: Optional[str] = None) -> dict:
    """Simulate querying a database."""
    _require_auth(token, "query_database", target_resource)
    return {
        "tool": "mock_query_database",
        "resource": target_resource,
        "rows": [{"id": 1, "value": "mock_row_1"}, {"id": 2, "value": "mock_row_2"}],
        "row_count": 2,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "success",
    }


def mock_send_email(target_resource: str, destination: Optional[str], token: Optional[str] = None) -> dict:
    """Simulate sending an email (no real email is sent)."""
    _require_auth(token, "send_email", target_resource)
    return {
        "tool": "mock_send_email",
        "resource": target_resource,
        "destination": destination,
        "message": f"[MOCK] Simulated email to '{destination}' with content from '{target_resource}'. NOT SENT.",
        "timestamp": datetime.utcnow().isoformat(),
        "status": "success",
    }


def mock_execute_command(target_resource: str, token: Optional[str] = None) -> dict:
    """Simulate executing a harmless command. No real shell execution."""
    _require_auth(token, "execute_command", target_resource)
    return {
        "tool": "mock_execute_command",
        "resource": target_resource,
        "output": f"[MOCK] Command '{target_resource}' executed in sandbox. Output: OK. (No real shell execution)",
        "timestamp": datetime.utcnow().isoformat(),
        "status": "success",
    }


def mock_sensitive_operation(target_resource: str, token: Optional[str] = None) -> dict:
    """Simulate a sensitive operation requiring prior human approval."""
    _require_auth(token, "sensitive_operation", target_resource)
    return {
        "tool": "mock_sensitive_operation",
        "resource": target_resource,
        "result": f"[MOCK] Sensitive operation on '{target_resource}' completed after human approval.",
        "timestamp": datetime.utcnow().isoformat(),
        "status": "success",
    }


# Tool registry
TOOL_REGISTRY = {
    "read_report": mock_read_report,
    "read_file": mock_read_file,
    "query_database": mock_query_database,
    "send_email": mock_send_email,
    "execute_command": mock_execute_command,
    "sensitive_operation": mock_sensitive_operation,
}


def execute_tool(action_type: str, target_resource: str, destination: Optional[str] = None, token: Optional[str] = None) -> dict:
    """Central tool dispatcher. Requires valid authorization token."""
    if action_type not in TOOL_REGISTRY:
        raise MockToolError(f"Unknown tool type: '{action_type}'")

    tool_fn = TOOL_REGISTRY[action_type]

    if action_type == "send_email":
        return tool_fn(target_resource, destination, token)
    return tool_fn(target_resource, token)
