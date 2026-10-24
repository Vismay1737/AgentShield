'use client';
import { useEffect, useState, useCallback } from 'react';
import { Users, Activity, Shield, Lock, ShieldAlert, CheckCircle, RefreshCw, Radio } from 'lucide-react';
import { api } from '@/lib/api';
import { AgentResponse, ActionResponse } from '@/types/api';
import { Card, LoadingSpinner, ErrorState, EmptyState, DecisionBadge, RiskScoreBar, Button } from '@/components/ui';
import { formatRelative, formatDateTime } from '@/lib/utils';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [actions, setActions] = useState<ActionResponse[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [a, acts] = await Promise.all([api.getAgents(), api.getActions({ limit: 100 })]);
      setAgents(a);
      setActions(acts);
      if (a.length > 0 && !selected) setSelected(a[0].id);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleQuarantine = async (agent: AgentResponse) => {
    setUpdating(agent.id);
    const newStatus = agent.status === 'quarantined' ? 'active' : 'quarantined';
    try {
      await api.updateAgentStatus(agent.id, newStatus);
      await fetchData();
    } catch (e) {
      alert(`Status update failed: ${(e as Error).message}`);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8"><ErrorState message={error} /></div>;

  const selectedAgent = agents.find(a => a.id === selected);
  const agentActions = actions.filter(a => a.agent_id === selected);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 cyber-card rounded-2xl border-cyan-500/20 bg-gradient-to-r from-slate-950 via-[#0a1120] to-slate-950">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Users className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-mono">
                AGENT FLEET REPUTATION & CONTROL
              </h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {agents.length} MONITORED
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Identity profiles, assigned privilege boundaries, and runtime execution metrics
            </p>
          </div>
        </div>

        <button 
          onClick={fetchData} 
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 transition-all self-start md:self-auto"
          title="Refresh fleet telemetry"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 px-1">
            Registered Agents
          </div>
          {agents.length === 0 ? (
            <EmptyState title="No Agents" description="No agents registered." icon={<Users className="w-12 h-12" />} />
          ) : agents.map(agent => {
            const isQuarantined = agent.status === 'quarantined';
            const isSelected = selected === agent.id;

            return (
              <button
                key={agent.id}
                onClick={() => setSelected(agent.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all cyber-card text-xs font-mono ${
                  isSelected
                    ? 'border-cyan-400/80 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-white text-sm font-sans">{agent.name}</p>
                    <p className="text-cyan-400 text-xs mt-0.5">{agent.id}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                    isQuarantined
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <div className="flex gap-4 text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Actions: <strong className="text-white">{agent.action_count}</strong></span>
                  <span>Blocked: <strong className={agent.block_count > 0 ? 'text-rose-400' : 'text-slate-400'}>{agent.block_count}</strong></span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">Last active {formatRelative(agent.last_seen)}</p>
              </button>
            );
          })}
        </div>

        {/* Agent Detail View */}
        <div className="lg:col-span-2 space-y-4">
          {selectedAgent && (
            <>
              <Card className="border-cyan-500/20 bg-slate-950/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white font-mono">{selectedAgent.name}</h2>
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                        {selectedAgent.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{selectedAgent.description}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant={selectedAgent.status === 'quarantined' ? 'success' : 'danger'}
                      disabled={updating === selectedAgent.id}
                      onClick={() => toggleQuarantine(selectedAgent)}
                      className="text-xs whitespace-nowrap"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {selectedAgent.status === 'quarantined' ? 'Release Quarantine' : 'Quarantine Agent'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Invocations</p>
                    <p className="text-2xl font-bold text-white mt-1">{selectedAgent.action_count}</p>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-rose-400">Denied / Intercepted</p>
                    <p className="text-2xl font-bold text-rose-400 mt-1">{selectedAgent.block_count}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                    Authorized Capability Scopes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.permissions.map(p => (
                      <span key={p} className="text-xs font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
                        {p}
                      </span>
                    ))}
                    {selectedAgent.permissions.length === 0 && (
                      <span className="text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-900 px-2 py-1 rounded">
                        Zero Permissions (Restricted Sandbox)
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Recent Actions */}
              <Card className="border-cyan-500/20 bg-slate-950/80">
                <h3 className="text-sm font-mono font-bold tracking-wider uppercase text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> Action Execution History
                </h3>
                {agentActions.length === 0 ? (
                  <EmptyState title="No History" description="This agent has no recorded action attempts." />
                ) : (
                  <div className="space-y-2">
                    {agentActions.slice(0, 10).map(action => (
                      <div 
                        key={action.action_id} 
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <DecisionBadge decision={action.decision} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white font-mono truncate">{action.action_type}</p>
                            <p className="text-[11px] text-slate-400 font-mono truncate">{action.target_resource}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0 font-mono text-xs">
                          <div className="w-24">
                            <RiskScoreBar score={action.risk_score} />
                          </div>
                          <span className="text-slate-500 text-[11px] whitespace-nowrap">
                            {formatRelative(action.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
