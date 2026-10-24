// Embedded Security State Store for AgentShield Serverless Mode
export interface Agent {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  status: string;
  action_count: number;
  block_count: number;
  created_at: string;
  last_seen: string;
}

export interface Action {
  id: string;
  action_id: string;
  agent_id: string;
  action_type: string;
  target_resource: string;
  operation: string;
  sensitivity: string;
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  risk_score: number;
  risk_level: string;
  policy_rule: string;
  explanation: string;
  flags: string[];
  execution_status: string;
  anomaly_detected: boolean;
  anomaly_severity?: string;
  anomaly_reason?: string;
  execution_result?: unknown;
  created_at: string;
}

export interface Approval {
  id: string;
  action_id: string;
  agent_id: string;
  action_type: string;
  target_resource: string;
  risk_score: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  action_snapshot: string;
  created_at: string;
  expires_at: string | null;
}

export interface Alert {
  id: string;
  agent_id: string;
  action_id: string | null;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  recommended_response: string;
  related_action_ids: string[];
  status: 'open' | 'acknowledged';
  created_at: string;
}

export interface AuditLog {
  id: string;
  action_id: string;
  agent_id: string;
  action_type: string;
  target_resource: string;
  risk_score: number;
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  explanation: string;
  policy_rule: string;
  execution_status: string;
  approved_by: string | null;
  approved_at: string | null;
  anomaly_detected: boolean;
  timestamp: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  condition: string;
  required_permission: string | null;
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  risk_base: number;
  enabled: boolean;
  explicit_block: boolean;
}

