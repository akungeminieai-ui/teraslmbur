/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ChevronRight, ChevronDown, Clock, Monitor } from 'lucide-react';
import { Skeleton } from './loading-skeleton';
import { cn } from '@teras-lmbur/utils';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  userId: string;
  createdAt: string;
  user?: { name: string; email: string } | null;
}

interface AuditTimelineProps {
  resource: string;
  resourceId: string;
}

export function AuditTimeline({ resource, resourceId }: AuditTimelineProps) {
  // Query timeline lazily (on component mount)
  const { data, isLoading, error } = useQuery<AuditLog[]>({
    queryKey: ['audit-timeline', resource, resourceId],
    queryFn: () => apiClient.get<AuditLog[]>(`/audit/timeline?resource=${resource}&resourceId=${resourceId}`),
    enabled: !!resourceId,
  });

  const timelineLogs = data || [];

  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="flex gap-3 animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--border)] mt-1.5 shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 text-xs text-danger-500 bg-danger-500/10 border border-danger-500/20 rounded-lg">
        Failed to load history logs.
      </div>
    );
  }

  if (timelineLogs.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-[var(--muted-foreground)]">
        No history records found for this entity.
      </div>
    );
  }

  return (
    <div className="space-y-5 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-[var(--border)]/60">
      {timelineLogs.map((log) => (
        <TimelineItem key={log.id} log={log} />
      ))}
    </div>
  );
}

function TimelineItem({ log }: { log: AuditLog }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Date Formatting
  const dateStr = React.useMemo(() => {
    const d = new Date(log.createdAt);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [log.createdAt]);

  const timeStr = React.useMemo(() => {
    const d = new Date(log.createdAt);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }, [log.createdAt]);

  // Colored Action Indicators
  const badgeConfig = React.useMemo(() => {
    const act = log.action.toLowerCase();
    if (act.includes('create')) {
      return { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', label: 'Created' };
    }
    if (act.includes('duplicate')) {
      return { color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400', label: 'Duplicated' };
    }
    if (act.includes('delete')) {
      return { color: 'bg-rose-500/15 text-rose-400 border-rose-500/30', dot: 'bg-rose-400', label: 'Deleted' };
    }
    if (act.includes('activate')) {
      return { color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400', label: 'Activated' };
    }
    if (act.includes('deactivate')) {
      return { color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30', dot: 'bg-zinc-400', label: 'Deactivated' };
    }
    return { color: 'bg-sky-500/15 text-sky-400 border-sky-500/30', dot: 'bg-sky-400', label: 'Updated' };
  }, [log.action]);

  // Diff Generator (Highlight key field shifts)
  const diffs = React.useMemo(() => {
    if (!log.oldValue || !log.newValue) return [];
    const keys = Array.from(new Set([...Object.keys(log.oldValue), ...Object.keys(log.newValue)]));
    const result: { key: string; old: any; new: any }[] = [];

    for (const key of keys) {
      // Ignore timestamp noise
      if (['updatedAt', 'createdAt', 'deletedAt'].includes(key)) continue;

      const oldVal = log.oldValue[key];
      const newVal = log.newValue[key];

      // Compare translations specifically
      if (key === 'translations' && Array.isArray(oldVal) && Array.isArray(newVal)) {
        const transDiffs = newVal.map((nTrans) => {
          const oTrans = oldVal.find((o) => o.locale === nTrans.locale);
          if (!oTrans || oTrans.name !== nTrans.name) {
            return {
              key: `Name (${nTrans.locale.toUpperCase()})`,
              old: oTrans?.name || '—',
              new: nTrans.name,
            };
          }
          return null;
        }).filter(Boolean);
        result.push(...(transDiffs as any));
        continue;
      }

      // Stringify complex nested properties
      const oldStr = typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? '');
      const newStr = typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? '');

      if (oldStr !== newStr) {
        result.push({
          key,
          old: oldVal ?? '—',
          new: newVal ?? '—',
        });
      }
    }
    return result;
  }, [log.oldValue, log.newValue]);

  const hasDiffData = diffs.length > 0;

  return (
    <div className="relative group select-none">
      {/* Outer Timeline Dot Indicator */}
      <div className={cn("absolute -left-[20px] top-1.5 w-2.5 h-2.5 rounded-full border border-[var(--card)] z-10 transition-all", badgeConfig.dot)} />

      {/* Main Container */}
      <div className="space-y-1.5">
        {/* Header Details */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase transition-colors", badgeConfig.color)}>
              {badgeConfig.label}
            </span>
            <span className="text-xs text-[var(--foreground)] font-semibold">
              {log.user?.name || 'System Operator'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)] font-mono">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {dateStr} {timeStr}
            </span>
            {log.device && (
              <span className="flex items-center gap-0.5">
                <Monitor className="h-3 w-3" />
                {log.device}
              </span>
            )}
          </div>
        </div>

        {/* Action Description Summary */}
        <p className="text-xs text-[var(--muted-foreground)] font-semibold">
          Executed action &ldquo;{log.action}&rdquo; on {log.resource} ID: <span className="font-mono text-[10px]">{log.resourceId.slice(0, 8)}</span>
        </p>

        {/* Change Differences Display */}
        {hasDiffData && (
          <div className="mt-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-[10px] font-bold text-brand-500 hover:text-brand-400 cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Hide Changes
                </>
              ) : (
                <>
                  <ChevronRight className="h-3 w-3" />
                  Show Changes ({diffs.length})
                </>
              )}
            </button>

            {isExpanded && (
              <div className="mt-1.5 rounded-lg border border-[var(--border)]/50 bg-[var(--accent)]/10 p-2 text-xs divide-y divide-[var(--border)]/20 animate-fade-in font-medium">
                {diffs.map((diff, index) => (
                  <div key={index} className="py-1 first:pt-0 last:pb-0 flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{diff.key}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono bg-danger-500/10 text-danger-400 px-1 rounded truncate max-w-[150px]">{String(diff.old)}</span>
                      <span className="text-[var(--muted-foreground)]">&rarr;</span>
                      <span className="font-mono bg-emerald-500/10 text-emerald-400 px-1 rounded truncate max-w-[150px]">{String(diff.new)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
