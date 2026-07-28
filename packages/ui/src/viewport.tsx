import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * The phone's own geometry, passed in rather than measured.
 *
 * `Dimensions` and `useWindowDimensions` are wrong for the admin preview: the
 * react-native-web module instance lives in the admin document, so it reports
 * the browser window's width — not the 372pt iframe the preview renders into.
 * A component that measured itself would lay out for a 1440pt phone.
 *
 * So the host states the width, and both hosts are honest about where it comes
 * from: the Expo app passes `useWindowDimensions().width`, the preview passes
 * the frame it drew.
 */

export interface Insets {
  top: number;
  bottom: number;
}

export interface Viewport {
  width: number;
  insets: Insets;
}

const ViewportContext = createContext<Viewport | null>(null);

export function ViewportProvider({
  width,
  insets,
  children,
}: {
  width: number;
  insets: Insets;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ width, insets }), [width, insets.top, insets.bottom]);
  return <ViewportContext.Provider value={value}>{children}</ViewportContext.Provider>;
}

export function useViewport(): Viewport {
  const value = useContext(ViewportContext);
  if (!value) throw new Error('Wrap the tree in <AppShell> — it provides the viewport.');
  return value;
}
