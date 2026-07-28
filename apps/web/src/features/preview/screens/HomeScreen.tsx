import { useState } from 'react';
import { HeroArt, ItemArt } from '../illustrations.jsx';
import { bodyText, buttonSurface, displayText, hairline, radius } from '../theme-style.js';
import {
  AppHeader,
  ImageSlot,
  itemById,
  itemIndex,
  money,
  type ScreenProps,
} from './shared.jsx';

/**
 * Home, following the design export: a hero carousel across the top, the
 * headline and actions, then the featured list as a two-column card grid.
 *
 * Both changes exist to put more of the theme on one screen. The carousel shows
 * a second and third accent pill — the first thing that breaks when an owner
 * picks a bright accent is the pill next to it, and a single hero hides that.
 * The grid trades the row list's long descriptions for four images, four
 * prices and two tags, so the corner radius, the accent and the button style
 * all repeat down the screen rather than appearing once.
 */

/**
 * Carousel geometry, in px. The frame is the phone's 372pt viewport, so the
 * numbers are the design's own and the slide lands in the same place here.
 */
const SLIDE_WIDTH = 288;
const SLIDE_GAP = 10;
const TRACK_PADDING = 20;
const FRAME_WIDTH = 372;
/** Sliver of the previous slide left visible, so the track reads as scrollable. */
const PEEK = 22;

/**
 * How far the track moves for a given slide, clamped so the last slide sits
 * flush against the right edge instead of dragging empty space into frame.
 */
function trackOffset(index: number, count: number): number {
  const track = count * SLIDE_WIDTH + (count - 1) * SLIDE_GAP + TRACK_PADDING * 2;
  const furthest = Math.max(0, track - FRAME_WIDTH);
  return -Math.min(Math.max(0, index * (SLIDE_WIDTH + SLIDE_GAP) - PEEK), furthest);
}

export function HomeScreen({ theme, content }: ScreenProps) {
  const [heroIndex, setHeroIndex] = useState(0);

  const slides = content.home.heroSlides;
  const active = Math.min(heroIndex, slides.length - 1);

  const featured = content.home.featuredItemIds
    .map((id) => itemById(content, id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <AppHeader theme={theme} />

      <div style={{ flex: '0 0 auto', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            gap: `${SLIDE_GAP}px`,
            padding: `0 ${TRACK_PADDING}px`,
            transform: `translateX(${trackOffset(active, slides.length)}px)`,
            transition: 'transform 320ms cubic-bezier(0.4, 0.1, 0.2, 1)',
          }}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.promoLabel}
              style={{
                flex: `0 0 ${SLIDE_WIDTH}px`,
                // The off-slides are dimmed rather than recoloured: mixing a
                // faded accent here would be a colour the resolver never
                // produced, and the owner would be judging a tint we invented.
                opacity: index === active ? 1 : 0.55,
                transition: 'opacity 240ms',
              }}
            >
              <ImageSlot
                theme={theme}
                height={152}
                label={slide.imageLabel}
                art={<HeroArt vertical={content.vertical} size={78} />}
              >
                <span
                  style={{
                    ...bodyText(theme, 'xs', { weight: 'bold', color: theme.accent.on }),
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    padding: '5px 9px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    background: theme.accent.base,
                    borderRadius: radius(theme.radius.full),
                  }}
                >
                  {slide.promoLabel}
                </span>
              </ImageSlot>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '3px',
          }}
        >
          {slides.map((slide, index) => (
            <button
              key={slide.promoLabel}
              type="button"
              aria-label={`Slide ${index + 1} of ${slides.length}`}
              aria-current={index === active}
              onClick={() => setHeroIndex(index)}
              style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: index === active ? '16px' : '5px',
                  height: '5px',
                  borderRadius: '3px',
                  background: index === active ? theme.primary.base : theme.surface.border,
                  transition: 'width 200ms, background 200ms',
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: '0 0 auto', padding: '14px 20px 0' }}>
        <div style={{ ...displayText(theme, 'md'), lineHeight: 1.2 }}>{content.home.headline}</div>
        <div style={{ ...bodyText(theme, 'md', { color: theme.text.secondary }), marginTop: '4px' }}>
          {content.home.subline}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <span
            style={{
              ...buttonSurface(theme),
              ...bodyText(theme, 'base', { weight: 'semibold', color: theme.button.foreground }),
              flex: 1,
              textAlign: 'center',
              padding: '11px 0',
            }}
          >
            {content.home.primaryActionLabel}
          </span>
          <span
            style={{
              ...bodyText(theme, 'base', { weight: 'medium' }),
              padding: '11px 14px',
              border: `1px solid ${theme.surface.border}`,
              borderRadius: radius(theme.radius.md),
            }}
          >
            {content.home.secondaryActionLabel}
          </span>
        </div>
      </div>

      {/* The grid is allowed to run past the fold, exactly as it does on a
          phone — clipping the last row is honest, padding it out is not. */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ ...displayText(theme, 'xs'), fontSize: '14px' }}>
            {content.home.listTitle}
          </span>
          <span
            style={bodyText(theme, 'sm', { weight: 'medium', color: theme.secondary.base })}
          >
            {content.home.listLinkLabel}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginTop: '11px',
          }}
        >
          {featured.map((item) => (
            <div
              key={item.id}
              style={{
                border: hairline(theme),
                borderRadius: radius(theme.radius.md),
                overflow: 'hidden',
                background: theme.surface.base,
              }}
            >
              <ImageSlot
                theme={theme}
                height={78}
                cornerRadius={0}
                art={
                  <ItemArt
                    vertical={content.vertical}
                    index={itemIndex(content, item.id)}
                    size={40}
                  />
                }
              >
                {item.tag ? (
                  <span
                    style={{
                      ...bodyText(theme, 'xs', { weight: 'bold', color: theme.accent.on }),
                      position: 'absolute',
                      top: '7px',
                      left: '7px',
                      padding: '3px 6px',
                      fontSize: '8.5px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      background: theme.accent.base,
                      borderRadius: radius(theme.radius.full),
                    }}
                  >
                    {item.tag}
                  </span>
                ) : null}
              </ImageSlot>

              <div style={{ padding: '9px 10px 10px' }}>
                {/* Two lines, fixed: the cards sit side by side, and a name
                    that wraps to three would push one price out of line. */}
                <div
                  style={{
                    ...bodyText(theme, 'md', { weight: 'semibold' }),
                    lineHeight: 1.25,
                    height: '31px',
                    overflow: 'hidden',
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginTop: '7px',
                  }}
                >
                  <span style={bodyText(theme, 'md', { weight: 'semibold' })}>
                    {money(content, item.price.amount)}
                  </span>
                  <span
                    style={{
                      ...buttonSurface(theme),
                      borderRadius: radius(theme.radius.full),
                      width: '24px',
                      height: '24px',
                      flex: '0 0 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="icon" style={{ fontSize: '15px', lineHeight: 1 }}>
                      add
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
