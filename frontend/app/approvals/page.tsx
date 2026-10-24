'use client';
import { useEffect, useState, useCallback } from 'react';
import { 
  CheckSquare, XCircle, CheckCircle, Clock, RefreshCw, 
  ShieldCheck, ShieldAlert, KeyRound, Terminal, ChevronDown, ChevronUp 
} from 'lucide-react';
import { api } from '@/lib/api';
import { ApprovalResponse } from '@/types/api';
import { Card, LoadingSpinner, ErrorState, EmptyState, RiskScoreBar, Button } from '@/components/ui';
import { formatDateTime, formatRelative } from '@/lib/utils';
import { useWS } from '@/lib/ws-context';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { lastEvent } = useWS();

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getApprovals(filter === 'pending' ? 'pending' : undefined);
      setApprovals(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);
  useEffect(() => {
    if (lastEvent?.type === 'approval_processed' || lastEvent?.type === 'action_evaluated') {
      fetchApprovals();
    }
  }, [lastEvent, fetchApprovals]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await api.approveAction(id, 'Authorized by sec_admin via Command Console');
      await fetchApprovals();
    } catch (e) {
      alert(`Approval failed: ${(e as Error).message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      await api.rejectAction(id, 'Denied by sec_admin — policy non-compliance');
      await fetchApprovals();
    } catch (e) {
      alert(`Rejection failed: ${(e as Error).message}`);
    } finally {
      setProcessing(null);
    }
  };

  const pending = approvals.filter(a => a.status === 'pending');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 cyber-card rounded-2xl border-cyan-500/20 bg-gradient-to-r from-slate-950 via-[#0c1322] to-slate-950">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <CheckSquare className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-mono">
                HUMAN-IN-THE-LOOP APPROVALS
              </h1>
              {pending.length > 0 && (
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  {pending.length} PENDING REVIEW
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              High-risk agent operations held in escrow pending cryptographic operator authorization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {(['pending', 'all'] as const).map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  filter === f 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'pending' ? 'PENDING QUEUE' : 'ALL REQUESTS'}
              </button>
            ))}
          </div>
          <button 
            onClick={fetchApprovals} 
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 transition-all"
            title="Refresh queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security Guarantee Notice */}
      <div className="p-4 cyber-card rounded-2xl border-cyan-500/30 bg-cyan-950/20 text-xs font-mono text-cyan-300 flex items-start gap-3">
        <KeyRound className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">REVALIDATION ASSURANCE: </span>
          Approval records store an immutable cryptographic snapshot of the requested payload. At execution time, AgentShield re-verifies agent permissions and payload integrity. Tampered requests automatically fail.
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : error ? (
        <ErrorState message={error} />
      ) : approvals.length === 0 ? (
        <EmptyState
          title="Escrow Queue Clear"
          description={filter === 'pending' ? 'No sensitive operations currently require operator authorization.' : 'No historical approvals found.'}
          icon={<ShieldCheck className="w-16 h-16 text-emerald-400" />}
        />
      ) : (
        <div className="space-y-4">
          {approvals.map(approval => {
            const isPending = approval.status === 'pending';
            const isExpired = Boolean(approval.expires_at && new Date(approval.expires_at) < new Date());
            const isExpanded = expandedId === approval.id;

            return (
              <Card 
                key={approval.id} 
                className={`border-l-4 transition-all duration-300 ${
                  isPending && !isExpired ? 'border-l-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.12)]' :
                  approval.status === 'approved' ? 'border-l-emerald-500' : 'border-l-rose-500'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left content */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`p-3 rounded-xl flex-shrink-0 border ${
                      isPending ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                      approval.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {isPending ? <Clock className="w-5 h-5 text-amber-400 animate-pulse" /> :
                       approval.status === 'approved' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
                       <XCircle className="w-5 h-5 text-rose-400" />}
                    </div>

                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                          isPending ? 'bg-amber-500/10 text-amber-300 border-amber-500/40' :
                          approval.status === 'approved' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40' :
                          'bg-rose-500/10 text-rose-300 border-rose-500/40'
                        }`}>
                          {isExpired ? 'EXPIRED' : approval.status.toUpperCase()}
                        </span>

                        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 font-bold">
                          AGENT: {approval.agent_id}
                        </span>

                        <span className="text-xs font-mono text-slate-500 ml-auto">
                          REQUESTED: {formatRelative(approval.created_at)} ({formatDateTime(approval.created_at)})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs">
                        <div>
                          <p className="text-slate-500 mb-0.5 uppercase tracking-wider text-[10px]">Action Type</p>
                          <p className="text-white font-bold">{approval.action_type}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-0.5 uppercase tracking-wider text-[10px]">Target Resource</p>
                          <p className="text-cyan-300 font-bold truncate">{approval.target_resource}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                          <span>Risk Assessment Score</span>
                          <span className="font-bold text-amber-400">{approval.risk_score} / 100</span>
                        </div>
                        <RiskScoreBar score={approval.risk_score} />
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                        <span className="text-amber-400 font-mono font-bold">REASON FOR REVIEW: </span>
                        {approval.reason}
                      </div>

                      {approval.expires_at && (
                        <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          Escrow Valid Until: <span className="text-slate-200">{formatDateTime(approval.expires_at)}</span>
                        </p>
                      )}

                      {/* Expandable Action Snapshot */}
                      {isExpanded && approval.action_snapshot && (
                        <div className="mt-2 p-3 rounded-xl bg-black/60 border border-slate-800 font-mono text-xs">
                          <p className="text-cyan-400 font-bold mb-1 flex items-center gap-1">
                            <Terminal className="w-3.5 h-3.5" /> Immutable Action Snapshot Payload:
                          </p>
                          <pre className="text-slate-300 whitespace-pre-wrap text-[11px] overflow-x-auto">
                            {JSON.stringify(JSON.parse(approval.action_snapshot || '{}'), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex lg:flex-col items-center lg:items-end gap-2 flex-shrink-0 pt-1">
                    {isPending && !isExpired ? (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          disabled={processing === approval.id}
                          onClick={() => handleApprove(approval.id)}
                          className="text-xs whitespace-nowrap shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {processing === approval.id ? 'Authorizing…' : 'Approve & Execute'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={processing === approval.id}
                          onClick={() => handleReject(approval.id)}
                          className="text-xs whitespace-nowrap"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject Request
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                        Resolution Finalized
                      </span>
                    )}

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : approval.id)}
                      className="text-xs font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 py-1"
                    >
                      {isExpanded ? (
                        <>Hide Snapshot <ChevronUp className="w-3.5 h-3.5" /></>
                      ) : (
                        <>View Payload <ChevronDown className="w-3.5 h-3.5" /></>
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
