import { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

/** Fullscreen toggle used in every top bar (hidden where the browser has no fullscreen API, e.g. iPhone). */
export function FullscreenButton({ className = '' }: { className?: string }) {
  const [full, setFull] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    const f = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  if (typeof document === 'undefined' || !document.fullscreenEnabled) return null;
  const toggle = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.();
    } catch {
      /* not supported */
    }
  };
  return (
    <button type="button" data-cursor="link" data-sound="toggle" onClick={toggle} className={'press h-9 w-9 grid place-items-center rounded-full hover:bg-[var(--hover-fill)] ' + className} aria-label={full ? 'Exit fullscreen' : 'Fullscreen'} title={full ? 'Exit fullscreen' : 'Fullscreen'}>
      {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  );
}
