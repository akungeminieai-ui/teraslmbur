'use client';

import * as React from 'react';
import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppButton } from '@teras-lmbur/ui';
import { DateFormatter } from '@/services';

interface PosHeaderProps {
  activeShift: any;
  userName?: string;
  onCloseShift: () => void;
}

export function PosHeader({ activeShift, userName, onCloseShift }: PosHeaderProps) {
  const t = useTranslations('pos');

  return (
    <header className="flex h-14 w-full items-center justify-between border border-[var(--border)] bg-[var(--card)] px-6 shrink-0 rounded-2xl select-none shadow-sm">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-brand-500 fill-brand-500/10" />
        <h2 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
          Point of Sale Workspace
        </h2>
      </div>

      {/* Shift Info & Close Shift button */}
      <div className="flex items-center gap-4">
        {activeShift && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-[var(--foreground)]">
                {userName || activeShift.openedBy?.name || 'Cashier'}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]">
                {DateFormatter.format(activeShift.openedAt)}
              </p>
            </div>
            <AppButton
              variant="outline"
              size="sm"
              onClick={onCloseShift}
              className="text-xs font-semibold text-danger-500 border-danger-500/20 hover:bg-danger-500/10 hover:text-danger-400 cursor-pointer"
            >
              {t('closeShift') || 'Close Shift'}
            </AppButton>
          </div>
        )}
      </div>
    </header>
  );
}
