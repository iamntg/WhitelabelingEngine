import { FONT_PAIRINGS } from '@wl/theme';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { StyleSheet } from 'react-native';
import { PHONE_CONTAINER_CSS, PHONE_HEIGHT, PHONE_WIDTH } from './PhoneApp.jsx';

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

/**
 * No icon webfont. The preview used to load Material Symbols and switch the
 * active tab with the variable `FILL` axis — neither of which a phone can do,
 * so `@wl/ui` draws its icons as SVG paths and both hosts get the same glyph
 * in the same state.
 */
export function skeleton(): string {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${googleFontsHref()}">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
  body { -webkit-font-smoothing: antialiased; }
  /* Shared with the proof-sheet script — see PHONE_CONTAINER_CSS for why the
     flex container is load-bearing rather than cosmetic. */
  #preview-root { ${PHONE_CONTAINER_CSS} }
</style>
</head><body><div id="preview-root"></div></body></html>`;
}

/**
 * `getSheet` is react-native-web's server-rendering escape hatch, and is not on
 * the `react-native` type surface the shared library is written against. This
 * file is the web host, so reaching for it here is legitimate — the cast is
 * only because the alias that makes it exist is a build-time fact.
 */
const webStyleSheet = StyleSheet as unknown as {
  getSheet: () => { id: string; textContent: string };
};

/**
 * Copies react-native-web's generated stylesheet into the iframe.
 *
 * react-native-web turns styles into atomic CSS classes and injects them into
 * the document *it* was imported into — the admin document. The preview is a
 * React portal into a separate iframe document, so every `View` inside arrives
 * carrying class names that mean nothing there, and the phone renders as a
 * column of unstyled text.
 *
 * The registry only grows, and new rules are registered during render, so
 * re-syncing after every render with no dependency array is both correct and
 * cheap: the common case is a string comparison that finds nothing to do.
 */
function useReactNativeWebStyles(mount: HTMLElement | null) {
  useEffect(() => {
    const doc = mount?.ownerDocument;
    if (!doc) return;

    const { id, textContent } = webStyleSheet.getSheet();
    let node = doc.getElementById(id);

    if (!node) {
      node = doc.createElement('style');
      node.id = id;
      doc.head.appendChild(node);
    }

    if (node.textContent !== textContent) node.textContent = textContent;
  });
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

  useReactNativeWebStyles(mount);

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
          // Sized from the constants rather than Tailwind literals: `@wl/ui`
          // lays out against the width the host declares, so an iframe that
          // disagreed with `PHONE_WIDTH` would resolve the card grid to a
          // column width the frame cannot hold.
          style={{ height: PHONE_HEIGHT, width: PHONE_WIDTH }}
          className="rounded-[38px] border-0"
        />
        {mount ? createPortal(children, mount) : null}
      </div>
      <div className="mt-4 font-mono text-11-5 text-ink-faint">{label}</div>
    </div>
  );
}
