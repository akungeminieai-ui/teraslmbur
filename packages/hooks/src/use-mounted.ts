import { useState, useEffect } from 'react';

/**
 * Returns true after the component has mounted.
 * Useful for avoiding hydration mismatches.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
