'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@teras-lmbur/utils';
import { AppButton } from '@teras-lmbur/ui';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isDirty?: boolean; // Protects unsaved changes
}

export function FormDrawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  isDirty = false,
}: DrawerProps) {
  const [showDiscardConfirm, setShowDiscardConfirm] = React.useState(false);

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Keyboard shortcut listener inside drawer: Ctrl+Enter or Cmd+Enter to Save
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        // Trigger submit click on save buttons
        const saveButton = document.querySelector(
          '[role="dialog"] button[type="submit"], [role="dialog"] div.mt-4 button:not([variant="outline"]):last-child'
        ) as HTMLButtonElement;
        if (saveButton) {
          e.preventDefault();
          saveButton.click();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Listen for Enter / Escape key inside Discard Confirmation overlay
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showDiscardConfirm) {
        if (e.key === 'Enter') {
          e.preventDefault();
          setShowDiscardConfirm(false);
          onClose();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowDiscardConfirm(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDiscardConfirm, onClose]);

  // Auto Focus on the first form input when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const formElement = document.querySelector(
          '[role="dialog"] form input:not([type="hidden"]), [role="dialog"] form select, [role="dialog"] form textarea'
        ) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (formElement) {
          formElement.focus();
          if (formElement instanceof HTMLInputElement || formElement instanceof HTMLTextAreaElement) {
            formElement.select();
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <>
      <DialogPrimitive.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleAttemptClose();
          }
        }}
      >
        <DialogPrimitive.Portal>
          {/* Overlay backdrop */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in" />

          {/* Content panel */}
          <DialogPrimitive.Content
            onPointerDownOutside={(e) => {
              if (isDirty) {
                e.preventDefault();
                setShowDiscardConfirm(true);
              }
            }}
            onEscapeKeyDown={(e) => {
              if (isDirty) {
                e.preventDefault();
                setShowDiscardConfirm(true);
              }
            }}
            className={cn(
              'fixed bottom-0 right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl transition-transform duration-300 focus:outline-none sm:max-w-lg',
              'animate-slide-in'
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--border)]/40 pb-4">
              <div className="space-y-1">
                <DialogPrimitive.Title className="text-lg font-bold text-[var(--foreground)]">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="text-xs text-[var(--muted-foreground)]">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <button
                type="button"
                onClick={handleAttemptClose}
                className="rounded-lg p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form scroll content */}
            <div className="mt-4 flex-1 overflow-y-auto px-1">{children}</div>

            {/* Footer actions */}
            {footer && (
              <div className="mt-4 border-t border-[var(--border)]/40 pt-4 flex items-center justify-end gap-3 bg-[var(--card)]">
                {footer}
              </div>
            )}

            {/* Discard Confirmation Dialog inside trap */}
            {showDiscardConfirm && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in text-[var(--foreground)]">
                <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl animate-scale-in">
                  <h4 className="text-base font-bold">Discard changes?</h4>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)] font-medium">
                    You have unsaved changes. Are you sure you want to discard them?
                  </p>
                  <div className="mt-5 flex items-center justify-end gap-2.5">
                    <AppButton
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDiscardConfirm(false)}
                      className="h-9 py-1 px-3"
                    >
                      Cancel
                    </AppButton>
                    <AppButton
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setShowDiscardConfirm(false);
                        onClose();
                      }}
                      className="h-9 py-1 px-3"
                    >
                      Discard
                    </AppButton>
                  </div>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
