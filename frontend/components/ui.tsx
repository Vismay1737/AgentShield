'use client';
import { cn, decisionBg, riskBg, severityBg, riskBarColor } from '@/lib/utils';
import { Decision, RiskLevel, AlertSeverity } from '@/types/api';

export function DecisionBadge({ decision }: { decision: Decision }) {
  const dotColor = decision === 'ALLOW' ? 'bg-emerald-400' : decision === 'REVIEW' ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wide border',
      decisionBg(decision)
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
      {decision}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel | string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold tracking-wide border',
      riskBg(level)
    )}>
      {level}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity | string }) {
  const isCritical = severity === 'CRITICAL';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold tracking-wide border',
      severityBg(severity),
      isCritical && 'animate-pulse'
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {severity}
    </span>
  );
}

export function RiskScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-900/80 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <div
          className={cn('h-full rounded-full transition-all duration-500 shadow-sm', riskBarColor(score))}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-slate-300 w-8 text-right">{score}</span>
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'cyber-card rounded-2xl p-6 text-slate-200',
      className
    )}>
      {children}
    </div>
  );
}

export function StatCard({
  title, value, icon, trend, color = 'blue'
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
}) {
  const borderAccents = {
    blue: 'border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.08)]',
    green: 'border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.08)]',
    red: 'border-rose-500/30 hover:border-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.08)]',
    amber: 'border-amber-500/30 hover:border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.08)]',
    purple: 'border-purple-500/30 hover:border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.08)]',
  };

  const iconStyles = {
    blue: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    green: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    red: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
  };

  return (
    <div className={cn(
      'cyber-card rounded-2xl p-5 flex flex-col justify-between border transition-all duration-300',
      borderAccents[color]
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl', iconStyles[color])}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-extrabold tracking-tight text-white font-mono">{value}</p>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mt-1">{title}</p>
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={cn('animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]', sizes[size])} />
  );
}

export function EmptyState({ title, description, icon }: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center cyber-card rounded-2xl border border-dashed border-slate-800">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-xl animate-pulse" />
        <div className="relative text-cyan-400 p-4 bg-slate-900/80 rounded-2xl border border-cyan-500/20">
          {icon}
        </div>
      </div>
      <h3 className="text-slate-200 font-semibold text-lg">{title}</h3>
      <p className="text-slate-400 text-sm mt-1 max-w-sm">{description}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 cyber-card rounded-2xl border-rose-500/30">
      <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mb-3 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
        <span className="text-2xl">⚠</span>
      </div>
      <p className="text-slate-200 font-semibold">Telemetry Feed Interrupted</p>
      <p className="text-slate-400 text-sm mt-1">{message}</p>
    </div>
  );
}

export function Button({
  children, onClick, variant = 'primary', size = 'md', disabled = false, className
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'cyber';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}) {
  const variants = {
    primary: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400/40',
    cyber: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-300/40 font-semibold',
    secondary: 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-500',
    danger: 'bg-rose-600/90 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] border border-rose-400/40',
    success: 'bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/40',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]',
        variants[variant],
        sizes[size],
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {children}
    </button>
  );
}
