import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, View, type NativeScrollEvent } from 'react-native';
import { useTheme } from '../theme-context.js';

/**
 * The hero carousel.
 *
 * The web preview used to drive this with a CSS `translateX` transition and
 * clickable dots. That is a thing a phone cannot do: React Native has no CSS
 * transitions, and — more to the point — a hero carousel on a phone is dragged,
 * not clicked. Rebuilding it on a snapping `ScrollView` means the preview now
 * shows the interaction the customer will actually have, and the dots stay
 * tappable for the pointer.
 *
 * `snapToOffsets` carries the geometry rather than `pagingEnabled`, because the
 * slides are narrower than the frame and the last one has to come to rest flush
 * against the right edge instead of dragging empty space into view.
 */

export interface CarouselGeometry {
  /** Width of one slide. */
  slideWidth: number;
  gap: number;
  /** Horizontal padding at each end of the track. */
  padding: number;
  /** The viewport the track scrolls inside — the phone's own width. */
  frameWidth: number;
  /** Sliver of the previous slide left visible, so the track reads as scrollable. */
  peek: number;
}

/**
 * Where the track comes to rest for a given slide, clamped so the last slide
 * sits flush against the right edge.
 */
export function slideOffsets(count: number, geometry: CarouselGeometry): number[] {
  const { slideWidth, gap, padding, frameWidth, peek } = geometry;
  const track = count * slideWidth + Math.max(0, count - 1) * gap + padding * 2;
  const furthest = Math.max(0, track - frameWidth);

  return Array.from({ length: count }, (_, index) =>
    Math.min(Math.max(0, index * (slideWidth + gap) - peek), furthest),
  );
}

/** The resting offset nearest to where the track actually is. */
function nearestIndex(offsets: readonly number[], x: number): number {
  let best = 0;
  for (let i = 1; i < offsets.length; i += 1) {
    const candidate = offsets[i] ?? 0;
    const incumbent = offsets[best] ?? 0;
    if (Math.abs(candidate - x) < Math.abs(incumbent - x)) best = i;
  }
  return best;
}

export function Carousel({
  count,
  geometry,
  renderSlide,
  accessibilityLabel,
}: {
  count: number;
  geometry: CarouselGeometry;
  /** `active` is passed in rather than derived, so slides can dim themselves. */
  renderSlide: (index: number, active: boolean) => ReactNode;
  accessibilityLabel: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);
  const offsets = slideOffsets(count, geometry);

  const onScroll = ({ nativeEvent }: { nativeEvent: NativeScrollEvent }) => {
    const next = nearestIndex(offsets, nativeEvent.contentOffset.x);
    if (next !== active) setActive(next);
  };

  const goTo = (index: number) => {
    setActive(index);
    scrollRef.current?.scrollTo({ x: offsets[index] ?? 0, animated: true });
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        accessibilityLabel={accessibilityLabel}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToOffsets={offsets}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: geometry.padding,
          gap: geometry.gap,
        }}
      >
        {Array.from({ length: count }, (_, index) => (
          <Slide key={index} width={geometry.slideWidth} active={index === active}>
            {renderSlide(index, index === active)}
          </Slide>
        ))}
      </ScrollView>

      <Dots count={count} active={active} onSelect={goTo} />
    </View>
  );
}

/**
 * The off-slides are dimmed rather than recoloured: mixing a faded accent here
 * would be a colour the resolver never produced, and the owner would be judging
 * a tint we invented.
 */
function Slide({ width, active, children }: { width: number; active: boolean; children: ReactNode }) {
  const opacity = useRef(new Animated.Value(active ? 1 : DIMMED)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: active ? 1 : DIMMED,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [active, opacity]);

  return <Animated.View style={{ width, opacity }}>{children}</Animated.View>;
}

const DIMMED = 0.55;

function Dots({
  count,
  active,
  onSelect,
}: {
  count: number;
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 3,
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <Dot
          key={index}
          active={index === active}
          label={`Slide ${index + 1} of ${count}`}
          onPress={() => onSelect(index)}
        />
      ))}
    </View>
  );
}

const DOT_WIDTH = 5;
const DOT_ACTIVE_WIDTH = 16;

function Dot({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const width = useRef(new Animated.Value(active ? DOT_ACTIVE_WIDTH : DOT_WIDTH)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: active ? DOT_ACTIVE_WIDTH : DOT_WIDTH,
      duration: 200,
      // Width is a layout property, so it cannot go to the native thread.
      useNativeDriver: false,
    }).start();
  }, [active, width]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      // A 5px dot is not a 5px target. The hit area is 24px square and the
      // paint is what shrinks.
      style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={{
          width,
          height: 5,
          borderRadius: 3,
          backgroundColor: active ? theme.primary.base : theme.surface.border,
        }}
      />
    </Pressable>
  );
}
