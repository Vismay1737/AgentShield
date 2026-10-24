import { NextRequest, NextResponse } from 'next/server';
import { store, Action, AuditLog, Alert, Approval } from '@/lib/mock-server-state';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const now = new Date().toISOString();
  const actId = `act-${Date.now()}`;

  let resultData: {
    scenario_id: string;
    scenario_name: string;
    expected_decision: string;
    results: unknown[];
  };

  switch (id) {
    case 'scenario-a': {
      const act: Action = {
        id: actId,
        action_id: actId,
        agent_id: 'agent-alpha',
        action_type: 'read_report',
        target_resource: 'reports/sales-q3-2024.pdf',
        operation: 'read',
        sensitivity: 'public',
        decision: 'ALLOW',
        risk_score: 10,
        risk_level: 'LOW',
        policy_rule: 'POL-001',
        explanation: 'Action meets all policy criteria for public report access.',
        flags: [],
        execution_status: 'executed',
        anomaly_detected: false,
        execution_result: { status: 'success', data: 'Sales Q3 2024: Revenue +24% YoY' },
        created_at: now,
      };
      store.actions.unshift(act);
      store.auditLogs.unshift({
        id: `audit-${actId}`,
        action_id: actId,
        agent_id: act.agent_id,
        action_type: act.action_type,
        target_resource: act.target_resource,
        risk_score: act.risk_score,
        decision: act.decision,
        explanation: act.explanation,
        policy_rule: act.policy_rule,
        execution_status: act.execution_status,
        approved_by: null,
        approved_at: null,
        anomaly_detected: false,
        timestamp: now,
      });

      resultData = {
        scenario_id: id,
        scenario_name: 'Scenario A: Authorized Access',
        expected_decision: 'ALLOW',
        results: [{
          action_id: actId,
          decision: 'ALLOW',
          risk_score: 10,
          risk_level: 'LOW',
          policy_rule: 'POL-001',
          explanation: 'Action meets all policy criteria for public report access.',
          execution_status: 'executed',
          anomaly_detected: false,
          execution_result: { status: 'success', data: 'Sales Q3 2024: Revenue +24% YoY' },
        }],
      };
      break;
    }

    case 'scenario-b': {
      const act: Action = {
        id: actId,
        action_id: actId,
        agent_id: 'agent-gamma',
        action_type: 'read_file',
        target_resource: 'files/financial-report-2024.xlsx',
        operation: 'read',
        sensitivity: 'restricted',
        decision: 'BLOCK',
        risk_score: 85,
        risk_level: 'HIGH',
        policy_rule: 'POL-002',
        explanation: "Agent 'agent-gamma' lacks required permission 'read_restricted' for sensitivity 'restricted'.",
        flags: ['missing_permission', 'restricted_resource'],
        execution_status: 'blocked',
        anomaly_detected: false,
        created_at: now,
      };
      store.actions.unshift(act);
      store.alerts.unshift({
        id: `alt-${Date.now()}`,
        agent_id: 'agent-gamma',
        action_id: actId,
        alert_type: 'policy_violation',
        severity: 'HIGH',
        message: 'Unauthorized file access attempt: Restricted financial data access blocked by POL-002.',
        recommended_response: 'Verify agent scope and isolate suspicious file requests.',
        related_action_ids: [actId],
        status: 'open',
        created_at: now,
      });

      resultData = {
        scenario_id: id,
        scenario_name: 'Scenario B: Unauthorized File Access',
        expected_decision: 'BLOCK',
        results: [{
          action_id: actId,
          decision: 'BLOCK',
          risk_score: 85,
          risk_level: 'HIGH',
          policy_rule: 'POL-002',
          explanation: "Agent 'agent-gamma' lacks required permission 'read_restricted' for sensitivity 'restricted'.",
          execution_status: 'blocked',
          anomaly_detected: false,
        }],
      };
      break;
    }

    case 'scenario-c': {
      const act: Action = {
        id: actId,
        action_id: actId,
        agent_id: 'agent-delta',
        action_type: 'sensitive_operation',
        target_resource: 'ops/system-config-update',
        operation: 'update',
        sensitivity: 'sensitive',
        decision: 'REVIEW',
        risk_score: 65,
        risk_level: 'MEDIUM',
        policy_rule: 'POL-006',
        explanation: 'Sensitive system operations require explicit human approval before execution.',
        flags: ['sensitive_operation'],
        execution_status: 'pending',
        anomaly_detected: false,
        created_at: now,
      };
      store.actions.unshift(act);
      store.approvals.unshift({
        id: `appr-${Date.now()}`,
        action_id: actId,
        agent_id: 'agent-delta',
        action_type: 'sensitive_operation',
        target_resource: 'ops/system-config-update',
        risk_score: 65,
        reason: 'Sensitive system operations require explicit human approval before execution.',
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
        action_snapshot: JSON.stringify({
          action_type: 'sensitive_operation',
          target_resource: 'ops/system-config-update',
          operation: 'update',
          sensitivity: 'sensitive',
          agent_id: 'agent-delta',
        }, null, 2),
        created_at: now,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      resultData = {
        scenario_id: id,
        scenario_name: 'Scenario C: Sensitive Action Requiring Approval',
        expected_decision: 'REVIEW',
        results: [{
          action_id: actId,
          decision: 'REVIEW',
          risk_score: 65,
          risk_level: 'MEDIUM',
          policy_rule: 'POL-006',
          explanation: 'Sensitive system operations require explicit human approval before execution.',
          execution_status: 'pending',
          anomaly_detected: false,
        }],
      };
      break;
    }

    case 'scenario-d': {
      store.alerts.unshift({
        id: `alt-${Date.now()}`,
        agent_id: 'agent-gamma',
        action_id: actId,
        alert_type: 'anomaly',
        severity: 'CRITICAL',
        message: 'Repeated unauthorized access attempts: 5 consecutive violations within 60 seconds.',
        recommended_response: 'Quarantine agent immediately and revoke token permissions.',
        related_action_ids: [actId],
        status: 'open',
        created_at: now,
      });

      resultData = {
        scenario_id: id,
        scenario_name: 'Scenario D: Suspicious Behavior (Anomaly Detection)',
        expected_decision: 'BLOCK',
        results: [{
          action_id: actId,
          decision: 'BLOCK',
          risk_score: 95,
          risk_level: 'HIGH',
          policy_rule: 'POL-002',
          explanation: 'Anomaly penalty applied: consecutive failure rate exceeded threshold.',
          execution_status: 'blocked',
          anomaly_detected: true,
        }],
      };
      break;
    }

    default: {
      resultData = {
        scenario_id: id,
        scenario_name: 'Scenario Test',
        expected_decision: 'BLOCK',
        results: [{
          action_id: actId,
          decision: 'BLOCK',
          risk_score: 100,
          risk_level: 'HIGH',
          policy_rule: 'POL-005',
          explanation: 'Destructive operation denied by explicit safety policy.',
          execution_status: 'blocked',
          anomaly_detected: false,
        }],
      };
    }
  }

  return NextResponse.json(resultData);
}
