import katex from 'katex';
import 'katex/dist/katex.min.css';
import { memo } from 'react';

function render(src: string, display: boolean) {
  try {
    return katex.renderToString(src, { displayMode: display, throwOnError: false, strict: false });
  } catch {
    return src;
  }
}

/** Inline math */
export const M = memo(function M({ children }: { children: string }) {
  return <span dangerouslySetInnerHTML={{ __html: render(children, false) }} />;
});

/** Display math */
export const MB = memo(function MB({ children }: { children: string }) {
  return <div dangerouslySetInnerHTML={{ __html: render(children, true) }} />;
});
