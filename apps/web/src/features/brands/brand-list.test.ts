import { describe, expect, it } from 'vitest';
import { formatRelative } from './BrandListPage.jsx';

/**
 * The "last edited" column.
 *
 * Relative time is friendlier close up and useless far away — "43 days ago" is
 * harder to place than "Jun 24" — so it switches to a date past the two-day
 * mark, matching the design's mix of "2 minutes ago", "Yesterday, 4:12 PM" and
 * "Jun 28".
 */

const now = new Date('2026-07-26T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelative', () => {
  it('says "Just now" under a minute', () => {
    expect(formatRelative(ago(30 * SECOND), now)).toBe('Just now');
  });

  it('counts minutes, singular and plural', () => {
    expect(formatRelative(ago(1 * MINUTE), now)).toBe('1 minute ago');
    expect(formatRelative(ago(2 * MINUTE), now)).toBe('2 minutes ago');
    expect(formatRelative(ago(59 * MINUTE), now)).toBe('59 minutes ago');
  });

  it('counts hours', () => {
    expect(formatRelative(ago(1 * HOUR), now)).toBe('1 hour ago');
    expect(formatRelative(ago(5 * HOUR), now)).toBe('5 hours ago');
  });

  it('says "Yesterday" for the previous day', () => {
    expect(formatRelative(ago(30 * HOUR), now)).toBe('Yesterday');
  });

  it('falls back to a date once relative time stops helping', () => {
    expect(formatRelative(ago(40 * DAY), now)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });

  it('handles a brand that has never been edited', () => {
    expect(formatRelative(null, now)).toBe('Never');
  });

  it('does not produce "0 minutes ago"', () => {
    for (let seconds = 0; seconds < 3600; seconds += 7) {
      const label = formatRelative(ago(seconds * SECOND), now);
      expect(label).not.toMatch(/^0 /);
    }
  });
});
