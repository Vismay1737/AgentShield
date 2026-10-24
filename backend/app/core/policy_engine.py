"""
AgentShield Policy Engine.

Defines all security policies and evaluates actions against them.
Policies are evaluated in priority order. The first matching policy
determines the base decision, but risk scores inform the final outcome.
"""
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class Decision(str, Enum):
    ALLOW = "ALLOW"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


@dataclass
class PolicyResult:
    decision: Decision
    risk_score: int
    risk_level: RiskLevel
    policy_rule: str
    explanation: str
    flags: list[str] = field(default_factory=list)

    def to_dict(self):
        return {
            "decision": self.decision.value,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level.value,
            "policy_rule": self.policy_rule,
            "explanation": self.explanation,
            "flags": self.flags,
        }


# ─── Static Policy Definitions ────────────────────────────────────────────────

POLICIES = [
    {
        "id": "POL-001",
        "name": "Public Report Access",
        "description": "Authorized agents may read public reports.",
        "condition": "action_type == 'read_report' and sensitivity in ('public', 'internal')",
        "required_permission": "read_reports",
        "decision": "ALLOW",
        "risk_base": 10,
        "enabled": True,
    },
    {
        "id": "POL-002",
        "name": "Restricted File Access",
        "description": "Restricted files require explicit 'read_restricted' permission.",
        "condition": "action_type == 'read_file' and sensitivity in ('restricted', 'confidential')",
        "required_permission": "read_restricted",
        "decision": "BLOCK",
        "risk_base": 85,
        "enabled": True,
    },
    {
        "id": "POL-003",
        "name": "Sensitive Database Query",
        "description": "Sensitive DB queries require human approval.",
        "condition": "action_type == 'query_database' and sensitivity in ('sensitive', 'confidential')",
        "required_permission": "query_sensitive_db",
        "decision": "REVIEW",
        "risk_base": 65,
        "enabled": True,
    },
    {
        "id": "POL-004",
        "name": "External Data Transfer",
        "description": "External transfers require trusted destination and approval.",
        "condition": "action_type == 'send_email' and sensitivity in ('sensitive', 'confidential', 'restricted')",
        "required_permission": "send_external",
        "decision": "REVIEW",
        "risk_base": 70,
        "enabled": True,
    },
    {
        "id": "POL-005",
        "name": "Destructive Operations Denied",
        "description": "Destructive operations are always denied.",
        "condition": "action_type in ('delete', 'drop_database', 'format', 'overwrite')",
        "required_permission": None,
        "decision": "BLOCK",
        "risk_base": 100,
        "enabled": True,
        "explicit_block": True,
    },
    {
        "id": "POL-006",
        "name": "Self-Permission Escalation",
        "description": "An agent cannot grant itself additional permissions.",
        "condition": "action_type == 'grant_permission' and target_resource contains agent_id",
        "required_permission": None,
        "decision": "BLOCK",
        "risk_base": 100,
        "enabled": True,
        "explicit_block": True,
    },
    {
        "id": "POL-007",
        "name": "Sensitive Operation Review",
        "description": "Operations on sensitive resources require human review.",
        "condition": "action_type == 'sensitive_operation'",
        "required_permission": "sensitive_ops",
        "decision": "REVIEW",
        "risk_base": 75,
        "enabled": True,
    },
    {
        "id": "POL-008",
        "name": "Standard Command Execution",
        "description": "Harmless shell-safe commands allowed for authorized agents.",
        "condition": "action_type == 'execute_command' and sensitivity == 'public'",
        "required_permission": "execute_commands",
        "decision": "ALLOW",
        "risk_base": 25,
        "enabled": True,
    },
    {
        "id": "POL-009",
        "name": "Standard Database Query",
        "description": "Standard DB queries allowed for authorized agents.",
        "condition": "action_type == 'query_database' and sensitivity in ('public', 'internal')",
        "required_permission": "query_database",
        "decision": "ALLOW",
        "risk_base": 20,
        "enabled": True,
    },
    {
        "id": "POL-010",
        "name": "Standard Email Transfer",
        "description": "Emails to trusted destinations with non-sensitive data are allowed.",
        "condition": "action_type == 'send_email' and sensitivity in ('public', 'internal')",
        "required_permission": "send_email",
        "decision": "ALLOW",
        "risk_base": 15,
        "enabled": True,
    },
]

# Risk score bands (configurable)
RISK_BANDS = {
    "LOW": (0, 29),
    "MEDIUM": (30, 69),
    "HIGH": (70, 100),
}

# Sensitivity weights
SENSITIVITY_WEIGHTS = {
    "public": 0,
    "internal": 10,
    "sensitive": 30,
    "restricted": 50,
    "confidential": 70,
}

# Action type base risk
ACTION_BASE_RISK = {
    "read_report": 5,
    "read_file": 20,
    "query_database": 15,
    "send_email": 25,
    "execute_command": 30,
    "sensitive_operation": 60,
    "grant_permission": 90,
    "delete": 100,
    "drop_database": 100,
}


def get_risk_level(score: int) -> RiskLevel:
    if score <= RISK_BANDS["LOW"][1]:
        return RiskLevel.LOW
    elif score <= RISK_BANDS["MEDIUM"][1]:
        return RiskLevel.MEDIUM
    return RiskLevel.HIGH


