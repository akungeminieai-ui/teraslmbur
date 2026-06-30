import { useState, useEffect } from 'react';

/**
 * React hook that tracks a CSS media query match.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    function listener(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
