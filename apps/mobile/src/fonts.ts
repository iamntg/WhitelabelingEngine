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
 * Which of these families a given theme asks for is resolved by `@wl/ui`'s
 * `fontFor(theme, role, weight, 'bundled')`, not here. The rule that a family
 * name carries its weight is a rendering rule, and it has to hold in the admin
 * preview as well as on the device — keeping a second copy of it in this file
 * is how the two would drift.
 */
