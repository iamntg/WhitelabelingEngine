import { getPairing } from './fonts.js';
import { getRadiusScale } from './radii.js';
import type { ThemeTokens } from './schema.js';

/**
 * Human-readable publish diff.
 *
 * Computed on the server and stored on `theme_version.changeSummary`, so the
 * confirmation modal and the version history render the same words, and a
 * version published a year ago still explains itself.
 */

export type ChangeKind = 'color' | 'choice' | 'text' | 'asset';

export interface ThemeChange {
  /** Dotted token path, e.g. `colors.primary`. */
  field: string;
  /** Short label for the diff row, e.g. "Primary colour". */
  label: string;
  kind: ChangeKind;
  /** Raw values — hex for colours, ids for choices. */
  from: string | null;
  to: string | null;
  /** Display values — hex uppercased, ids resolved to labels. */
  fromText: string;
  toText: string;
  /** One-line sentence, e.g. "Font pairing: Modern → Editorial". */
  summary: string;
}

export interface ChangeSummary {
  count: number;
  changes: ThemeChange[];
}

const BUTTON_LABELS: Record<string, string> = {
  filled: 'Filled',
  outline: 'Outline',
  soft: 'Soft',
};

function colorChange(field: string, label: string, from: string, to: string): ThemeChange {
  return {
    field,
    label,
    kind: 'color',
    from,
    to,
    fromText: from.toUpperCase(),
    toText: to.toUpperCase(),
    summary: `${label} changed`,
  };
}

function choiceChange(
  field: string,
  label: string,
  from: string,
  to: string,
  fromText: string,
  toText: string,
): ThemeChange {
  return {
    field,
    label,
    kind: 'choice',
    from,
    to,
    fromText,
    toText,
    summary: `${label}: ${fromText} → ${toText}`,
  };
}

export function diffTokens(from: ThemeTokens, to: ThemeTokens): ChangeSummary {
  const changes: ThemeChange[] = [];

  const colorFields = [
    ['primary', 'Primary colour'],
    ['secondary', 'Secondary colour'],
    ['accent', 'Accent colour'],
    ['background', 'Background colour'],
  ] as const;

  for (const [key, label] of colorFields) {
    if (from.colors[key] !== to.colors[key]) {
      changes.push(colorChange(`colors.${key}`, label, from.colors[key], to.colors[key]));
    }
  }

  if (from.typography.pairingId !== to.typography.pairingId) {
    changes.push(
      choiceChange(
        'typography.pairingId',
        'Font pairing',
        from.typography.pairingId,
        to.typography.pairingId,
        getPairing(from.typography.pairingId).label,
        getPairing(to.typography.pairingId).label,
      ),
    );
  }

  if (from.shape.radiusScale !== to.shape.radiusScale) {
    changes.push(
      choiceChange(
        'shape.radiusScale',
        'Corners',
        from.shape.radiusScale,
        to.shape.radiusScale,
        getRadiusScale(from.shape.radiusScale).label,
        getRadiusScale(to.shape.radiusScale).label,
      ),
    );
  }

  if (from.buttons.style !== to.buttons.style) {
    changes.push(
      choiceChange(
        'buttons.style',
        'Button style',
        from.buttons.style,
        to.buttons.style,
        BUTTON_LABELS[from.buttons.style] ?? from.buttons.style,
        BUTTON_LABELS[to.buttons.style] ?? to.buttons.style,
      ),
    );
  }

  if (from.brand.businessName !== to.brand.businessName) {
    changes.push({
      field: 'brand.businessName',
      label: 'Business name',
      kind: 'text',
      from: from.brand.businessName,
      to: to.brand.businessName,
      fromText: from.brand.businessName,
      toText: to.brand.businessName,
      summary: `Business name: ${from.brand.businessName} → ${to.brand.businessName}`,
    });
  }

  if (from.brand.logoUrl !== to.brand.logoUrl) {
    const fromText = from.brand.logoUrl ? 'Uploaded' : 'None';
    const toText = to.brand.logoUrl ? 'Uploaded' : 'None';
    changes.push({
      field: 'brand.logoUrl',
      label: 'Logo',
      kind: 'asset',
      from: from.brand.logoUrl,
      to: to.brand.logoUrl,
      fromText,
      toText,
      summary: to.brand.logoUrl
        ? from.brand.logoUrl
          ? 'Logo replaced'
          : 'Logo added'
        : 'Logo removed',
    });
  }

  return { count: changes.length, changes };
}

/** "6 changes" / "1 change" / "No changes" — used by the header and the modal. */
export function describeChangeCount(count: number): string {
  if (count === 0) return 'No changes';
  return count === 1 ? '1 change' : `${count} changes`;
}
