import { Circle, Path, Rect, Svg } from 'react-native-svg';
import type { ReactElement } from 'react';

/**
 * The icon set, drawn rather than typeset.
 *
 * The web preview previously used Material Symbols as a webfont, with ligature
 * names and the variable `FILL` axis switching the active tab between outline
 * and solid. Neither survives the trip to a phone: React Native has no variable
 * font axes, and shipping an icon *font* to native means bundling a second font
 * file and losing the fill state, or bundling two.
 *
 * So the ~10 icons the app actually uses are paths here. They cost less than a
 * font, render identically on both hosts, and the fill state stays a prop.
 *
 * The names are the ones the API already sends in `SampleContent.tabs[].icon`,
 * which makes this set a contract with the seed content — `ICON_NAMES` is
 * asserted against the fixtures in the tests. An unrecognised name draws the
 * fallback glyph rather than throwing, because a content change should never
 * be able to blank a customer's tab bar.
 *
 * Fill convention: outline strokes only; filled fills the closed shapes and
 * thickens the open ones, which is what carries the state on the scissors and
 * the cutlery where there is nothing to fill.
 */

const STROKE = 1.7;
const FILLED_STROKE = 2.3;

interface GlyphProps {
  color: string;
  filled: boolean;
}

type Glyph = (props: GlyphProps) => ReactElement;

const Home: Glyph = ({ color, filled }) => (
  <>
    <Path
      d="M3.6 10.3 12 3.7l8.4 6.6v8.9a1.7 1.7 0 0 1-1.7 1.7H5.3a1.7 1.7 0 0 1-1.7-1.7Z"
      fill={filled ? color : 'none'}
      stroke={color}
    />
    {filled ? null : <Path d="M9.6 21v-5.1a2.4 2.4 0 0 1 4.8 0V21" fill="none" stroke={color} />}
  </>
);

const RestaurantMenu: Glyph = ({ color, filled }) => {
  const width = filled ? FILLED_STROKE : STROKE;
  return (
    <>
      <Path d="M7.4 3.2v4.6a2.3 2.3 0 0 0 4.6 0V3.2" fill="none" stroke={color} strokeWidth={width} />
      <Path d="M9.7 10.1v10.7" fill="none" stroke={color} strokeWidth={width} />
      <Path
        d="M17.2 3.2c1.9 1.9 1.9 6.4 0 8.3v9.3"
        fill="none"
        stroke={color}
        strokeWidth={width}
      />
    </>
  );
};

const ReceiptLong: Glyph = ({ color, filled }) => (
  <>
    <Path
      d="M5.4 3.4h13.2v17l-2.2-1.4-2.2 1.4-2.2-1.4-2.2 1.4-2.2-1.4-2.2 1.4Z"
      fill={filled ? color : 'none'}
      stroke={color}
    />
    {filled ? null : (
      <>
        <Path d="M8.3 8h7.4" fill="none" stroke={color} />
        <Path d="M8.3 11.8h7.4" fill="none" stroke={color} />
      </>
    )}
  </>
);

const Person: Glyph = ({ color, filled }) => (
  <>
    <Circle cx={12} cy={8} r={3.7} fill={filled ? color : 'none'} stroke={color} />
    <Path
      d="M4.9 20.5a7.1 7.1 0 0 1 14.2 0Z"
      fill={filled ? color : 'none'}
      stroke={color}
    />
  </>
);

const ContentCut: Glyph = ({ color, filled }) => {
  const width = filled ? FILLED_STROKE : STROKE;
  return (
    <>
      <Path d="M6.6 4.2 15.4 17.2" fill="none" stroke={color} strokeWidth={width} />
      <Path d="M17.4 4.2 8.6 17.2" fill="none" stroke={color} strokeWidth={width} />
      <Circle cx={6.2} cy={19.2} r={2.6} fill={filled ? color : 'none'} stroke={color} />
      <Circle cx={17.8} cy={19.2} r={2.6} fill={filled ? color : 'none'} stroke={color} />
    </>
  );
};

/** The calendar body, shared by the two date icons. */
function CalendarFrame({ color, filled }: GlyphProps): ReactElement {
  return (
    <>
      <Rect
        x={3.4}
        y={5}
        width={17.2}
        height={15.6}
        rx={2.4}
        fill={filled ? color : 'none'}
        stroke={color}
      />
      <Path d="M8.2 3.2v3.6" fill="none" stroke={color} />
      <Path d="M15.8 3.2v3.6" fill="none" stroke={color} />
      {filled ? null : <Path d="M3.4 9.7h17.2" fill="none" stroke={color} />}
    </>
  );
}

