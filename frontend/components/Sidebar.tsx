'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Activity, AlertTriangle, CheckSquare,
  FileText, Shield, Settings, Wifi, WifiOff, Zap, Radio
} from 'lucide-react';
import { useWS } from '@/lib/ws-context';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Overview SOC', icon: LayoutDashboard },
  { href: '/alerts', label: 'Security Alerts', icon: AlertTriangle, badge: 'Live' },
  { href: '/approvals', label: 'Approval Queue', icon: CheckSquare },
  { href: '/agents', label: 'Agent Fleet', icon: Activity },
  { href: '/audit', label: 'Audit Trail', icon: FileText },
  { href: '/policies', label: 'Firewall Rules', icon: Shield },
  { href: '/demo', label: 'Attack Simulator', icon: Zap },
  { href: '/settings', label: 'Gateway Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { connected } = useWS();

  return (
    <aside className="w-64 min-h-screen bg-[#070b12]/95 border-r border-slate-800/80 flex flex-col backdrop-blur-xl z-20">
      {/* Brand & Defense Status */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-300/40">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-white text-base tracking-tight font-mono">AgentShield</h1>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/80">v2.1</span>
            </div>
            <p className="text-[11px] text-cyan-400/80 font-mono tracking-wider uppercase flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              AI Immune System
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1.5">
        <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-500">
          Command Center
        </div>
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                active
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 hover:border hover:border-slate-800'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn(
                  'w-4 h-4 transition-transform group-hover:scale-110',
                  active ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-slate-500 group-hover:text-slate-300'
                )} />
                <span>{label}</span>
              </div>
              {badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Perimeter Telemetry Feed */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="mb-3 px-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Radio className="w-3 h-3 animate-spin" /> Perimeter Shield
            </span>
            <span className="text-emerald-400 font-bold">100% OK</span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-400 w-full animate-pulse" />
          </div>
        </div>

        <div className={cn(
          'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono font-medium border transition-colors',
          connected
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        )}>
          <span className="flex items-center gap-2">
            {connected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>TELEMETRY LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span>RECONNECTING</span>
              </>
            )}
          </span>
          <span className="w-2 h-2 rounded-full bg-current animate-ping" />
        </div>

        <div className="mt-2.5 px-1 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>ROLE: SEC_ADMIN</span>
          <span>CLUSTER: US-01</span>
        </div>
      </div>
    </aside>
  );
}
