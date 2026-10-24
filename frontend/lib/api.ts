// AgentShield API Client

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new APIError(res.status, body.detail || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Health
  health: () => request<{ status: string }>('/health'),

  // Dashboard
  getDashboardSummary: () => request<import('@/types/api').DashboardSummary>('/dashboard/summary'),

  // Agents
  getAgents: () => request<import('@/types/api').AgentResponse[]>('/agents'),
  getAgent: (id: string) => request<import('@/types/api').AgentResponse>(`/agents/${id}`),

  // Actions
  getActions: (params?: { agent_id?: string; decision?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<import('@/types/api').ActionResponse[]>(`/actions${q ? '?' + q : ''}`);
  },
  evaluateAction: (data: import('@/types/api').ActionRequest) =>
    request<import('@/types/api').ActionResponse>('/actions/evaluate', { method: 'POST', body: JSON.stringify(data) }),
  executeAction: (action_id: string) =>
    request<{ success: boolean; result?: unknown; error?: string }>('/actions/execute', {
      method: 'POST',
      body: JSON.stringify({ action_id }),
    }),

  // Approvals
  getApprovals: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return request<import('@/types/api').ApprovalResponse[]>(`/approvals${q}`);
  },
  approveAction: (id: string, note?: string) =>
    request(`/approvals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewer: 'demo_admin', note }),
    }),
  rejectAction: (id: string, note?: string) =>
    request(`/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reviewer: 'demo_admin', note }),
    }),

  // Audit Logs
  getAuditLogs: (params?: { agent_id?: string; decision?: string; search?: string; limit?: number }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v != null)) as Record<string, string>
    ).toString();
    return request<import('@/types/api').AuditLogResponse[]>(`/audit-logs${q ? '?' + q : ''}`);
  },

  // Alerts
  getAlerts: (params?: { status?: string; severity?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<import('@/types/api').AlertResponse[]>(`/alerts${q ? '?' + q : ''}`);
  },
  acknowledgeAlert: (id: string) =>
    request(`/alerts/${id}/acknowledge`, { method: 'POST' }),

  // Policies
  getPolicies: () => request<import('@/types/api').PolicyResponse[]>('/policies'),
  togglePolicy: (id: string) =>
    request(`/policies/${id}/toggle`, { method: 'PATCH' }),

  // Demo
  getDemoScenarios: () => request<import('@/types/api').DemoScenario[]>('/demo/scenarios'),
  runScenario: (id: string) => request(`/demo/run/${id}`, { method: 'POST' }),
  resetDemo: () => request('/demo/reset', { method: 'POST' }),

  // Agent Status
  updateAgentStatus: (agentId: string, status: string) =>
    request(`/agents/${agentId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
};

export { APIError };
