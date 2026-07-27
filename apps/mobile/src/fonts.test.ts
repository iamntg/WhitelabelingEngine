// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FONT_PAIRINGS } from '@wl/theme';
import { describe, expect, it } from 'vitest';

/**
 * The registry and the bundle must agree.
 *
 * This is the highest-risk seam in the mobile app and the one with the worst
 * failure mode: a pairing whose font was never imported renders in the system
 * face, only on device, only for the tenants who chose that pairing. Nothing in
 * the web preview would show it.
 *
 * The source is read as text rather than imported, so the check runs without
 * pulling the React Native runtime into a Node test process.
 */

const fontsSource = readFileSync(fileURLToPath(new URL('./fonts.ts', import.meta.url)), 'utf8');

function bundledNames(): Set<string> {
  const block = /export const FONT_MAP = \{([\s\S]*?)\} as const;/.exec(fontsSource)?.[1] ?? '';
  return new Set(
    block
      .split('\n')
      .map((line) => line.trim().replace(/,$/, ''))
      .filter((line) => /^[A-Za-z][A-Za-z0-9_]*$/.test(line)),
  );
}

describe('FONT_MAP', () => {
  it('bundles every font export the registry names', () => {
    const bundled = bundledNames();
    expect(bundled.size).toBeGreaterThan(0);

    for (const pairing of FONT_PAIRINGS) {
      for (const [key, exportName] of Object.entries(pairing.rnExports)) {
        expect(
          bundled.has(exportName),
          `${pairing.id} needs ${exportName} (for ${key}) but FONT_MAP does not bundle it`,
        ).toBe(true);
      }
    }
  });

  it('imports each bundled font from a package the registry declares', () => {
    const declaredPackages = new Set(
      FONT_PAIRINGS.flatMap((p) => [p.rnPackage.display, p.rnPackage.body]),
    );

    const imported = [...fontsSource.matchAll(/from '(@expo-google-fonts\/[^']+)'/g)].map(
      (match) => match[1] as string,
    );

    expect(imported.length).toBeGreaterThan(0);
    for (const packageName of imported) {
      expect(
        declaredPackages.has(packageName),
        `${packageName} is imported but no pairing declares it`,
      ).toBe(true);
    }
  });

  it('bundles nothing the registry does not ask for', () => {
    // Dead font files are pure bundle size on a phone.
    const needed = new Set(
      FONT_PAIRINGS.flatMap((p) => Object.values(p.rnExports)),
    );
    for (const name of bundledNames()) {
      expect(needed.has(name), `${name} is bundled but no pairing uses it`).toBe(true);
    }
  });

  it('declares every font package it imports as a dependency', () => {
    const pkg = JSON.parse(
      readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
    ) as { dependencies: Record<string, string> };

    const imported = new Set(
      [...fontsSource.matchAll(/from '(@expo-google-fonts\/[^']+)'/g)].map(
        (match) => match[1] as string,
      ),
    );

    for (const packageName of imported) {
      expect(
        pkg.dependencies[packageName],
        `${packageName} is imported but not in dependencies`,
      ).toBeDefined();
    }
  });
});
