import type { SampleContent } from '@wl/api-client';
import type { ReactElement } from 'react';

/**
 * Line illustrations for the preview's image slots.
 *
 * The design rule stands: the preview never fakes photography, because a stock
 * photo flatters the theme and hides the contrast problems the owner needs to
 * see. But a grey striped rectangle reads as "broken", not as "your dish photo
 * goes here" — the owner spends the first look wondering what failed to load.
 *
 * These sit in between: monochrome line art drawn in `theme.placeholder.ink`
 * over `theme.placeholder.fill`, both brand-independent by design, so the slot
 * says what the image will be without inventing a colour the owner never chose.
 * The honest size label ("dish photo 1000×1000") still sits on top of it.
 *
 * The motif follows the vertical — a place setting and a cloche for a
 * restaurant, shears and a mirror for a salon, a rolled mat and a seated figure
 * for a studio — and an item takes the one at its position in the payload. That
 * makes the neighbours in a list differ, and makes an item draw the same thing
 * wherever it appears: its row in the catalogue, its card on the home screen
 * and its detail screen all show one dish.
 */

type Vertical = SampleContent['vertical'];

/** Stroke weight in user units that renders at roughly `strokePx` on screen. */
function strokeWidth(viewBoxSize: number, renderedPx: number): number {
  const strokePx = 1.7 + renderedPx / 220;
  return (strokePx * viewBoxSize) / renderedPx;
}

/* ---------------------------------------------------------------- item art */

const PLATE = (
  <>
    <circle cx="24" cy="24" r="10.5" />
    <circle cx="24" cy="24" r="6" opacity="0.45" />
    <path d="M8 10v7a2.5 2.5 0 005 0v-7" />
    <path d="M10.5 19.5V38" />
    <path d="M39 10c2.6 2 2.6 7.4 0 9.4V38" />
  </>
);

const BOWL = (
  <>
    <path d="M7 25c0 9.4 7.6 17 17 17s17-7.6 17-17z" />
    <path d="M4 25h40" />
    <path d="M19 20c-3-3 3-6 0-9" opacity="0.5" />
    <path d="M29 20c-3-3 3-6 0-9" opacity="0.5" />
  </>
);

const WEDGE = (
  <>
    <path d="M24 7l15.5 30a2 2 0 01-1.8 2.9H10.3a2 2 0 01-1.8-2.9z" />
    <path d="M14 31.5h20" opacity="0.45" />
    <circle cx="24" cy="19" r="2" fill="currentColor" stroke="none" opacity="0.55" />
    <circle cx="19" cy="26.5" r="1.8" fill="currentColor" stroke="none" opacity="0.55" />
    <circle cx="29.5" cy="26.5" r="1.8" fill="currentColor" stroke="none" opacity="0.55" />
  </>
);

const GLASS = (
  <>
    <path d="M14 9h20l-2.6 28.5a3 3 0 01-3 2.7h-8.8a3 3 0 01-3-2.7z" />
    <path d="M15.6 19h16.8" opacity="0.45" />
  </>
);

const CLOCHE = (
  <>
    <path d="M8 34a16 16 0 0132 0z" />
    <path d="M5 34h38" />
    <circle cx="24" cy="15" r="2.4" />
  </>
);

const SHEARS = (
  <>
    <path d="M15 8l17 25" />
    <path d="M33 8L16 33" />
    <circle cx="14" cy="37" r="5" />
    <circle cx="34" cy="37" r="5" />
  </>
);

const BOTTLE = (
  <>
    <path d="M20 8h8v5h-8z" />
    <path d="M16 13h16a3 3 0 013 3v20a4 4 0 01-4 4H17a4 4 0 01-4-4V16a3 3 0 013-3z" />
    <path d="M18.5 24h11" opacity="0.45" />
  </>
);

const COMB = (
  <>
    <rect x="7" y="13" width="34" height="7" rx="2.5" />
    <path d="M11 20v11M17 20v13M23 20v11M29 20v13M35 20v11" opacity="0.5" />
  </>
);

const DROPLET = (
  <>
    <path d="M24 7s-11 12.6-11 20a11 11 0 0022 0c0-7.4-11-20-11-20z" />
    <path d="M19 28.5c0 3 2.2 5.4 5 5.9" opacity="0.45" />
  </>
);

const MIRROR = (
  <>
    <rect x="11" y="5" width="24" height="30" rx="12" />
    <path d="M17 28L30 11" opacity="0.4" />
    <path d="M23 35v6" />
    <path d="M16 41h14" />
  </>
);

/** A rolled mat, with the last of it still unrolled across the floor. */
const MAT = (
  <>
    <path d="M14 13h12a9 9 0 010 18H14" />
    <circle cx="14" cy="22" r="9" />
    <path d="M14 17a5 5 0 105 5" opacity="0.5" />
    <path d="M25 31c4 4 8 6.5 12 7.5h5" />
  </>
);

/** Seated, legs folded: the arms run down to the knees, the legs read as a lens. */
const FIGURE = (
  <>
    <circle cx="24" cy="10" r="5.5" />
    <path d="M24 17c-5.5 0-9.5 4.5-10.5 10" />
    <path d="M24 17c5.5 0 9.5 4.5 10.5 10" />
    <path d="M11 32c3.5-3.5 8-5.5 13-5.5s9.5 2 13 5.5" />
    <path d="M11 32c3.5 4 8 6 13 6s9.5-2 13-6" />
  </>
);

const DUMBBELL = (
  <>
    <path d="M15 24h18" />
    <rect x="7" y="17" width="8" height="14" rx="2.5" />
    <rect x="33" y="17" width="8" height="14" rx="2.5" />
    <path d="M4 21v6M44 21v6" opacity="0.5" />
  </>
);

