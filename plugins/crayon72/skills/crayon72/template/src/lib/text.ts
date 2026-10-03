import { isValidElement, type ReactNode } from 'react';

/** Flatten a ReactNode tree to plain text (for search). */
export function nodeText(n: ReactNode): string {
  if (n == null || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(nodeText).join(' ');
  if (isValidElement(n)) {
    const p = n.props as { children?: ReactNode };
    return nodeText(p.children);
  }
  return '';
}

export function norm(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s.-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Simple ranked match: all query tokens must appear (prefix / substring); title hits weigh more. */
export function score(q: string, fields: { text: string; w: number }[]) {
  const toks = norm(q).split(' ').filter(Boolean);
  if (!toks.length) return 0;
  let total = 0;
  for (const t of toks) {
    let best = 0;
    for (const f of fields) {
      const i = f.text.indexOf(t);
      if (i >= 0) best = Math.max(best, f.w * (i === 0 || f.text[i - 1] === ' ' ? 2 : 1));
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}
