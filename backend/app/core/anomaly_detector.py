"""
Behavioral Anomaly Detection Engine.

Uses configurable rule-based detection to identify suspicious agent behavior.
Does NOT use a trained ML model — uses explicit rules and baselines.
"""
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class AnomalyResult:
    detected: bool
    reason: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    recommended_response: str
    anomaly_penalty: int  # Added to risk score
    related_action_ids: list[str] = field(default_factory=list)


# In-memory behavior tracker (resets on server restart; DB records persist)
class BehaviorTracker:
    def __init__(self):
        # agent_id -> list of recent action records
        self._history: dict[str, list[dict]] = defaultdict(list)
        # Max history window
        self._window_minutes = 60

    def record_action(self, agent_id: str, action_type: str, target_resource: str,
                      decision: str, action_id: str, timestamp: Optional[datetime] = None):
        if timestamp is None:
            timestamp = datetime.utcnow()
        self._history[agent_id].append({
            "action_type": action_type,
            "target_resource": target_resource,
            "decision": decision,
            "action_id": action_id,
            "timestamp": timestamp,
        })
        # Prune old records
        cutoff = datetime.utcnow() - timedelta(minutes=self._window_minutes)
        self._history[agent_id] = [
            r for r in self._history[agent_id] if r["timestamp"] > cutoff
        ]

    def get_recent(self, agent_id: str, minutes: int = 60) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        return [r for r in self._history[agent_id] if r["timestamp"] > cutoff]

    def count_blocked(self, agent_id: str, minutes: int = 15) -> tuple[int, list[str]]:
        recent = self.get_recent(agent_id, minutes)
        blocked = [r for r in recent if r["decision"] == "BLOCK"]
        return len(blocked), [r["action_id"] for r in blocked]

    def count_action_type(self, agent_id: str, action_type: str, minutes: int = 30) -> int:
        recent = self.get_recent(agent_id, minutes)
        return sum(1 for r in recent if r["action_type"] == action_type)

    def get_unique_resource_categories(self, agent_id: str, minutes: int = 30) -> set[str]:
        recent = self.get_recent(agent_id, minutes)
        return {r["target_resource"].split("/")[0] for r in recent}

    def reset(self):
        self._history.clear()


# Singleton tracker
behavior_tracker = BehaviorTracker()


# Anomaly rules (configurable thresholds)
ANOMALY_RULES = {
    "repeated_blocks": {
        "threshold": 3,
        "window_minutes": 15,
        "severity": "HIGH",
        "penalty": 25,
        "response": "Temporarily restrict agent and require human review for all actions.",
    },
    "high_frequency": {
        "threshold": 10,
        "window_minutes": 5,
        "severity": "MEDIUM",
        "penalty": 15,
        "response": "Rate-limit agent requests and flag for monitoring.",
    },
    "resource_category_explosion": {
        "threshold": 5,
        "window_minutes": 30,
        "severity": "MEDIUM",
        "penalty": 10,
        "response": "Review agent scope and restrict to expected resource categories.",
    },
    "repeated_restricted_access": {
        "threshold": 2,
        "window_minutes": 10,
        "severity": "HIGH",
        "penalty": 30,
        "response": "Block agent until human review. Possible data exfiltration attempt.",
    },
}


def detect_anomalies(
    agent_id: str,
    action_type: str,
    target_resource: str,
    current_decision: str,
) -> AnomalyResult:
    """
    Check current action context for behavioral anomalies.
    Returns AnomalyResult with explanation and risk penalty.
    """
    reasons = []
    max_severity = "NONE"
    total_penalty = 0
    related_ids = []

    severity_order = ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]

    def update_severity(s: str):
        nonlocal max_severity
        if severity_order.index(s) > severity_order.index(max_severity):
            max_severity = s

    # Rule 1: Repeated BLOCK decisions
    rule = ANOMALY_RULES["repeated_blocks"]
    block_count, block_ids = behavior_tracker.count_blocked(agent_id, rule["window_minutes"])
    if block_count >= rule["threshold"]:
        reasons.append(
            f"Agent has been blocked {block_count} times in the last {rule['window_minutes']} minutes."
        )
        update_severity(rule["severity"])
        total_penalty += rule["penalty"]
        related_ids.extend(block_ids)

    # Rule 2: High-frequency requests
    rule2 = ANOMALY_RULES["high_frequency"]
    recent_count = len(behavior_tracker.get_recent(agent_id, rule2["window_minutes"]))
    if recent_count >= rule2["threshold"]:
        reasons.append(
            f"Agent submitted {recent_count} requests in {rule2['window_minutes']} minutes (threshold: {rule2['threshold']})."
        )
        update_severity(rule2["severity"])
        total_penalty += rule2["penalty"]

    # Rule 3: Resource category explosion (accessing many different resource types)
    rule3 = ANOMALY_RULES["resource_category_explosion"]
    cats = behavior_tracker.get_unique_resource_categories(agent_id, rule3["window_minutes"])
    if len(cats) >= rule3["threshold"]:
        reasons.append(
            f"Agent accessed {len(cats)} distinct resource categories in {rule3['window_minutes']} minutes."
        )
        update_severity(rule3["severity"])
        total_penalty += rule3["penalty"]

    # Rule 4: Repeated restricted file access attempts
    rule4 = ANOMALY_RULES["repeated_restricted_access"]
    restricted_count = behavior_tracker.count_action_type(agent_id, "read_file", rule4["window_minutes"])
    if restricted_count >= rule4["threshold"] and current_decision == "BLOCK":
        reasons.append(
            f"Agent attempted to access restricted files {restricted_count} times in {rule4['window_minutes']} minutes."
        )
        update_severity(rule4["severity"])
        total_penalty += rule4["penalty"]
        related_ids.extend(block_ids)

    if not reasons:
        return AnomalyResult(
            detected=False,
            reason="No anomalies detected.",
            severity="NONE",
            recommended_response="No action required.",
            anomaly_penalty=0,
        )

    # Combine recommendations
    all_responses = []
    if total_penalty >= 30:
        all_responses.append(ANOMALY_RULES["repeated_blocks"]["response"])
    if len(reasons) >= 2:
        all_responses.append("Escalate to security team for investigation.")

    return AnomalyResult(
        detected=True,
        reason=" | ".join(reasons),
        severity=max_severity,
        recommended_response=all_responses[0] if all_responses else "Monitor agent closely.",
        anomaly_penalty=min(50, total_penalty),
        related_action_ids=list(set(related_ids)),
    )
