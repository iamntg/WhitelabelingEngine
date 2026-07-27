import { FONT_PAIRINGS } from '@wl/theme';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * The phone preview renders inside an iframe.
 *
 * The spec allows "an iframe or a strictly scoped container", and a scoped
 * container is not actually sufficient: `font-family` inherits, `::selection`
 * is document-global, and the preview loads seven typefaces the tool never
 * uses. A same-origin iframe gives a genuinely separate document — brand styles
 * cannot leak into the chrome, and the chrome's Inter cannot leak into the
 * preview and quietly make a wrong font look right.
 *
 * Same-origin is deliberate: React portals into the iframe's document, so the
 * preview is one React tree with the editor and re-renders on every keystroke,
 * with no postMessage bridge to keep in sync.
 */

/** Built from the registry so the preview can never load a stale font set. */
function googleFontsHref(): string {
  const weights = new Map<string, Set<number>>();

  const add = (family: string, weight: number) => {
    const existing = weights.get(family) ?? new Set<number>();
    existing.add(weight);
    weights.set(family, existing);
  };

  for (const pairing of FONT_PAIRINGS) {
    add(pairing.display.family, pairing.display.weight);
    for (const weight of [
      pairing.body.regular,
      pairing.body.medium,
      pairing.body.semibold,
      pairing.body.bold,
    ]) {
      add(pairing.body.family, weight);
    }
  }

  const families = [...weights.entries()]
    .map(([family, set]) => {
      const list = [...set].sort((a, b) => a - b).join(';');
      return `family=${family.replace(/ /g, '+')}:wght@${list}`;
    })
    .join('&');

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

const ICON_HREF =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..600,0..1,0&display=block';

function skeleton(): string {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${googleFontsHref()}">
<link rel="stylesheet" href="${ICON_HREF}">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
  body { -webkit-font-smoothing: antialiased; }
  #preview-root { height: 100%; }
  .icon {
    font-family: 'Material Symbols Rounded';
    font-weight: normal; font-style: normal; line-height: 1;
    letter-spacing: normal; text-transform: none; display: inline-block;
    white-space: nowrap; word-wrap: normal; direction: ltr;
    -webkit-font-feature-settings: 'liga'; font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
  }
</style>
</head><body><div id="preview-root"></div></body></html>`;
}

export function PhoneFrame({
  children,
  label,
  title,
}: {
  children: ReactNode;
  /** Mono caption under the device, e.g. "iPhone 15 · 393 × 852 · light". */
  label: string;
  title: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);

  // srcDoc plus onLoad rather than document.write: it survives StrictMode's
  // double-invoked effects, which document.write does not.
  useEffect(() => {
    const attach = () => {
      const root = frameRef.current?.contentDocument?.getElementById('preview-root');
      if (root) setMount(root);
    };
    attach();
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-[46px] bg-bezel p-[9px] shadow-phone">
        <iframe
          ref={frameRef}
          title={title}
          srcDoc={skeleton()}
          onLoad={() => {
            const root = frameRef.current?.contentDocument?.getElementById('preview-root');
            if (root) setMount(root);
          }}
          className="h-[764px] w-[372px] rounded-[38px] border-0"
        />
        {mount ? createPortal(children, mount) : null}
      </div>
      <div className="mt-4 font-mono text-11-5 text-ink-faint">{label}</div>
    </div>
  );
}
