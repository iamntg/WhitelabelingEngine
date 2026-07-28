import { contrastRatio, roundRatio } from './color/contrast.js';
import { nudgeToRatio } from './color/nudge.js';
import { resolveTheme, type ColorScheme, type ResolvedTheme } from './resolve.js';
import type { ThemeTokens } from './schema.js';

/**
 * The contrast engine.
 *
 * The web shows these inline the instant a bad pair is set; the API re-runs this
 * exact function on publish. Never trust the client — but also never let the
 * two disagree, which is why there is one implementation and no second opinion.
 */

export type ContrastLevel = 'pass' | 'warn' | 'fail';

export interface ContrastThresholds {
  /** Below this, publish is blocked. */
  readonly fail: number;
  /** At or above this, the pair passes outright. */
  readonly pass: number;
}

/**
 * WCAG 2.1 applies two different bars, and using the wrong one is how a
 * contrast checker earns a reputation for crying wolf.
 *
 *  - SC 1.4.3 Contrast (Minimum): 4.5:1, for anything you read.
 *  - SC 1.4.11 Non-text Contrast: 3:1, for UI components and graphics.
 *
 * A primary button fill or an accent tag chip is a graphical object, not body
 * copy. Holding an amber accent to 4.5:1 would flag essentially every warm
 * accent colour a small business would ever pick, and a warning that fires on
 * every reasonable choice trains owners to ignore the one that matters.
 */
export const TEXT_THRESHOLDS: ContrastThresholds = { fail: 3, pass: 4.5 };
export const NON_TEXT_THRESHOLDS: ContrastThresholds = { fail: 3, pass: 3 };

/** The blocking bar is 3:1 across the board, exactly as specified. */
export const CONTRAST_THRESHOLDS = TEXT_THRESHOLDS;

export type ContrastPairId =
  | 'primary-on-background'
  | 'text-on-surface'
  | 'on-primary-on-primary'
  | 'accent-on-background'
  | 'secondary-on-background'
  | 'secondary-on-primary'
  | 'accent-ink-on-accent-soft';

/** Which token the owner would change to fix this pair. */
export type FixTarget = 'primary' | 'secondary' | 'accent' | 'background';

export interface ContrastResult {
  pairId: ContrastPairId;
  /** Short human label, e.g. "Accent on background". */
  label: string;
  scheme: ColorScheme;
  ratio: number;
  level: ContrastLevel;
  /** Which WCAG bar this pair is held to, and at what ratios. */
  criterion: 'text' | 'non-text';
  thresholds: ContrastThresholds;
  message: string;
  /** A nudged hex for `fixTarget` that would pass. Absent when already passing. */
  suggestion?: string;
  /** The token the suggestion applies to. */
  fixTarget: FixTarget;
  /** Measured foreground and background, for rendering the swatch pair. */
  foreground: string;
  background: string;
  /**
   * True for pairs the owner is actually asked about: failing ones hold the
   * publish until acknowledged. False for advisory pairs, which are measured
   * and reported but never surfaced or gated — see `secondary-on-primary`.
   */
  blocking: boolean;
}

interface PairDefinition {
  id: ContrastPairId;
  label: string;
  blocking: boolean;
  criterion: 'text' | 'non-text';
  fixTarget: FixTarget;
  select: (r: ResolvedTheme) => { foreground: string; background: string };
  /** Consequence-first copy. The owner needs to know what breaks, not the rule. */
  message: (level: Exclude<ContrastLevel, 'pass'>) => string;
  /**
   * Computes a replacement value for `fixTarget`. Returns null when no colour
   * along that hue can reach the target.
   */
  suggest: (tokens: ThemeTokens, resolved: ResolvedTheme, target: number) => string | null;
}

const PAIRS: readonly PairDefinition[] = [
  {
    id: 'primary-on-background',
    label: 'Primary on background',
    blocking: true,
    criterion: 'non-text',
    fixTarget: 'primary',
    select: (r) => ({ foreground: r.primary.base, background: r.surface.base }),
    message: (level) =>
      level === 'fail'
        ? 'Buttons and links in this colour will blend into the background.'
        : 'Buttons in this colour are readable but low-contrast against the background.',
    suggest: (tokens, r, target) => nudgeToRatio(tokens.colors.primary, r.surface.base, target),
  },
  {
    id: 'text-on-surface',
    label: 'Body text on background',
    blocking: true,
    criterion: 'text',
    fixTarget: 'background',
    select: (r) => ({ foreground: r.text.primary, background: r.surface.base }),
    message: () =>
      'Body text is hard to read on this background. Try a clearly lighter or darker background.',
    // Text is derived from the background, so the only lever is the background.
    suggest: (tokens, r, target) => nudgeToRatio(tokens.colors.background, r.text.primary, target),
  },
  {
    id: 'on-primary-on-primary',
    label: 'Button label on primary',
    blocking: true,
    criterion: 'text',
    fixTarget: 'primary',
    select: (r) => ({ foreground: r.primary.on, background: r.primary.base }),
    message: () =>
      'Neither white nor black reads clearly on this colour, so button labels will be hard to see.',
    suggest: (tokens, r, target) => nudgeToRatio(tokens.colors.primary, r.primary.on, target),
  },
  {
    id: 'accent-on-background',
    label: 'Accent on background',
    blocking: true,
    criterion: 'non-text',
    fixTarget: 'accent',
    select: (r) => ({ foreground: r.accent.base, background: r.surface.base }),
    message: (level) =>
      level === 'fail'
        ? 'Prices, tags and labels in this colour will be hard to read.'
        : 'Accent details are readable but faint against the background.',
    suggest: (tokens, r, target) => nudgeToRatio(tokens.colors.accent, r.surface.base, target),
  },
  {
    id: 'secondary-on-background',
    label: 'Secondary on background',
    blocking: true,
    criterion: 'text',
    fixTarget: 'secondary',
    select: (r) => ({ foreground: r.secondary.base, background: r.surface.base }),
    message: (level) =>
      level === 'fail'
        ? 'Section labels and links in this colour will be hard to read.'
        : 'Secondary text is readable but low-contrast against the background.',
    suggest: (tokens, r, target) => nudgeToRatio(tokens.colors.secondary, r.surface.base, target),
  },
  {
    id: 'secondary-on-primary',
    label: 'Secondary on primary',
    // Advisory: in the current screen set these two colours never touch. It is
    // checked so a future layout that does put them together is caught early,
    // but it must not block a publish over a combination nobody can see.
    blocking: false,
    criterion: 'non-text',
    fixTarget: 'secondary',
    select: (r) => ({ foreground: r.secondary.base, background: r.primary.base }),
    message: () =>
      'Secondary and primary are close in tone. They will be hard to tell apart if used together.',
    suggest: (tokens, r, target) => nudgeToRatio(tokens.colors.secondary, r.primary.base, target),
  },
  {
    id: 'accent-ink-on-accent-soft',
    label: 'Tag text on accent wash',
    blocking: true,
    criterion: 'text',
    fixTarget: 'accent',
    select: (r) => ({ foreground: r.accent.onSubtle, background: r.accent.subtleFill }),
    message: () => 'Text inside accent tags such as “Chef’s pick” will be hard to read.',
    suggest: (tokens, r, target) => nudgeToRatio(tokens.colors.accent, r.accent.subtleFill, target),
  },
];

