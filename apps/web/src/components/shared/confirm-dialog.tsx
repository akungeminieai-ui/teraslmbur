'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, Trash2, Check, X } from 'lucide-react';
import { AppButton } from '@teras-lmbur/ui';
import { useTranslations } from 'next-intl';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'delete' | 'warning' | 'success';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  type = 'warning',
}: ConfirmDialogProps) {
  const tCommon = useTranslations('common');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onClose]);

  const config = {
    delete: {
      icon: Trash2,
      colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      btnVariant: 'danger' as const,
      defaultConfirmText: tCommon('buttons.delete') || 'Delete',
    },
    warning: {
      icon: AlertTriangle,
      colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      btnVariant: 'primary' as const,
      defaultConfirmText: tCommon('buttons.save') || 'Confirm',
    },
    success: {
      icon: Check,
      colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      btnVariant: 'primary' as const,
      defaultConfirmText: 'OK',
    },
  };

  const current = config[type];
  const Icon = current.icon;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl focus:outline-none animate-scale-in">
          <div className="flex gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${current.colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1 flex-1">
              <DialogPrimitive.Title className="text-base font-semibold text-[var(--foreground)]">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-[var(--muted-foreground)]">
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-lg p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus:outline-none self-start">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <AppButton variant="outline" size="sm" onClick={onClose}>
              {cancelText || tCommon('buttons.cancel') || 'Cancel'}
            </AppButton>
            <AppButton
              variant={current.btnVariant}
              size="sm"
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmText || current.defaultConfirmText}
            </AppButton>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