const FLASK = (
  <>
    <path d="M21 7h6v4h-6z" />
    <path d="M18 11h12a4 4 0 014 4v22a4 4 0 01-4 4H18a4 4 0 01-4-4V15a4 4 0 014-4z" />
    <path d="M16 22h16" opacity="0.45" />
  </>
);

const CLOCK = (
  <>
    <circle cx="24" cy="25" r="15" />
    <path d="M24 16v9l6 4" />
    <path d="M18 7h12" opacity="0.5" />
  </>
);

const FRAME = (
  <>
    <rect x="7" y="10" width="34" height="28" rx="3" />
    <path d="M10 33l8-9 5.5 5.5 5-4.5L38 34" />
    <circle cx="31" cy="18" r="3" opacity="0.5" />
  </>
);

const ITEM_MOTIFS: Record<Vertical, readonly ReactElement[]> = {
  restaurant: [PLATE, BOWL, WEDGE, GLASS, CLOCHE],
  salon: [SHEARS, BOTTLE, COMB, DROPLET, MIRROR],
  studio: [MAT, FIGURE, DUMBBELL, FLASK, CLOCK],
};

/* ---------------------------------------------------------------- hero art */

const HERO_TABLE = (
  <>
    <path d="M4 50h88" opacity="0.3" />
    <circle cx="48" cy="34" r="15" />
    <circle cx="48" cy="34" r="9.5" opacity="0.45" />
    <path d="M43 34.5c1.6-2.6 4-3.6 6.4-2.6 2 .9 3.2 2.7 3.6 4.7" opacity="0.45" />
    <path d="M25 18v6a3 3 0 006 0v-6" />
    <path d="M28 27v23" />
    <path d="M68 18c3.4 2.4 3.4 9 0 11.4V50" />
    <path d="M6 33c0 7.7 3.8 14 8.5 14S23 40.7 23 33z" />
    <path d="M4 33h21" />
    <path d="M11 27.5c1.8-1.6-1.8-3.4 0-5" opacity="0.5" />
    <path d="M17.5 27.5c1.8-1.6-1.8-3.4 0-5" opacity="0.5" />
    <path d="M76 21h14l-1.8 26.2a3 3 0 01-3 2.8h-4.4a3 3 0 01-3-2.8z" />
    <path d="M77.4 30h11.2" opacity="0.45" />
  </>
);

const HERO_STATION = (
  <>
    <path d="M4 50h88" opacity="0.3" />
    <rect x="8" y="6" width="30" height="36" rx="14" />
    <path d="M15 34L28 13" opacity="0.35" />
    <path d="M23 42v8" />
    <path d="M51 22h6v4h-6z" />
    <path d="M48 26h12v20a4 4 0 01-4 4h-4a4 4 0 01-4-4z" />
    <path d="M49.5 34h9" opacity="0.45" />
    <path d="M67 30h4v3h-4z" />
    <path d="M64 33h10v13a4 4 0 01-4 4h-2a4 4 0 01-4-4z" />
    <path d="M84 10v8" opacity="0.4" />
    <path d="M78 18l8 11" />
    <path d="M87 18l-8 11" />
    <circle cx="77.5" cy="31.5" r="2.6" />
    <circle cx="87.5" cy="31.5" r="2.6" />
  </>
);

const HERO_STUDIO = (
  <>
    <path d="M4 50h88" opacity="0.3" />
    <path d="M18 30h12a10 10 0 010 20H18" />
    <circle cx="18" cy="40" r="10" />
    <path d="M18 34.5a5.5 5.5 0 105.5 5.5" opacity="0.5" />
    <circle cx="56" cy="15" r="6" />
    <path d="M56 21c-6 0-10.5 5-11.5 11" />
    <path d="M56 21c6 0 10.5 5 11.5 11" />
    <path d="M42 42c4-4 8.5-6 14-6s10 2 14 6" />
    <path d="M42 42c4 5 8.5 7 14 7s10-2 14-7" />
    <path d="M82 18h5v4h-5z" />
    <path d="M79 22h11v24a4 4 0 01-4 4h-3a4 4 0 01-4-4z" />
    <path d="M80.5 32h8" opacity="0.45" />
  </>
);

const HERO_FRAME = (
  <>
    <rect x="10" y="8" width="76" height="44" rx="4" />
    <path d="M14 46l16-16 10 10 8-8 20 20" />
    <circle cx="68" cy="20" r="6" opacity="0.5" />
  </>
);

const HERO_SCENES: Record<Vertical, ReactElement> = {
  restaurant: HERO_TABLE,
  salon: HERO_STATION,
  studio: HERO_STUDIO,
};

/* -------------------------------------------------------------- components */

interface ArtProps {
  /** Omitted for the mini phone, which has no content and draws the generic frame. */
  vertical?: Vertical | undefined;
  /** Rendered height in px. The stroke is scaled so line weight stays constant. */
  size: number;
}

/** Square motif for an item: a dish, a service, a class. */
export function ItemArt({ vertical, index = 0, size }: ArtProps & { index?: number | undefined }) {
  const motifs = vertical ? ITEM_MOTIFS[vertical] : undefined;
  const motif = motifs ? (motifs[Math.abs(index) % motifs.length] as ReactElement) : FRAME;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth(48, size)}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {motif}
    </svg>
  );
}

/** Wide scene for the hero slot: a laid table, a styling station, a studio floor. */
export function HeroArt({ vertical, size }: ArtProps) {
  return (
    <svg
      viewBox="0 0 96 64"
      width={(size * 96) / 64}
      height={size}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth(64, size)}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {vertical ? HERO_SCENES[vertical] : HERO_FRAME}
    </svg>
  );
}
