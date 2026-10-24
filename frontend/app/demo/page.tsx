'use client';
import { useEffect, useState } from 'react';
import { 
  Zap, Play, RefreshCw, CheckCircle, XCircle, Clock, 
  AlertTriangle, ChevronDown, ChevronUp, Terminal, Shield, Flame 
} from 'lucide-react';
import { api } from '@/lib/api';
import { DemoScenario } from '@/types/api';
import { Card, Button, LoadingSpinner, ErrorState } from '@/components/ui';

interface ScenarioResult {
  scenario_id: string;
  scenario_name: string;
  expected_decision: string;
  results: Array<{
    action_id: string;
    decision: string;
    risk_score: number;
    risk_level?: string;
    policy_rule?: string;
    explanation: string;
    execution_status: string;
    anomaly_detected?: boolean;
    execution_result?: unknown;
  }>;
}

export default function DemoPage() {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [results, setResults] = useState<Record<string, ScenarioResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.getDemoScenarios()
      .then(setScenarios)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const runScenario = async (id: string) => {
    setRunning(id);
    try {
      const result = await api.runScenario(id);
      setResults(prev => ({ ...prev, [id]: result as ScenarioResult }));
      setExpanded(id);
    } catch (e) {
      alert(`Execution failed: ${(e as Error).message}`);
    } finally {
      setRunning(null);
    }
  };

  const resetDemo = async () => {
    if (!confirm('Reset all demo state to clean baseline? This preserves policies and demo agents while flushing test actions.')) return;
    setResetting(true);
    try {
      await api.resetDemo();
      setResults({});
      alert('Demo state reset successfully.');
    } catch (e) {
      alert(`Reset failed: ${(e as Error).message}`);
    } finally {
      setResetting(false);
    }
  };

  const scenarioMeta: Record<string, { tag: string; tagColor: string }> = {
    'scenario-a': { tag: 'AUTHORIZED READ', tagColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
    'scenario-b': { tag: 'UNAUTHORIZED PRIVILEGE', tagColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
    'scenario-c': { tag: 'HIGH BLAST RADIUS', tagColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
    'scenario-d': { tag: 'RATE ANOMALY SPIKE', tagColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
    'scenario-e': { tag: 'TAMPER DETECTION', tagColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
    'scenario-f': { tag: 'EXPLICIT BLOCK / SQL INJECTION', tagColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8"><ErrorState message={error} /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 cyber-card rounded-2xl border-cyan-500/20 bg-gradient-to-r from-slate-950 via-[#0c1424] to-slate-950">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-mono">
                ATTACK & POLICY SIMULATOR
              </h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SANDBOX ISOLATED
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Execute standardized attack vectors to benchmark the AgentShield immune system in real time
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={resetDemo}
          disabled={resetting}
          className="text-xs font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Flushing…' : 'Reset State'}
        </Button>
      </div>

      {/* Safety Sandbox Notice */}
      <div className="p-4 cyber-card rounded-2xl border-cyan-500/20 bg-slate-950/60 font-mono text-xs text-slate-300 flex items-center gap-3">
        <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0" />
        <div>
          <span className="text-cyan-400 font-bold">SAFETY GUARANTEE: </span>
          All simulation tools execute within virtual ephemeral sandboxes. Ephemeral bearer tokens expire in 10 minutes and restrict access strictly to declared target scopes.
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="space-y-4">
        {scenarios.map((scenario, i) => {
          const result = results[scenario.id];
          const isRunning = running === scenario.id;
          const isExpanded = expanded === scenario.id;
          const meta = scenarioMeta[scenario.id] || { tag: 'BENCHMARK', tagColor: 'bg-slate-800 text-slate-300 border-slate-700' };

          const expectedBorder = 
            scenario.expected_decision === 'ALLOW' ? 'hover:border-emerald-500/40' :
            scenario.expected_decision === 'BLOCK' ? 'hover:border-rose-500/40' : 'hover:border-amber-500/40';

          return (
            <Card 
              key={scenario.id} 
              className={`transition-all duration-300 ${expectedBorder} ${
                result ? 'border-cyan-500/40 bg-[#0a1120]' : ''
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Left: Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 font-mono font-bold text-cyan-400 shadow-inner">
                    0{i + 1}
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${meta.tagColor}`}>
                        {meta.tag}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        EXPECTED: <span className="font-bold text-white">{scenario.expected_decision}</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-wide">
                      {scenario.name}
                    </h3>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {scenario.description}
                    </p>

                    {/* Result details if executed */}
                    {result && (
                      <div className="mt-4 space-y-3 pt-3 border-t border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5" /> GATEWAY INTERCEPTION LOG:
                          </span>
                          <button
                            onClick={() => setExpanded(isExpanded ? null : scenario.id)}
                            className="text-xs font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            {isExpanded ? <>Collapse <ChevronUp className="w-3 h-3" /></> : <>Expand Details <ChevronDown className="w-3 h-3" /></>}
                          </button>
                        </div>

                        {result.results.map((r, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 font-mono text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                r.decision === 'ALLOW' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                r.decision === 'BLOCK' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                                'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}>
                                VERDICT: {r.decision}
                              </span>

                              <span className="text-slate-400">
                                RISK SCORE: <strong className="text-white">{r.risk_score}</strong>
                              </span>

                              {r.policy_rule && (
                                <span className="text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                                  POLICY: {r.policy_rule}
                                </span>
                              )}

                              <span className={`ml-auto font-bold px-2 py-0.5 rounded text-[10px] ${
                                r.decision === scenario.expected_decision
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                  : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                              }`}>
                                {r.decision === scenario.expected_decision ? '✓ IMMUNE DEFENSE PASSED' : '✗ UNEXPECTED OUTCOME'}
                              </span>
                            </div>

                            <p className="text-slate-300 text-xs font-sans">{r.explanation}</p>

                            {Boolean(r.execution_result) && (
                              <div className="mt-2 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                                <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1">
                                  Scoped Tool Output:
                                </p>
                                <pre className="text-emerald-300 whitespace-pre-wrap text-[11px] overflow-x-auto">
                                  {JSON.stringify(r.execution_result, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Fire Button */}
                <div className="flex lg:flex-col items-center lg:items-end justify-end gap-2 flex-shrink-0 pt-1">
                  <Button
                    size="md"
                    variant={result ? 'secondary' : 'cyber'}
                    disabled={isRunning}
                    onClick={() => runScenario(scenario.id)}
                    className="text-xs whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {isRunning ? 'Evaluating…' : result ? 'Re-Run Test' : 'Run Scenario'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