function getInitialState() {
  const now = new Date();
  const subMinutes = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
  const subHours = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
  const addHours = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();

  const agents: Agent[] = [
    {
      id: "agent-alpha",
      name: "Alpha Agent (Analytics)",
      description: "General-purpose analytics agent with basic read permissions.",
      permissions: ["read_reports", "query_database", "send_email"],
      status: "active",
      action_count: 14,
      block_count: 1,
      created_at: subHours(168),
      last_seen: subMinutes(2),
    },
    {
      id: "agent-beta",
      name: "Beta Agent (DevOps / CI)",
      description: "Data pipeline and infrastructure agent with extended permissions including restricted reads.",
      permissions: ["read_reports", "read_restricted", "query_database", "query_sensitive_db", "send_email", "send_external", "execute_commands", "sensitive_ops"],
      status: "active",
      action_count: 28,
      block_count: 0,
      created_at: subHours(168),
      last_seen: subMinutes(1),
    },
    {
      id: "agent-gamma",
      name: "Gamma Agent (Untrusted Sandbox)",
      description: "Restricted sandbox agent with minimal permissions for untrusted external tasks.",
      permissions: ["read_reports"],
      status: "quarantined",
      action_count: 9,
      block_count: 6,
      created_at: subHours(168),
      last_seen: subMinutes(5),
    },
    {
      id: "agent-delta",
      name: "Delta Agent (Ops Worker)",
      description: "Operations agent with sensitive maintenance operation permissions.",
      permissions: ["read_reports", "query_database", "execute_commands", "sensitive_ops"],
      status: "active",
      action_count: 19,
      block_count: 2,
      created_at: subHours(168),
      last_seen: subMinutes(3),
    },
  ];

  const policies: Policy[] = [
    {
      id: "POL-001",
      name: "Public Report Access",
      description: "Authorized agents may read public reports.",
      condition: "action_type == 'read_report' and sensitivity in ('public', 'internal')",
      required_permission: "read_reports",
      decision: "ALLOW",
      risk_base: 10,
      enabled: true,
      explicit_block: false,
    },
    {
      id: "POL-002",
      name: "Restricted File Access",
      description: "Restricted files require explicit 'read_restricted' permission.",
      condition: "action_type == 'read_file' and sensitivity in ('restricted', 'confidential')",
      required_permission: "read_restricted",
      decision: "BLOCK",
      risk_base: 85,
      enabled: true,
      explicit_block: false,
    },
    {
      id: "POL-003",
      name: "Sensitive Database Query",
      description: "Sensitive DB queries require human approval.",
      condition: "action_type == 'query_database' and sensitivity in ('sensitive', 'confidential')",
      required_permission: "query_sensitive_db",
      decision: "REVIEW",
      risk_base: 65,
      enabled: true,
      explicit_block: false,
    },
    {
      id: "POL-004",
      name: "External Data Transfer",
      description: "External transfers require trusted destination and approval.",
      condition: "action_type == 'send_email' and sensitivity in ('sensitive', 'confidential', 'restricted')",
      required_permission: "send_external",
      decision: "REVIEW",
      risk_base: 70,
      enabled: true,
      explicit_block: false,
    },
    {
      id: "POL-005",
      name: "Destructive Operations Denied",
      description: "Destructive operations are always denied.",
      condition: "action_type in ('delete', 'drop_database', 'format', 'overwrite')",
      required_permission: null,
      decision: "BLOCK",
      risk_base: 100,
      enabled: true,
      explicit_block: true,
    },
    {
      id: "POL-006",
      name: "Infrastructure Deployment Escalation",
      description: "Production deployments require verified human review.",
      condition: "action_type in ('deploy_service', 'scale_cluster', 'update_config')",
      required_permission: "sensitive_ops",
      decision: "REVIEW",
      risk_base: 72,
      enabled: true,
      explicit_block: false,
    },
  ];

  const actions: Action[] = [
    {
      id: "act-seed-001",
      action_id: "act-seed-001",
      agent_id: "agent-alpha",
      action_type: "read_report",
      target_resource: "reports/q3_revenue_summary.pdf",
      operation: "read",
      sensitivity: "public",
      decision: "ALLOW",
      risk_score: 12,
      risk_level: "LOW",
      policy_rule: "POL-001",
      explanation: "Action meets all policy criteria for public report access.",
      flags: [],
      execution_status: "executed",
      execution_result: { status: "success", bytes_read: 482910, sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
      anomaly_detected: false,
      created_at: subHours(3),
    },
    {
      id: "act-seed-002",
      action_id: "act-seed-002",
      agent_id: "agent-gamma",
      action_type: "read_file",
      target_resource: "keys/production_vault_credentials.env",
      operation: "read",
      sensitivity: "restricted",
      decision: "BLOCK",
      risk_score: 96,
      risk_level: "HIGH",
      policy_rule: "POL-002",
      explanation: "Agent 'agent-gamma' lacks required permission 'read_restricted' for sensitivity 'restricted'. Potential credential leak prevented.",
      flags: ["missing_permission", "credential_target", "prompt_injection_pattern"],
      execution_status: "blocked",
      anomaly_detected: true,
      anomaly_severity: "CRITICAL",
      anomaly_reason: "High-risk restricted resource access attempted by low-privilege sandbox agent.",
      created_at: subHours(2),
    },
    {
      id: "act-seed-003",
      action_id: "act-seed-003",
      agent_id: "agent-delta",
      action_type: "drop_database",
      target_resource: "db/customer_primary_records",
      operation: "DROP TABLE",
      sensitivity: "restricted",
      decision: "BLOCK",
      risk_score: 100,
      risk_level: "HIGH",
      policy_rule: "POL-005",
      explanation: "Destructive operations are strictly prohibited by non-overridable policy POL-005.",
      flags: ["destructive_operation", "sql_injection_signature", "explicit_block"],
      execution_status: "blocked",
      anomaly_detected: true,
      anomaly_severity: "CRITICAL",
      anomaly_reason: "Destructive database purge query detected.",
      created_at: subHours(1),
    },
    {
      id: "act-seed-004",
      action_id: "act-seed-004",
      agent_id: "agent-beta",
      action_type: "deploy_service",
      target_resource: "k8s/cluster-us-east/payment-service:v2.4.1",
      operation: "rolling_upgrade",
      sensitivity: "sensitive",
      decision: "REVIEW",
      risk_score: 72,
      risk_level: "MEDIUM",
      policy_rule: "POL-006",
      explanation: "Production infrastructure mutations require human authorization before execution.",
      flags: ["production_impact", "high_blast_radius"],
      execution_status: "pending",
      anomaly_detected: false,
      created_at: subMinutes(38),
    },
    {
      id: "act-seed-005",
      action_id: "act-seed-005",
      agent_id: "agent-alpha",
      action_type: "query_database",
      target_resource: "analytics/user_activity_agg",
      operation: "SELECT",
      sensitivity: "internal",
      decision: "ALLOW",
      risk_score: 18,
      risk_level: "LOW",
      policy_rule: "POL-001",
      explanation: "Authorized internal database query with valid agent credentials.",
      flags: [],
      execution_status: "executed",
      execution_result: { status: "success", rows_returned: 1420, query_time_ms: 48 },
      anomaly_detected: false,
      created_at: subMinutes(14),
    },
  ];

  const approvals: Approval[] = [
    {
      id: "appr-seed-001",
      action_id: "act-seed-004",
      agent_id: "agent-beta",
      action_type: "deploy_service",
      target_resource: "k8s/cluster-us-east/payment-service:v2.4.1",
      risk_score: 72,
      reason: "Production infrastructure mutations require human authorization before execution.",
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      review_note: null,
      action_snapshot: JSON.stringify({
        action_type: "deploy_service",
        target_resource: "k8s/cluster-us-east/payment-service:v2.4.1",
        sensitivity: "sensitive",
        operation: "rolling_upgrade",
        agent_id: "agent-beta",
        context: "Automated deployment pipeline triggered release",
      }, null, 2),
      created_at: subMinutes(38),
      expires_at: addHours(23),
    },
  ];

  const alerts: Alert[] = [
    {
      id: "alt-seed-001",
      agent_id: "agent-gamma",
      action_id: "act-seed-002",
      alert_type: "prompt_injection",
      severity: "CRITICAL",
      message: "Jailbreak / Prompt Injection sequence detected: Context payload targeted production vault credentials.",
      recommended_response: "Quarantine 'agent-gamma' immediately, revoke active API tokens, and inspect recent prompt logs.",
      related_action_ids: ["act-seed-002"],
      status: "open",
      created_at: subHours(2),
    },
    {
      id: "alt-seed-002",
      agent_id: "agent-delta",
      action_id: "act-seed-003",
      alert_type: "policy_violation",
      severity: "HIGH",
      message: "Destructive Operation Intercepted: DROP TABLE query on 'customer_primary_records' blocked by POL-005.",
      recommended_response: "Review agent code generation pipeline; ensure parameter binding and read-only DB permissions.",
      related_action_ids: ["act-seed-003"],
      status: "open",
      created_at: subHours(1),
    },
    {
      id: "alt-seed-003",
      agent_id: "agent-alpha",
      action_id: "act-seed-001",
      alert_type: "anomaly",
      severity: "MEDIUM",
      message: "Request Frequency Spike: 14 actions dispatched in 30-second window (threshold: 10/min).",
      recommended_response: "Apply exponential backoff rate limiter and monitor query concurrency.",
      related_action_ids: ["act-seed-001", "act-seed-005"],
      status: "open",
      created_at: subMinutes(25),
    },
  ];

  const auditLogs: AuditLog[] = actions.map(a => ({
    id: `audit-${a.id}`,
    action_id: a.id,
    agent_id: a.agent_id,
    action_type: a.action_type,
    target_resource: a.target_resource,
    risk_score: a.risk_score,
    decision: a.decision,
    explanation: a.explanation,
    policy_rule: a.policy_rule,
    execution_status: a.execution_status,
    approved_by: null,
    approved_at: null,
    anomaly_detected: a.anomaly_detected,
    timestamp: a.created_at,
  }));

  return { agents, policies, actions, approvals, alerts, auditLogs };
}

// Global in-memory singleton for serverless runtime
const globalStore = globalThis as unknown as {
  __agentShieldStore?: ReturnType<typeof getInitialState>;
};

if (!globalStore.__agentShieldStore) {
  globalStore.__agentShieldStore = getInitialState();
}

export const store = globalStore.__agentShieldStore!;

export function resetStore() {
  globalStore.__agentShieldStore = getInitialState();
  return globalStore.__agentShieldStore;
}
