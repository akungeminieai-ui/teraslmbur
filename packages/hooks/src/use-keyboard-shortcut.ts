import { useEffect, useCallback } from 'react';

type KeyCombo = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
};

/**
 * Register a keyboard shortcut handler.
 * Supports modifier keys (Ctrl, Meta/Cmd, Shift, Alt).
 */
export function useKeyboardShortcut(
  combo: KeyCombo,
  callback: (e: KeyboardEvent) => void,
  enabled: boolean = true,
): void {
  const handler = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const matchesKey = event.key.toLowerCase() === combo.key.toLowerCase();
      const matchesCtrl = combo.ctrl ? event.ctrlKey : !event.ctrlKey;
      const matchesMeta = combo.meta ? event.metaKey : !event.metaKey;
      const matchesShift = combo.shift ? event.shiftKey : !event.shiftKey;
      const matchesAlt = combo.alt ? event.altKey : !event.altKey;

      if (matchesKey && matchesCtrl && matchesMeta && matchesShift && matchesAlt) {
        event.preventDefault();
        callback(event);
      }
    },
    [combo, callback, enabled],
  );

  useEffect(() => {
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler]);
}