const CalendarMonth: Glyph = (props) => (
  <>
    <CalendarFrame {...props} />
    {props.filled ? null : (
      <>
        <Circle cx={8.2} cy={13.4} r={1.1} fill={props.color} stroke="none" />
        <Circle cx={12} cy={13.4} r={1.1} fill={props.color} stroke="none" />
        <Circle cx={15.8} cy={13.4} r={1.1} fill={props.color} stroke="none" />
        <Circle cx={8.2} cy={17} r={1.1} fill={props.color} stroke="none" />
        <Circle cx={12} cy={17} r={1.1} fill={props.color} stroke="none" />
      </>
    )}
  </>
);

const EventNote: Glyph = (props) => (
  <>
    <CalendarFrame {...props} />
    {props.filled ? null : (
      <>
        <Path d="M7.4 13.4h9.2" fill="none" stroke={props.color} />
        <Path d="M7.4 16.8h5.8" fill="none" stroke={props.color} />
      </>
    )}
  </>
);

const ConfirmationNumber: Glyph = ({ color, filled }) => (
  <>
    <Path
      d="M3.4 6.6h17.2v3.2a2.2 2.2 0 0 0 0 4.4v3.2H3.4v-3.2a2.2 2.2 0 0 0 0-4.4Z"
      fill={filled ? color : 'none'}
      stroke={color}
    />
    {filled ? null : <Path d="M13.4 8.6v6.8" fill="none" stroke={color} strokeDasharray="1.6 2" />}
  </>
);

const Notifications: Glyph = ({ color, filled }) => (
  <>
    <Path
      d="M12 3.2a5.7 5.7 0 0 0-5.7 5.7c0 4.3-1.6 5.8-1.6 5.8h14.6s-1.6-1.5-1.6-5.8A5.7 5.7 0 0 0 12 3.2Z"
      fill={filled ? color : 'none'}
      stroke={color}
    />
    <Path d="M10 18.1a2.2 2.2 0 0 0 4 0" fill="none" stroke={color} />
  </>
);

const Add: Glyph = ({ color }) => (
  <>
    <Path d="M12 5.6v12.8" fill="none" stroke={color} strokeWidth={2} />
    <Path d="M5.6 12h12.8" fill="none" stroke={color} strokeWidth={2} />
  </>
);

const Remove: Glyph = ({ color }) => (
  <Path d="M5.6 12h12.8" fill="none" stroke={color} strokeWidth={2} />
);

const Star: Glyph = ({ color, filled }) => (
  <Path
    d="M12 3.6l2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 17.4l-5.3 2.9 1.1-6.1L3.4 10l6-.8Z"
    fill={filled ? color : 'none'}
    stroke={color}
  />
);

const Check: Glyph = ({ color }) => (
  <Path d="M5 12.6l4.6 4.4L19 6.8" fill="none" stroke={color} strokeWidth={2.2} />
);

const Fallback: Glyph = ({ color, filled }) => (
  <Rect
    x={4.2}
    y={4.2}
    width={15.6}
    height={15.6}
    rx={3.4}
    fill={filled ? color : 'none'}
    stroke={color}
  />
);

const GLYPHS = {
  home: Home,
  restaurant_menu: RestaurantMenu,
  receipt_long: ReceiptLong,
  person: Person,
  content_cut: ContentCut,
  calendar_month: CalendarMonth,
  confirmation_number: ConfirmationNumber,
  event_note: EventNote,
  notifications: Notifications,
  add: Add,
  remove: Remove,
  star: Star,
  check: Check,
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof GLYPHS;

export const ICON_NAMES = Object.keys(GLYPHS) as readonly IconName[];

export function hasIcon(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(GLYPHS, name);
}

export function Icon({
  name,
  size,
  color,
  filled = false,
}: {
  /** A Material Symbols name — the same string the API sends for a tab. */
  name: string;
  size: number;
  color: string;
  filled?: boolean;
}) {
  const Glyph: Glyph = hasIcon(name) ? GLYPHS[name] : Fallback;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Glyph color={color} filled={filled} />
    </Svg>
  );
}