def compute_risk_score(
    action_type: str,
    sensitivity: str,
    agent_permissions: list[str],
    required_permission: Optional[str],
    destination_trusted: bool = True,
    anomaly_penalty: int = 0,
    policy_base: int = 0,
) -> int:
    """
    Compute a deterministic risk score based on action characteristics.
    Score range: 0–100. Higher means more risky.
    """
    action_risk = ACTION_BASE_RISK.get(action_type, 40)
    sensitivity_risk = SENSITIVITY_WEIGHTS.get(sensitivity, 20)

    # Permission gap
    permission_penalty = 0
    if required_permission and required_permission not in agent_permissions:
        permission_penalty = 40

    # Destination untrusted
    destination_penalty = 20 if not destination_trusted else 0

    # Use the higher of computed or policy base
    base = max(policy_base, action_risk)
    score = base + sensitivity_risk + permission_penalty + destination_penalty + anomaly_penalty

    return min(100, score)


def evaluate_policy(
    action_type: str,
    sensitivity: str,
    agent_permissions: list[str],
    target_resource: str,
    agent_id: str,
    destination: Optional[str] = None,
    anomaly_penalty: int = 0,
) -> PolicyResult:
    """
    Central policy evaluation. Returns a PolicyResult with full explanation.
    This is the ONLY entry point for security decisions.
    """
    flags = []

    # ── Explicit block policies (cannot be overridden by approval) ──
    EXPLICITLY_BLOCKED_ACTIONS = {"delete", "drop_database", "format", "overwrite", "grant_permission"}
    if action_type in EXPLICITLY_BLOCKED_ACTIONS:
        return PolicyResult(
            decision=Decision.BLOCK,
            risk_score=100,
            risk_level=RiskLevel.HIGH,
            policy_rule="POL-005/POL-006",
            explanation=f"Action '{action_type}' is explicitly prohibited and cannot be approved.",
            flags=["EXPLICITLY_BLOCKED"],
        )

    # ── Match action to policies ──
    matched_policy = None
    for pol in POLICIES:
        if not pol["enabled"]:
            continue
        if _matches_policy(pol, action_type, sensitivity, target_resource, agent_id):
            matched_policy = pol
            break

    if matched_policy is None:
        # Default: REVIEW unknown actions
        risk_score = compute_risk_score(
            action_type, sensitivity, agent_permissions, None, True, anomaly_penalty, 50
        )
        return PolicyResult(
            decision=Decision.REVIEW,
            risk_score=risk_score,
            risk_level=get_risk_level(risk_score),
            policy_rule="POL-DEFAULT",
            explanation=f"Action type '{action_type}' is not covered by explicit policy. Requires human review.",
            flags=flags,
        )

    required_perm = matched_policy.get("required_permission")
    has_permission = (required_perm is None) or (required_perm in agent_permissions)

    destination_trusted = True
    if action_type in ("send_email",) and destination:
        # Trusted domains (configurable)
        trusted_domains = ["@company.com", "@internal.org"]
        destination_trusted = any(domain in destination for domain in trusted_domains)
        if not destination_trusted:
            flags.append("UNTRUSTED_DESTINATION")

    risk_score = compute_risk_score(
        action_type,
        sensitivity,
        agent_permissions,
        required_perm,
        destination_trusted,
        anomaly_penalty,
        matched_policy["risk_base"],
    )
    risk_level = get_risk_level(risk_score)

    # If agent lacks required permission → always BLOCK (risk bands don't override)
    if not has_permission:
        flags.append("PERMISSION_DENIED")
        return PolicyResult(
            decision=Decision.BLOCK,
            risk_score=min(100, risk_score),
            risk_level=get_risk_level(min(100, risk_score)),
            policy_rule=matched_policy["id"],
            explanation=(
                f"Agent '{agent_id}' lacks required permission '{required_perm}' "
                f"to perform '{action_type}' on '{target_resource}'. "
                f"Policy: {matched_policy['name']}."
            ),
            flags=flags,
        )

    # Apply policy decision (permission satisfied)
    base_decision = Decision(matched_policy["decision"])

    # High-risk scores escalate ALLOW → REVIEW
    if base_decision == Decision.ALLOW and risk_level == RiskLevel.HIGH:
        base_decision = Decision.REVIEW
        flags.append("RISK_ESCALATION")

    return PolicyResult(
        decision=base_decision,
        risk_score=risk_score,
        risk_level=risk_level,
        policy_rule=matched_policy["id"],
        explanation=_build_explanation(matched_policy, action_type, target_resource, agent_id, flags),
        flags=flags,
    )


def _matches_policy(pol: dict, action_type: str, sensitivity: str, target_resource: str, agent_id: str) -> bool:
    """Simple policy matcher based on action_type and sensitivity."""
    cond = pol["condition"]

    # Parse action_type match
    if f"action_type == '{action_type}'" in cond:
        # Check sensitivity if present
        if "sensitivity in" in cond:
            # Extract sensitivity list from condition string
            start = cond.index("sensitivity in (") + len("sensitivity in (")
            end = cond.index(")", start)
            allowed = [s.strip().strip("'") for s in cond[start:end].split(",")]
            return sensitivity in allowed
        return True
    elif f"action_type in (" in cond:
        start = cond.index("action_type in (") + len("action_type in (")
        end = cond.index(")", start)
        allowed = [s.strip().strip("'") for s in cond[start:end].split(",")]
        return action_type in allowed

    return False


def _build_explanation(pol: dict, action_type: str, target_resource: str, agent_id: str, flags: list) -> str:
    base = f"Policy '{pol['name']}' ({pol['id']}): {pol['description']}"
    if flags:
        base += f" Flags: {', '.join(flags)}."
    return base
