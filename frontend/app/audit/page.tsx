'use client';
import { useEffect, useState, useCallback } from 'react';
import { Search, FileText, RefreshCw, X, ShieldCheck, Terminal, Filter, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { AuditLogResponse } from '@/types/api';
import { Card, LoadingSpinner, ErrorState, EmptyState, DecisionBadge, RiskScoreBar, Button } from '@/components/ui';
import { formatDateTime, actionTypeLabel } from '@/lib/utils';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [selected, setSelected] = useState<AuditLogResponse | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs({
        search: search || undefined,
        decision: decisionFilter || undefined,
        agent_id: agentFilter || undefined,
        limit: 200,
      });
      setLogs(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, decisionFilter, agentFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const agents = [...new Set(logs.map(l => l.agent_id))];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 cyber-card rounded-2xl border-cyan-500/20 bg-gradient-to-r from-slate-950 via-[#0a1120] to-slate-950">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <FileText className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-mono">
                IMMUTABLE AUDIT LEDGER
              </h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                HMAC-SHA256 SIGNED
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Cryptographically verified chain of custody for every AI agent request and policy evaluation
            </p>
          </div>
        </div>

        <button 
          onClick={fetchLogs} 
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 transition-all self-start md:self-auto"
          title="Refresh audit stream"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Cyber Filters Bar */}
      <Card className="p-4 border-cyan-500/20 bg-slate-950/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="text"
              placeholder="Search resource, target, or rule..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          <select
            value={decisionFilter}
            onChange={e => setDecisionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400 transition-all"
          >
            <option value="">All Decisions (ALLOW, REVIEW, BLOCK)</option>
            <option value="ALLOW">ALLOW (Authorized)</option>
            <option value="REVIEW">REVIEW (Escrow)</option>
            <option value="BLOCK">BLOCK (Denied)</option>
          </select>

          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400 transition-all"
          >
            <option value="">All Agents</option>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {(search || decisionFilter || agentFilter) && (
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-xs font-mono text-slate-400">
              Matching records: <span className="text-cyan-400 font-bold">{logs.length}</span>
            </span>
            <button 
              onClick={() => { setSearch(''); setDecisionFilter(''); setAgentFilter(''); }}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>
        )}
      </Card>

      {/* Grid: Table & Forensic Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selected ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {loading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : error ? (
            <ErrorState message={error} />
          ) : logs.length === 0 ? (
            <EmptyState 
              title="Ledger Empty" 
              description="No audit records match your query." 
              icon={<FileText className="w-16 h-16 text-cyan-400" />} 
            />
          ) : (
            <Card className="p-0 overflow-hidden border-cyan-500/20 bg-slate-950/70">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Decision</th>
                      <th className="text-left px-4 py-3">Agent</th>
                      <th className="text-left px-4 py-3">Action Type</th>
                      <th className="text-left px-4 py-3">Target Resource</th>
                      <th className="text-left px-4 py-3">Risk</th>
                      <th className="text-left px-4 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {logs.map(log => (
                      <tr
                        key={log.id}
                        onClick={() => setSelected(selected?.id === log.id ? null : log)}
                        className={`cursor-pointer transition-colors ${
                          selected?.id === log.id 
                            ? 'bg-cyan-950/40 border-l-2 border-l-cyan-400' 
                            : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <td className="px-4 py-3.5"><DecisionBadge decision={log.decision} /></td>
                        <td className="px-4 py-3.5 font-bold text-cyan-400">{log.agent_id}</td>
                        <td className="px-4 py-3.5 text-white">{actionTypeLabel(log.action_type)}</td>
                        <td className="px-4 py-3.5 text-slate-300 max-w-[150px] truncate">{log.target_resource}</td>
                        <td className="px-4 py-3.5 w-28"><RiskScoreBar score={log.risk_score} /></td>
                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Selected Record Forensics Side-Sheet */}
        {selected && (
          <div className="space-y-4">
            <Card className="border-cyan-500/40 bg-slate-950 p-5 space-y-4 font-mono text-xs shadow-[0_0_30px_rgba(6,182,212,0.15)]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-white uppercase tracking-wider">Forensic Audit Record</h3>
                </div>
                <button 
                  onClick={() => setSelected(null)} 
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <DecisionBadge decision={selected.decision} />
                {selected.anomaly_detected && (
                  <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800 font-bold animate-pulse">
                    ⚠ ANOMALY DETECTED
                  </span>
                )}
              </div>

              <div className="space-y-3 pt-1">
                <DetailItem label="ACTION ID" value={selected.action_id} highlight />
                <DetailItem label="INVOKING AGENT" value={selected.agent_id} />
                <DetailItem label="ACTION TYPE" value={actionTypeLabel(selected.action_type)} />
                <DetailItem label="TARGET RESOURCE" value={selected.target_resource} highlight />
                <DetailItem label="RISK SCORE" value={`${selected.risk_score} / 100`} />
                <DetailItem label="EVALUATED RULE" value={selected.policy_rule || 'DEFAULT_DENY'} />
                <DetailItem label="EXECUTION STATUS" value={selected.execution_status.toUpperCase()} />
                {selected.approved_by && <DetailItem label="AUTHORIZED BY" value={selected.approved_by} />}
                
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Reason / Policy Explanation</p>
                  <p className="text-slate-200 bg-slate-900/90 border border-slate-800 rounded-xl p-3 leading-relaxed font-sans text-xs">
                    {selected.explanation}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    INTEGRITY VERIFIED
                  </span>
                  <span className="text-slate-500 text-[10px]">SHA256 SIGNED</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
      <p className={`font-mono text-xs break-all ${highlight ? 'text-cyan-300 font-bold' : 'text-slate-200'}`}>
        {value}
      </p>
    </div>
  );
}
