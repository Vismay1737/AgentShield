'use client';
import { useEffect, useState, useCallback } from 'react';
import { Shield, ToggleLeft, ToggleRight, Lock, Code2, AlertOctagon, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { PolicyResponse } from '@/types/api';
import { Card, LoadingSpinner, ErrorState, EmptyState } from '@/components/ui';

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getPolicies();
      setPolicies(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  const handleToggle = async (id: string, isExplicitBlock: boolean) => {
    if (isExplicitBlock) {
      alert('Non-overridable: Explicit block policies cannot be disabled for system safety.');
      return;
    }
    setToggling(id);
    try {
      await api.togglePolicy(id);
      await fetchPolicies();
    } catch (e) {
      alert(`Toggle failed: ${(e as Error).message}`);
    } finally {
      setToggling(null);
    }
  };

  const decisionStyles = {
    ALLOW: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    REVIEW: 'bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    BLOCK: 'bg-rose-500/10 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.15)]',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 cyber-card rounded-2xl border-cyan-500/20 bg-gradient-to-r from-slate-950 via-[#0a1120] to-slate-950">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-mono">
                FIREWALL RULES & POLICIES
              </h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {policies.length} ACTIVE
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Declarative security rules evaluated in strict priority order for every agent request
            </p>
          </div>
        </div>

        <button 
          onClick={fetchPolicies} 
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 transition-all self-start md:self-auto"
          title="Refresh rules"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Safety Notice */}
      <div className="p-4 cyber-card rounded-2xl border-rose-500/30 bg-rose-950/20 text-xs font-mono text-rose-300 flex items-start gap-3">
        <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">HARDENED ENFORCEMENT: </span>
          Rules designated with <span className="bg-rose-900/60 px-1.5 py-0.5 rounded border border-rose-700 font-bold text-white">EXPLICIT BLOCK</span> cannot be disabled or bypassed by any agent permission level.
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : error ? (
        <ErrorState message={error} />
      ) : policies.length === 0 ? (
        <EmptyState title="No Policies Configured" description="Policy engine has zero active rules." icon={<Shield className="w-16 h-16 text-cyan-400" />} />
      ) : (
        <div className="space-y-4">
          {policies.map(policy => {
            const isBlockedRule = policy.decision === 'BLOCK';
            const isAllowedRule = policy.decision === 'ALLOW';

            return (
              <Card 
                key={policy.id} 
                className={`transition-all duration-300 ${
                  !policy.enabled ? 'opacity-40 border-slate-800 bg-slate-950/30' : 'border-cyan-500/20 bg-slate-950/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-xl flex-shrink-0 border ${
                      isAllowedRule ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      policy.decision === 'REVIEW' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                      'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      <Shield className="w-5 h-5" />
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                          {policy.id}
                        </span>

                        <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                          decisionStyles[policy.decision as keyof typeof decisionStyles] ?? 'bg-slate-800 text-slate-300'
                        }`}>
                          VERDICT: {policy.decision}
                        </span>

                        {policy.explicit_block && (
                          <span className="text-xs font-mono bg-rose-950 text-rose-300 px-2 py-0.5 rounded-full border border-rose-800 font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                            <Lock className="w-3 h-3" /> EXPLICIT BLOCK (IMMUTABLE)
                          </span>
                        )}

                        {!policy.enabled && (
                          <span className="text-xs font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
                            INACTIVE
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white tracking-wide font-sans">
                        {policy.name}
                      </h3>

                      <p className="text-xs text-slate-400 font-sans leading-relaxed">
                        {policy.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 font-mono text-xs">
                        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5">
                          <p className="text-slate-500 text-[10px] uppercase">Base Risk Penalty</p>
                          <p className="font-bold text-white mt-0.5">{policy.risk_base} / 100</p>
                        </div>

                        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5">
                          <p className="text-slate-500 text-[10px] uppercase">Required Capability</p>
                          <p className="font-bold text-cyan-300 mt-0.5 truncate">{policy.required_permission ?? 'none (universal)'}</p>
                        </div>

                        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5">
                          <p className="text-slate-500 text-[10px] uppercase flex items-center gap-1">
                            <Code2 className="w-3 h-3 text-cyan-400" /> Evaluation Rule
                          </p>
                          <p className="font-bold text-slate-300 mt-0.5 truncate" title={policy.condition}>
                            {policy.condition}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Control */}
                  <div className="flex items-center sm:flex-col justify-end gap-2 flex-shrink-0 pt-1">
                    <button
                      onClick={() => handleToggle(policy.id, policy.explicit_block)}
                      disabled={policy.explicit_block || toggling === policy.id}
                      className={`transition-transform active:scale-95 ${
                        policy.explicit_block ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
                      }`}
                      title={policy.explicit_block ? 'Explicit block policies cannot be disabled' : policy.enabled ? 'Click to disable' : 'Click to enable'}
                    >
                      {policy.enabled ? (
                        <ToggleRight className="w-9 h-9 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                      ) : (
                        <ToggleLeft className="w-9 h-9 text-slate-700" />
                      )}
                    </button>
                    <span className="text-[10px] font-mono text-slate-500">
                      {policy.explicit_block ? 'LOCKED' : policy.enabled ? 'ENFORCING' : 'MUTED'}
                    </span>
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
