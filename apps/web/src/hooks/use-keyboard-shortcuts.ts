import { useEffect } from 'react';

interface ShortcutOptions {
  onNew?: () => void;
  onClose?: () => void;
  onSave?: () => void;
  onSearch?: () => void;
}

export function useKeyboardShortcuts({ onNew, onClose, onSave, onSearch }: ShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.hasAttribute('contenteditable'));

      // 1. Focus Search: Pressing '/' when not typing in any input field
      if (e.key === '/' && !isTyping) {
        if (onSearch) {
          e.preventDefault();
          onSearch();
        }
      }

      // 2. Escape: Close drawer
      if (e.key === 'Escape') {
        if (onClose) {
          onClose();
        }
      }

      // 3. Ctrl + N / Meta + N (Command + N): Open new drawer
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        if (onNew) {
          e.preventDefault();
          onNew();
        }
      }

      // 4. Ctrl + S / Meta + S (Command + S): Save drawer form
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (onSave) {
          e.preventDefault();
          onSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNew, onClose, onSave, onSearch]);
}
