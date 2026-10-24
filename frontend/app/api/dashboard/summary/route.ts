import { NextResponse } from 'next/server';
import { store } from '@/lib/mock-server-state';

export async function GET() {
  const allowed = store.actions.filter(a => a.decision === 'ALLOW').length;
  const blocked = store.actions.filter(a => a.decision === 'BLOCK').length;
  const review = store.actions.filter(a => a.decision === 'REVIEW').length;
  const pendingApprovals = store.approvals.filter(a => a.status === 'pending').length;
  const openAlerts = store.alerts.filter(a => a.status === 'open').length;

  const lowRisk = store.actions.filter(a => a.risk_score < 30).length;
  const medRisk = store.actions.filter(a => a.risk_score >= 30 && a.risk_score < 70).length;
  const highRisk = store.actions.filter(a => a.risk_score >= 70).length;

  // Generate 7-day trend
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
  const decisionTrend = days.map((d, i) => ({
    date: d,
    allowed: i === 6 ? allowed : Math.max(1, (allowed * (i + 1)) % 8 + 2),
    blocked: i === 6 ? blocked : Math.max(0, (blocked * (i + 1)) % 4),
    review: i === 6 ? review : Math.max(0, (review * (i + 1)) % 3),
  }));

  const recent = store.actions.slice(0, 10).map(a => ({
    action_id: a.id,
    agent_id: a.agent_id,
    action_type: a.action_type,
    target_resource: a.target_resource,
    decision: a.decision,
    risk_score: a.risk_score,
    created_at: a.created_at,
  }));

  return NextResponse.json({
    total_actions: store.actions.length,
    allowed_actions: allowed,
    blocked_actions: blocked,
    review_actions: review,
    pending_approvals: pendingApprovals,
    open_alerts: openAlerts,
    active_agents: store.agents.filter(a => a.status === 'active').length,
    risk_distribution: {
      low: lowRisk,
      medium: medRisk,
      high: highRisk,
    },
    decision_trend: decisionTrend,
    recent_decisions: recent,
  });
}
