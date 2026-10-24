// AgentShield API Types

export type Decision = 'ALLOW' | 'REVIEW' | 'BLOCK';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ExecutionStatus = 'authorized' | 'pending_approval' | 'blocked' | 'executed' | 'expired' | 'approved';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ActionResponse {
  action_id: string;
  agent_id: string;
  action_type: string;
  target_resource: string;
  decision: Decision;
  risk_score: number;
  risk_level: RiskLevel;
  policy_rule: string;
  explanation: string;
  flags: string[];
  anomaly_detected: boolean;
  anomaly_severity: string | null;
  anomaly_reason: string | null;
  execution_status: ExecutionStatus;
  authorization_token: string | null;
  created_at: string;
}

export interface AgentResponse {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  status: string;
  created_at: string;
  last_seen: string;
  action_count: number;
  block_count: number;
}

export interface ApprovalResponse {
  id: string;
  action_id: string;
  agent_id: string;
  action_type: string;
  target_resource: string;
  risk_score: number;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  expires_at: string | null;
  action_snapshot?: string | null;
}

export interface AuditLogResponse {
  id: string;
  action_id: string;
  agent_id: string;
  action_type: string;
  target_resource: string;
  risk_score: number;
  decision: Decision;
  explanation: string;
  policy_rule: string;
  execution_status: string;
  approved_by: string | null;
  approved_at: string | null;
  anomaly_detected: boolean;
  timestamp: string;
}

export interface AlertResponse {
  id: string;
  agent_id: string;
  action_id: string | null;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  recommended_response: string;
  related_action_ids: string[];
  status: string;
  created_at: string;
}

export interface PolicyResponse {
  id: string;
  name: string;
  description: string;
  condition: string;
  required_permission: string | null;
  decision: Decision;
  risk_base: number;
  enabled: boolean;
  explicit_block: boolean;
  created_at: string;
}

export interface DashboardSummary {
  total_actions: number;
  allowed_actions: number;
  blocked_actions: number;
  review_actions: number;
  pending_approvals: number;
  high_risk_alerts: number;
  active_agents: number;
  open_alerts: number;
  risk_distribution: { low: number; medium: number; high: number };
  recent_decisions: Array<{
    action_id: string;
    agent_id: string;
    action_type: string;
    target_resource: string;
    decision: Decision;
    risk_score: number;
    created_at: string;
  }>;
  decision_trend: Array<{
    date: string;
    allowed: number;
    blocked: number;
    review: number;
  }>;
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  expected_decision: Decision;
}

export interface ActionRequest {
  agent_id: string;
  action_type: string;
  target_resource: string;
  operation?: string;
  sensitivity?: string;
  destination?: string;
  context?: string;
  justification?: string;
}
