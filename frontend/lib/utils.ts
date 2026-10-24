import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Decision, RiskLevel, AlertSeverity } from '@/types/api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function decisionColor(decision: Decision): string {
  return {
    ALLOW: 'text-emerald-400',
    REVIEW: 'text-amber-400',
    BLOCK: 'text-rose-400',
  }[decision] ?? 'text-slate-400';
}

export function decisionBg(decision: Decision): string {
  return {
    ALLOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    REVIEW: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    BLOCK: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]',
  }[decision] ?? 'bg-slate-800 text-slate-300 border-slate-700';
}

export function riskBg(level: RiskLevel | string): string {
  return {
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HIGH: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  }[level] ?? 'bg-slate-800 text-slate-300 border-slate-700';
}

export function severityBg(severity: AlertSeverity | string): string {
  return {
    LOW: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HIGH: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
    CRITICAL: 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.25)]',
  }[severity] ?? 'bg-slate-800 text-slate-300 border-slate-700';
}

export function riskBarColor(score: number): string {
  if (score < 30) return 'bg-gradient-to-r from-emerald-500 to-teal-400';
  if (score < 70) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
  return 'bg-gradient-to-r from-rose-500 to-red-600';
}

export function actionTypeLabel(type: string): string {
  return {
    read_report: 'Read Report',
    read_file: 'Read File',
    query_database: 'Query Database',
    send_email: 'Send Email',
    execute_command: 'Execute Command',
    sensitive_operation: 'Sensitive Operation',
    grant_permission: 'Grant Permission',
    deploy_service: 'Deploy Service',
    delete: 'Delete Resource',
    drop_database: 'Drop Database',
  }[type] ?? type;
}
