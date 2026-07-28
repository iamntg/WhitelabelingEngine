import type { SampleContent, SampleItem } from '@wl/api-client';
import { ScrollView, Text, View } from 'react-native';
import { Button, IconButton } from '../components/Button.js';
import { AppHeader } from '../components/AppHeader.js';
import { Carousel, type CarouselGeometry } from '../components/Carousel.js';
import { ImageSlot } from '../components/ImageSlot.js';
import { Tag } from '../components/Tag.js';
import { featuredItems, itemIndex, money } from '../content.js';
import { HeroArt, ItemArt } from '../illustrations.js';
import { useTheme } from '../theme-context.js';
import { useTextStyles } from '../typography.js';
import { useViewport } from '../viewport.js';

/**
 * Home: a hero carousel across the top, the headline and actions, then the
 * featured list as a two-column card grid.
 *
 * Both exist to put more of the theme on one screen. The carousel shows a
 * second and third accent pill — the first thing that breaks when an owner
 * picks a bright accent is the pill next to it, and a single hero hides that.
 * The grid trades a row list's long descriptions for four images, four prices
 * and two tags, so the corner radius, the accent and the button style all
 * repeat down the screen rather than appearing once.
 *
 * The grid is laid out in flex with a measured column width rather than in a
 * two-column CSS grid, which React Native does not have. The measurement comes
 * from the viewport the host declared — see `viewport.tsx`.
 */

const PADDING = 20;
const SLIDE_WIDTH = 288;
const SLIDE_GAP = 10;
const CARD_GAP = 10;
/** Sliver of the previous slide left visible, so the track reads as scrollable. */
const PEEK = 22;

export function HomeScreen({ content }: { content: SampleContent }) {
  const theme = useTheme();
  const type = useTextStyles();
  const { width } = useViewport();

  const slides = content.home.heroSlides;
  const featured = featuredItems(content);
  const columnWidth = (width - PADDING * 2 - CARD_GAP) / 2;

  const geometry: CarouselGeometry = {
    slideWidth: SLIDE_WIDTH,
    gap: SLIDE_GAP,
    padding: PADDING,
    frameWidth: width,
    peek: PEEK,
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <AppHeader />

      <Carousel
        count={slides.length}
        geometry={geometry}
        accessibilityLabel="Featured promotions"
        renderSlide={(index) => {
          const slide = slides[index];
          if (!slide) return null;
          return (
            <ImageSlot
              height={152}
              label={slide.imageLabel}
              art={<HeroArt vertical={content.vertical} size={78} color={theme.placeholder.ink} />}
            >
              <View style={{ position: 'absolute', top: 12, left: 12 }}>
                <Tag label={slide.promoLabel} tone="solid" size="lg" />
              </View>
            </ImageSlot>
          );
        }}
      />

      <View style={{ paddingHorizontal: PADDING, paddingTop: 14 }}>
        <Text style={{ ...type.display('md'), lineHeight: theme.typography.display.sizes.md * 1.2 }}>
          {content.home.headline}
        </Text>
        <Text style={{ ...type.body('md', { color: theme.text.secondary }), marginTop: 4 }}>
          {content.home.subline}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Button label={content.home.primaryActionLabel} style={{ flex: 1 }} />
          <Button label={content.home.secondaryActionLabel} variant="secondary" />
        </View>
      </View>

      <View style={{ paddingHorizontal: PADDING, paddingTop: 16, paddingBottom: 20 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}
        >
          <Text style={{ ...type.display('xs'), fontSize: 14 }}>{content.home.listTitle}</Text>
          <Text style={type.body('sm', { weight: 'medium', color: theme.secondary.base })}>
            {content.home.listLinkLabel}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: CARD_GAP,
            marginTop: 11,
          }}
        >
          {featured.map((item) => (
            <FeaturedCard key={item.id} item={item} content={content} width={columnWidth} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function FeaturedCard({
  item,
  content,
  width,
}: {
  item: SampleItem;
  content: SampleContent;
  width: number;
}) {
  const theme = useTheme();
  const type = useTextStyles();

  return (
    <View
      style={{
        width,
        borderWidth: 1,
        borderColor: theme.surface.border,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        backgroundColor: theme.surface.base,
      }}
    >
      <ImageSlot
        height={78}
        cornerRadius={0}
        art={
          <ItemArt
            vertical={content.vertical}
            index={itemIndex(content, item.id)}
            size={40}
            color={theme.placeholder.ink}
          />
        }
      >
        {item.tag ? (
          <View style={{ position: 'absolute', top: 7, left: 7 }}>
            <Tag label={item.tag} tone="solid" size="sm" />
          </View>
        ) : null}
      </ImageSlot>

      <View style={{ paddingHorizontal: 10, paddingTop: 9, paddingBottom: 10 }}>
        {/* Two lines, fixed: the cards sit side by side, and a name that wraps
            to three would push one price out of line. */}
        <Text
          numberOfLines={2}
          style={{
            ...type.body('md', { weight: 'semibold' }),
            lineHeight: theme.typography.body.sizes.md * 1.25,
            height: theme.typography.body.sizes.md * 1.25 * 2,
          }}
        >
          {item.name}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 7,
          }}
        >
          <Text style={type.body('md', { weight: 'semibold' })}>
            {money(content, item.price.amount)}
          </Text>
          <IconButton icon="add" accessibilityLabel={`Add ${item.name}`} />
        </View>
      </View>
    </View>
  );
}
