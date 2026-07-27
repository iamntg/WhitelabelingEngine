import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import { FONT_PAIRINGS, type ResolvedTheme } from '@wl/theme';

/**
 * All five pairings, bundled.
 *
 * Every family from the registry ships in the binary. A theme change is a JSON
 * change, not an app-store release, so an owner switching from Modern to Grand
 * must not leave existing installs rendering a fallback face.
 *
 * The keys here are exactly the `rnExports` values in the registry, and
 * `fonts.test.ts` asserts the two agree — a mismatch would only show up on a
 * device, on the one pairing nobody tested.
 */
export const FONT_MAP = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Fraunces_600SemiBold,
  SpaceGrotesk_600SemiBold,
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  DMSerifDisplay_400Regular,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} as const;

export type BundledFont = keyof typeof FONT_MAP;

/**
 * React Native has no font-weight synthesis for custom families — asking for
 * `fontWeight: 600` on a face that was loaded as Regular silently renders
 * Regular. So the family name itself must carry the weight, which is what this
 * resolves.
 */
export function rnFontFamily(
  theme: ResolvedTheme,
  role: 'display' | 'body',
  weight?: number,
): string {
  const pairing = FONT_PAIRINGS.find((p) => p.id === theme.meta.pairingId);
  if (!pairing) return 'System';

  const face = role === 'display' ? pairing.display : pairing.body;
  const resolvedWeight = weight ?? face.weight;
  const key = `${face.family}-${resolvedWeight}`;

  // Falls back to the face's own weight when an exact match is not bundled —
  // DM Sans, for instance, maps semibold onto 700 rather than shipping a 600
  // that Google does not reliably provide as a static.
  return pairing.rnExports[key] ?? pairing.rnExports[`${face.family}-${face.weight}`] ?? 'System';
}
