import { useEffect, useRef } from 'react';

/**
 * Detect clicks outside of a referenced element.
 */
export function useClickOutside<T extends HTMLElement>(
  callback: () => void,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [callback]);

  return ref;
}
