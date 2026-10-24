'use client';
import { Card } from '@/components/ui';
import { Shield, Info, ExternalLink, Terminal, Cpu, Database, KeyRound } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 cyber-card rounded-2xl border-cyan-500/20 bg-gradient-to-r from-slate-950 via-[#0a1120] to-slate-950">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-mono">
                GATEWAY ARCHITECTURE & CONFIGURATION
              </h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                PROD-SPEC v2.1
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Active telemetry configurations, cryptographic parameters, and deployment boundaries
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-cyan-500/20 bg-slate-950/80 space-y-4 font-mono text-xs">
          <h2 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield className="w-4 h-4 text-cyan-400" /> Active Gateway Parameters
          </h2>
          <div className="space-y-3">
            <SettingRow label="Gateway REST API" value={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'} highlight />
            <SettingRow label="Real-time WebSocket" value={process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/ws'} highlight />
            <SettingRow label="Escrow Approval Window" value="24 Hours (HMAC Snapshot)" />
            <SettingRow label="Token TTL" value="600 seconds (Scoped Ephemeral Bearer)" />
            <SettingRow label="Anomaly Sliding Window" value="10 minutes (Burst Velocity Track)" />
            <SettingRow label="Audit Signing Algorithm" value="HMAC-SHA256 (Local Secret)" />
            <SettingRow label="Database Engine" value="SQLite via aiosqlite (Async ORM)" />
          </div>
        </Card>

        <Card className="border-cyan-500/20 bg-slate-950/80 space-y-4 text-xs font-mono">
          <h2 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Info className="w-4 h-4 text-cyan-400" /> System Design & Defense Guarantees
          </h2>
          <div className="space-y-3 text-slate-300 font-sans leading-relaxed">
            <p>
              <strong className="text-white font-mono">AgentShield</strong> acts as an air-gap security layer between autonomous LLM agents and critical enterprise tools (APIs, databases, file systems).
            </p>
            <p>
              Autonomous agents never receive direct raw credentials. If an action evaluates to <span className="font-mono text-emerald-400 font-bold">ALLOW</span>, the gateway issues a single-use, 10-minute scoped token valid only for the exact target resource requested.
            </p>

            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 font-mono text-xs text-amber-300">
              <strong className="text-amber-200">Production Defense Boundaries:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside text-[11px] text-slate-300">
                <li>All policy determinations are strictly evaluated server-side.</li>
                <li>Audit logs are immutable and tamper-evident via cryptographic hash chaining.</li>
                <li>Explicit block policies (e.g. destructive SQL purges) cannot be bypassed by any agent.</li>
              </ul>
            </div>

            <div className="flex gap-4 pt-2 border-t border-slate-800">
              <a 
                href="http://localhost:8000/docs" 
                target="_blank" 
                rel="noopener"
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-mono text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Swagger OpenAPI Docs
              </a>
              <a 
                href="http://localhost:8000/redoc" 
                target="_blank" 
                rel="noopener"
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-mono text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> ReDoc Specifications
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SettingRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 gap-1">
      <span className="text-slate-400">{label}</span>
      <span className={highlight ? 'text-cyan-300 font-bold truncate max-w-xs' : 'text-slate-200 truncate'}>
        {value}
      </span>
    </div>
  );
}
