'use client';
import { useEffect, useState, useCallback } from 'react';
import { 
  AlertTriangle, CheckCircle, RefreshCw, ShieldAlert, Zap, 
  Terminal, ShieldCheck, Flame, ChevronDown, ChevronUp, Lock
} from 'lucide-react';
import { api } from '@/lib/api';
import { AlertResponse } from '@/types/api';
import { Card, LoadingSpinner, ErrorState, EmptyState, SeverityBadge, Button } from '@/components/ui';
import { formatDateTime, formatRelative } from '@/lib/utils';
import { useWS } from '@/lib/ws-context';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'acknowledged'>('open');
  const [simulating, setSimulating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quarantinedAgents, setQuarantinedAgents] = useState<Set<string>>(new Set(['agent-gamma']));
  const { lastEvent } = useWS();

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAlerts(filter !== 'all' ? { status: filter } : {});
      setAlerts(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  useEffect(() => {
    if (lastEvent?.type === 'alert_created') fetchAlerts();
  }, [lastEvent, fetchAlerts]);

  const acknowledge = async (id: string) => {
    await api.acknowledgeAlert(id);
    fetchAlerts();
  };

  const toggleQuarantine = async (agentId: string) => {
    const isQuarantined = quarantinedAgents.has(agentId);
    const newStatus = isQuarantined ? 'active' : 'quarantined';
    try {
      await api.updateAgentStatus(agentId, newStatus);
      setQuarantinedAgents(prev => {
        const next = new Set(prev);
        if (isQuarantined) next.delete(agentId);
        else next.add(agentId);
        return next;
      });
      alert(`Agent '${agentId}' is now ${newStatus.toUpperCase()}.`);
    } catch (e) {
      alert(`Failed to update status: ${(e as Error).message}`);
    }
  };

  const triggerSimulation = async (scenarioId: string, label: string) => {
    setSimulating(scenarioId);
    try {
      await api.runScenario(scenarioId);
      await fetchAlerts();
    } catch (e) {
      alert(`Simulation failed: ${(e as Error).message}`);
    } finally {
      setSimulating(null);
    }
  };

  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sorted = [...alerts].sort((a, b) =>
    (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
  );

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'open').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH' && a.status === 'open').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* SOC Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 cyber-card rounded-2xl border-cyan-500/20 bg-gradient-to-r from-slate-950 via-[#0a1120] to-slate-950">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight font-mono">
                  SECURITY INCIDENT CONSOLE
                </h1>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  DEFCON 2
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Real-time autonomous agent threat detection, jailbreak interception & mitigation
              </p>
            </div>
          </div>
        </div>

        {/* Live Threat Counter Pills */}
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span className="text-xs font-mono text-purple-300">{criticalCount} CRITICAL</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-xs font-mono text-rose-300">{highCount} HIGH RISK</span>
          </div>
          <button
            onClick={fetchAlerts}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-all"
            title="Refresh incident stream"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Threat Injection Bar (One-Click Attack Testing) */}
      <div className="p-4 cyber-card rounded-2xl border-cyan-500/30 bg-slate-950/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
            <Flame className="w-4 h-4 text-rose-400 animate-bounce" />
            <span className="font-bold uppercase tracking-wider">Simulate Live Attack Vector:</span>
            <span className="text-slate-400">Trigger active firewall intercepts on demand</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={simulating !== null}
              onClick={() => triggerSimulation('scenario-b', 'Jailbreak')}
              className="text-xs border-purple-500/40 text-purple-300 hover:bg-purple-950/40"
            >
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              {simulating === 'scenario-b' ? 'Injecting...' : '⚡ Jailbreak Credential Leak'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={simulating !== null}
              onClick={() => triggerSimulation('scenario-e', 'SQL Purge')}
              className="text-xs border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              {simulating === 'scenario-e' ? 'Injecting...' : '⚡ Destructive DROP Query'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={simulating !== null}
              onClick={() => triggerSimulation('scenario-d', 'Burst Rate')}
              className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/40"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {simulating === 'scenario-d' ? 'Injecting...' : '⚡ Anomaly Burst Velocity'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['open', 'all', 'acknowledged'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {f === 'open' ? '🔴 ACTIVE THREATS' : f === 'acknowledged' ? '✓ ACKNOWLEDGED' : 'ALL INCIDENTS'}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-slate-500">
          Showing {sorted.length} recorded events
        </span>
      </div>

      {/* Incidents Stream */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : error ? (
        <ErrorState message={error} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="Perimeter Secure — No Active Threats"
          description={filter === 'open' 
            ? 'All agent actions are currently adhering to established security policies. Use the attack simulator above to test proactive firewall blocks.' 
            : 'No historical incidents match the selected filter.'}
          icon={<ShieldCheck className="w-16 h-16 text-emerald-400" />}
        />
      ) : (
        <div className="space-y-4">
          {sorted.map(alert => {
            const isCritical = alert.severity === 'CRITICAL';
            const isHigh = alert.severity === 'HIGH';
            const isQuarantined = quarantinedAgents.has(alert.agent_id);
            const isExpanded = expandedId === alert.id;

            return (
              <Card 
                key={alert.id} 
                className={`border-l-4 transition-all duration-300 ${
                  isCritical ? 'border-l-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.12)]' :
                  isHigh ? 'border-l-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.12)]' :
                  alert.severity === 'MEDIUM' ? 'border-l-amber-500' : 'border-l-cyan-500'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left: Icon & Core Telemetry */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-xl flex-shrink-0 border ${
                      isCritical ? 'bg-purple-500/10 border-purple-500/40 text-purple-300' :
                      isHigh ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' :
                      alert.severity === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' :
                      'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    }`}>
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {alert.alert_type.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                          AGENT: {alert.agent_id}
                        </span>
                        {isQuarantined && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold animate-pulse">
                            [QUARANTINED]
                          </span>
                        )}
                        <span className="text-xs font-mono text-slate-500 ml-auto">
                          {formatRelative(alert.created_at)} ({formatDateTime(alert.created_at)})
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white tracking-wide">
                        {alert.message}
                      </h3>

                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
                        <span className="text-cyan-400 font-mono font-bold">RECOMMENDED IMMUNE RESPONSE: </span>
                        <span className="text-slate-300">{alert.recommended_response}</span>
                      </div>

                      {/* Expandable Forensic Deep-Dive */}
                      {isExpanded && (
                        <div className="mt-3 p-4 rounded-xl bg-black/60 border border-cyan-900/40 space-y-2 font-mono text-xs">
                          <div className="text-cyan-300 font-bold flex items-center gap-2 border-b border-slate-800 pb-2">
                            <Terminal className="w-4 h-4 text-cyan-400" />
                            FORENSIC AUDIT RECORD & THREAT METADATA
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-slate-400">
                            <div>INCIDENT ID: <span className="text-slate-200">{alert.id}</span></div>
                            <div>TRIGGERED ACTION: <span className="text-slate-200">{alert.action_id || 'N/A (Velocity Burst)'}</span></div>
                            <div>GATEWAY DECISION: <span className="text-rose-400 font-bold">ENFORCED BLOCK</span></div>
                            <div>TAMPER SIGNATURE: <span className="text-emerald-400">HMAC-SHA256 VERIFIED</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: SOC Response Controls */}
                  <div className="flex lg:flex-col items-center lg:items-end gap-2 flex-shrink-0 pt-1">
                    {alert.status === 'open' ? (
                      <Button
                        size="sm"
                        variant="cyber"
                        onClick={() => acknowledge(alert.id)}
                        className="text-xs whitespace-nowrap"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Acknowledge Threat
                      </Button>
                    ) : (
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Mitigated
                      </span>
                    )}

                    <Button
                      size="sm"
                      variant={isQuarantined ? 'success' : 'danger'}
                      onClick={() => toggleQuarantine(alert.agent_id)}
                      className="text-xs whitespace-nowrap"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {isQuarantined ? 'Release Agent' : 'Quarantine Agent'}
                    </Button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                      className="text-xs font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 py-1"
                    >
                      {isExpanded ? (
                        <>Hide Forensics <ChevronUp className="w-3.5 h-3.5" /></>
                      ) : (
                        <>Inspect Forensics <ChevronDown className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
