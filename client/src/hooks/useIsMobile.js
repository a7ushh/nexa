import { useEffect, useState } from 'react';

/**
 * steps.md: "if anyone open in mobile it shows android UI". The Android frames
 * are 412px wide, so the switch happens at the usual tablet edge.
 */
const QUERY = '(max-width: 767px)';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = (event) => setIsMobile(event.matches);
    media.addEventListener('change', onChange);
    setIsMobile(media.matches);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