export function thresholdsFor(criterion: 'text' | 'non-text'): ContrastThresholds {
  return criterion === 'text' ? TEXT_THRESHOLDS : NON_TEXT_THRESHOLDS;
}

export function levelForRatio(
  ratio: number,
  thresholds: ContrastThresholds = TEXT_THRESHOLDS,
): ContrastLevel {
  if (ratio < thresholds.fail) return 'fail';
  if (ratio < thresholds.pass) return 'warn';
  return 'pass';
}

export interface CheckContrastOptions {
  /**
   * Defaults to `light`. Dark-scheme colours are corrected by the resolver
   * rather than reported, because the owner never chose the dark surface and so
   * could not act on a warning about it. Pass `dark` to assert that guarantee
   * in tests.
   */
  scheme?: ColorScheme;
}

export function checkContrast(
  tokens: ThemeTokens,
  options: CheckContrastOptions = {},
): ContrastResult[] {
  const scheme = options.scheme ?? 'light';
  const resolved = resolveTheme(tokens, { scheme });

  return PAIRS.map((pair) => {
    const { foreground, background } = pair.select(resolved);
    const thresholds = thresholdsFor(pair.criterion);
    const ratio = roundRatio(contrastRatio(foreground, background));
    const level = levelForRatio(ratio, thresholds);

    const base: ContrastResult = {
      pairId: pair.id,
      label: pair.label,
      scheme,
      ratio,
      level,
      criterion: pair.criterion,
      thresholds,
      message:
        level === 'pass'
          ? `${pair.label} is clearly legible at ${ratio.toFixed(1)}:1.`
          : pair.message(level),
      fixTarget: pair.fixTarget,
      foreground,
      background,
      blocking: pair.blocking,
    };

    if (level === 'pass') return base;

    // Aim for a clear pass, not the bare minimum — a suggestion that lands on
    // 3.01:1 just moves the warning rather than resolving it.
    const suggestion = pair.suggest(tokens, resolved, thresholds.pass);
    return suggestion ? { ...base, suggestion } : base;
  });
}

/* -------------------------------------------------------------------------- */
/* Publish gating                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Contrast never refuses a publish outright — it requires the owner to say so.
 *
 * A failing pair used to be unpublishable full stop. That is the wrong party
 * holding the veto: it is their brand, the check is a heuristic over two
 * colours, and it cannot know that the accent in question only ever appears as
 * a 24px chip. Owners who genuinely need the colour are left with no route
 * forward except to abandon it, and the tool ends up arguing with the person it
 * is meant to serve.
 *
 * So both severities now work the same way and differ only in tone: nothing
 * ships until the owner acknowledges each failing pair by id. Publishing an
 * illegible theme stays possible, but it cannot happen by accident, and the
 * acknowledgement is re-checked on the server against the stored draft — a
 * client that simply stops sending the list is refused, exactly as before.
 */
export interface PublishValidation {
  ok: boolean;
  results: ContrastResult[];
  /** Fail-level pairs. Publishable, but only once explicitly acknowledged. */
  failures: ContrastResult[];
  /** Warn-level pairs. Same acknowledgement, softer tone. */
  warnings: ContrastResult[];
  /** Failures and warnings the caller did not acknowledge. Non-empty refuses the publish. */
  unacknowledged: ContrastResult[];
}

export function validateForPublish(
  tokens: ThemeTokens,
  acknowledgedIssues: readonly string[] = [],
): PublishValidation {
  const results = checkContrast(tokens);
  const failures = results.filter((r) => r.level === 'fail' && r.blocking);
  const warnings = results.filter((r) => r.level === 'warn' && r.blocking);
  const acknowledged = new Set(acknowledgedIssues);
  const unacknowledged = [...failures, ...warnings].filter((r) => !acknowledged.has(r.pairId));

  return {
    ok: unacknowledged.length === 0,
    results,
    failures,
    warnings,
    unacknowledged,
  };
}
