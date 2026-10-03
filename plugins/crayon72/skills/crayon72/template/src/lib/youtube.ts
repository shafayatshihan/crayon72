// Opening YouTube from an offline (file://) page.
// Embeds are refused there (YouTube Error 153: no referrer), so we hand the video to:
//  • Android  → the YouTube app (intent URL, falls back to the browser)
//  • iPhone / iPad → the YouTube app (youtube:// scheme, falls back to the browser)
//  • Desktop  → ONE reusable browser window docked to the left half of the screen
export interface YtVideo {
  id: string;
  start?: number;
}

/** Not a real web origin: file://, content:// (Android file managers), blob:, or an opaque 'null' origin. */
export const IS_LOCAL = typeof location !== 'undefined' && (!/^https?:$/.test(location.protocol) || location.origin === 'null');

export function platform(): 'android' | 'ios' | 'desktop' {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  // Chrome “Desktop site” on Android reports Linux x86 — a touch-first Linux browser is a phone/tablet
  if (/Linux/i.test(ua) && !/Windows|CrOS/i.test(ua) && navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  return 'desktop';
}

let win: Window | null = null;
let last = 0;
let lastId = '';
let lastAt = 0;

/** Returns 'opened' | 'duplicate' | 'ignored'. */
export function openYouTube(v: YtVideo): 'opened' | 'duplicate' | 'ignored' {
  const now = Date.now();
  if (now - last < 1200) return 'ignored'; // ignore double / triple taps
  last = now;
  // YouTube's Cross-Origin-Opener-Policy cuts our link to its window, so we can't reuse it —
  // a repeat click on the same video within 20 s is treated as a duplicate.
  if (platform() === 'desktop' && v.id === lastId && now - lastAt < 20000) return 'duplicate';
  lastId = v.id;
  lastAt = now;
  const t = v.start ? Math.round(v.start) : 0;
  const web = `https://www.youtube.com/watch?v=${v.id}${t ? `&t=${t}s` : ''}`;
  const p = platform();

  if (p === 'android') {
    const intent = `intent://www.youtube.com/watch?v=${v.id}${t ? `&t=${t}` : ''}#Intent;scheme=https;package=com.google.android.youtube;end`;
    window.location.href = intent;
    // no YouTube app → open the browser in a NEW tab (never replace the study app)
    window.setTimeout(() => {
      if (!document.hidden) window.open(web, '_blank');
    }, 1600);
    return 'opened';
  }
  if (p === 'ios') {
    const app = `youtube://www.youtube.com/watch?v=${v.id}${t ? `&t=${t}` : ''}`;
    const fallback = window.setTimeout(() => {
      if (!document.hidden) window.open(web, '_blank');
    }, 2500);
    const cancel = () => {
      if (document.hidden) window.clearTimeout(fallback);
    };
    document.addEventListener('visibilitychange', cancel, { once: true });
    window.location.href = app;
    return 'opened';
  }

  // desktop — one named window: the browser reuses it for every video
  const w = Math.round(window.screen.availWidth / 2);
  const h = window.screen.availHeight;
  if (win && !win.closed) {
    try {
      win.location.href = web;
      win.focus();
      return 'opened';
    } catch {
      /* fall through to named open */
    }
  }
  win = window.open(web, 'crayon72-video', `popup=yes,left=0,top=0,width=${w},height=${h}`);
  try {
    win?.focus();
  } catch {
    /* ignore */
  }
  return 'opened';
}
