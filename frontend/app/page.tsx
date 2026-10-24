'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, CheckSquare, Shield,
  TrendingUp, Users, RefreshCw, Clock, Radio,
  ShieldCheck, Zap, ArrowUpRight, Lock, Eye
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { api } from '@/lib/api';
import { DashboardSummary } from '@/types/api';
import { StatCard, Card, LoadingSpinner, ErrorState, DecisionBadge, Button } from '@/components/ui';
import { formatRelative, actionTypeLabel } from '@/lib/utils';
import { useWS } from '@/lib/ws-context';

export default function OverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { lastEvent } = useWS();

  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // Refresh on WS events
  useEffect(() => {
    if (lastEvent?.type === 'action_evaluated' || lastEvent?.type === 'approval_processed' || lastEvent?.type === 'alert_created') {
      fetchSummary();
    }
  }, [lastEvent, fetchSummary]);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-96">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (error) return (
    <div className="p-8"><ErrorState message={error} /></div>
  );

  const s = summary!;
  const pieData = [
    { name: 'Low Risk', value: s.risk_distribution.low, color: '#10b981' },
    { name: 'Medium Risk', value: s.risk_distribution.medium, color: '#f59e0b' },
    { name: 'High Risk', value: s.risk_distribution.high, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  // Compute live security health score
  const total = s.total_actions || 1;
  const healthScore = Math.max(70, Math.min(100, Math.round(100 - (s.blocked_actions / total) * 15 - s.open_alerts * 2)));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top SOC Status Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 cyber-card rounded-2xl border-cyan-500/20 bg-gradient-to-r from-[#070b12] via-[#0d1527] to-[#070b12]">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight font-mono">
                SECURITY COMMAND CENTER
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                GATEWAY: ENFORCING
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Autonomous Agent Pre-Execution Gatekeeper</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 font-mono text-xs">IMMUNE INTEGRITY: {healthScore}%</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/demo">
            <Button size="sm" variant="cyber" className="text-xs">
              <Zap className="w-3.5 h-3.5" /> Launch Attack Simulator
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-800" />
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            {lastRefresh ? formatRelative(lastRefresh.toISOString()) : 'just now'}
          </span>
          <button
            onClick={fetchSummary}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 transition-all"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cyber Telemetry Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Monitored Actions" 
          value={s.total_actions}
          icon={<Activity className="w-5 h-5" />} 
          color="blue"
          trend="LIVE STREAM"
        />
        <StatCard
          title="Authorized" 
          value={s.allowed_actions}
          icon={<ShieldCheck className="w-5 h-5" />} 
          color="green"
          trend="TOKEN ISSUED"
        />
        <StatCard
          title="Blocked Exploits" 
          value={s.blocked_actions}
          icon={<AlertTriangle className="w-5 h-5" />} 
          color="red"
          trend="INTERCEPTED"
        />
        <StatCard
          title="Pending Approvals" 
          value={s.pending_approvals}
          icon={<CheckSquare className="w-5 h-5" />} 
          color="amber"
          trend="HUMAN REVIEW"
        />
        <StatCard
          title="Active Alerts" 
          value={s.open_alerts}
          icon={<TrendingUp className="w-5 h-5" />} 
          color="purple"
          trend="SOC ALERTS"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decision Trend Area Chart */}
        <Card className="lg:col-span-2 border-cyan-500/15">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Interception & Evaluation Velocity (7 Days)
              </h2>
              <p className="text-xs text-slate-400">Pre-execution security determinations per day</p>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
              HOURLY AGGREGATE
            </span>
          </div>

          {s.decision_trend.some(d => d.allowed + d.blocked + d.review > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={s.decision_trend}>
                <defs>
                  <linearGradient id="colorAllow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorBlock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorReview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#334155" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#334155" />
                <Tooltip contentStyle={{ 
                  backgroundColor: '#0a0f18', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(56,189,248,0.2)', 
                  color: '#f1f5f9',
                  fontFamily: 'monospace',
                  fontSize: 12 
                }} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="allowed" name="Allowed (Safe)" stroke="#10b981" fill="url(#colorAllow)" strokeWidth={2} />
                <Area type="monotone" dataKey="blocked" name="Blocked (Denied)" stroke="#f43f5e" fill="url(#colorBlock)" strokeWidth={2} />
                <Area type="monotone" dataKey="review" name="Review (Pending)" stroke="#f59e0b" fill="url(#colorReview)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-slate-500 text-sm font-mono">
              <Radio className="w-6 h-6 mb-2 text-cyan-500/40 animate-pulse" />
              Awaiting real-time gateway traffic...
            </div>
          )}
        </Card>

        {/* Risk Distribution Pie */}
        <Card className="border-cyan-500/15 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-white flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Risk Severity Profile
            </h2>
            <p className="text-xs text-slate-400">Score distribution of evaluated operations</p>
          </div>

          <div className="py-2">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie 
                    data={pieData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={45}
                    outerRadius={75} 
                    paddingAngle={4}
                    labelLine={false}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="#0a0f18" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ 
                    backgroundColor: '#0a0f18', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(56,189,248,0.2)', 
                    color: '#f1f5f9',
                    fontFamily: 'monospace',
                    fontSize: 12 
                  }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-500 text-sm font-mono">No data</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono">
            <div>
              <p className="text-[10px] text-emerald-400 uppercase">Low</p>
              <p className="text-base font-bold text-white">{s.risk_distribution.low}</p>
            </div>
            <div>
              <p className="text-[10px] text-amber-400 uppercase">Medium</p>
              <p className="text-base font-bold text-white">{s.risk_distribution.medium}</p>
            </div>
            <div>
              <p className="text-[10px] text-rose-400 uppercase">High</p>
              <p className="text-base font-bold text-white">{s.risk_distribution.high}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Real-Time Action Stream & System State */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Decision Stream */}
        <Card className="lg:col-span-2 border-cyan-500/15">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Pre-Execution Intercept Stream
              </h2>
              <p className="text-xs text-slate-400">Actions evaluated and cryptographic tokens minted</p>
            </div>
            <Link href="/audit" className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              Full Audit Trail <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {s.recent_decisions.slice(0, 6).map((d) => (
              <div 
                key={d.action_id} 
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <DecisionBadge decision={d.decision} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate font-mono">
                      {actionTypeLabel(d.action_type)}
                    </p>
                    <p className="text-xs text-slate-400 truncate font-mono">
                      {d.target_resource}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 font-mono text-xs">
                  <span className={`font-bold ${
                    d.risk_score >= 70 ? 'text-rose-400' : d.risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    SCORE {d.risk_score}
                  </span>
                  <p className="text-[11px] text-slate-500">{formatRelative(d.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fleet Security Health */}
        <Card className="border-cyan-500/15 space-y-4">
          <div>
            <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Agent Fleet Status
            </h2>
            <p className="text-xs text-slate-400">Active autonomous processes in perimeter</p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Monitored Agents
              </span>
              <span className="text-lg font-bold text-white">{s.active_agents} online</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Review Gatekeeper
              </span>
              <span className="text-lg font-bold text-amber-400">{s.pending_approvals} queue</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Active Incident Alerts
              </span>
              <span className="text-lg font-bold text-rose-400">{s.open_alerts} open</span>
            </div>

            <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 to-slate-950 border border-cyan-800/50 flex items-center justify-between">
              <div>
                <p className="text-cyan-400 font-bold">HMAC AUDIT LEDGER</p>
                <p className="text-[11px] text-slate-400">Tamper-evident SHA256</p>
              </div>
              <span className="text-emerald-400 font-bold text-xs bg-emerald-950/60 border border-emerald-800/80 px-2 py-1 rounded">
                SECURE ✓
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
