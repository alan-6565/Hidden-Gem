import { readableTextFor } from './storefrontTheme';
import {
  CanvasItem,
  ElementFont,
  ElementStyle,
  HeaderElementId,
  HeroStyle,
  StorefrontTheme,
} from '../types/storefront';

// The header canvas is designed at 390pt wide and scaled to the screen, so
// a layout an owner drags together looks the same on every phone.
export const DESIGN_WIDTH = 390;

// Canvas height as a fraction of its width (not counting the status bar).
export function canvasAspect(style: HeroStyle) {
  if (style === 'title') return 1.32;
  if (style === 'photo') return 1.12;
  return 0.42; // cover band above the name card
}

// Where the header photo sits inside the canvas, as % of canvas height.
export function photoBand(style: HeroStyle): { top: number; bottom: number } {
  if (style === 'title') return { top: 29, bottom: 86 };
  return { top: 0, bottom: 100 };
}

export const HEADER_ELEMENTS: HeaderElementId[] = ['eyebrow', 'name', 'tagline', 'intro', 'primaryButton', 'secondaryButton'];

function themeFont(theme: StorefrontTheme, role: 'heading' | 'accent'): ElementFont {
  if (role === 'heading') return theme.fonts.heading === 'playfair' ? 'serif' : 'clean';
  if (theme.fonts.accent === 'script') return 'script';
  if (theme.fonts.accent === 'handwritten') return 'handwritten';
  return 'clean';
}

// Default look and position of each built-in element for a header style —
// these reproduce the original fixed layouts, so nothing moves until the
// owner drags it.
export function defaultElement(theme: StorefrontTheme, id: string): ElementStyle {
  const { primary } = theme.colors;
  // Same readable text color the rest of the page uses.
  const text = readableTextFor(theme.colors.background, theme.colors.text);
  const style = theme.hero.style;
  const onPhoto = style === 'photo';
  const serifName = themeFont(theme, 'heading');
  const accent = themeFont(theme, 'accent');

  if (style === 'photo') {
    switch (id) {
      case 'eyebrow':
        return { x: 40, y: 40, w: 72, size: 12, font: 'clean', align: 'left', color: '#FFFFFF' };
      case 'name':
        return { x: 46, y: 45, w: 84, size: 36, font: serifName, align: 'left', color: '#FFFFFF' };
      case 'tagline':
        return { x: 46, y: 56, w: 84, size: 22, font: accent, align: 'left', color: '#FFFFFF' };
      case 'intro':
        return { x: 40, y: 64, w: 72, size: 14, font: 'clean', align: 'left', color: 'rgba(255,255,255,0.92)' };
      case 'primaryButton':
        return { x: 27, y: 86, w: 46, variant: 'filled', fill: primary };
      case 'secondaryButton':
        return { x: 73, y: 86, w: 46, variant: 'outline', textColor: '#FFFFFF' };
    }
  }
  // 'title' (and the cover band, which only holds canvas items)
  switch (id) {
    case 'eyebrow':
      return { x: 50, y: 0, w: 80, size: 12, font: 'clean', align: 'center', color: text };
    case 'name':
      return { x: 50, y: 3, w: 92, size: 32, font: serifName, align: 'center', color: text };
    case 'tagline':
      return {
        x: 50,
        y: 11,
        w: 92,
        size: accent === 'clean' ? 17 : 26,
        font: accent,
        align: 'center',
        color: primary,
      };
    case 'intro':
      return { x: 50, y: 19, w: 76, size: 14, font: 'clean', align: 'center', color: text };
    case 'primaryButton':
      return { x: 27, y: 89, w: 44, variant: 'filled', fill: primary };
    case 'secondaryButton':
      return { x: 73, y: 89, w: 44, variant: 'outline', textColor: onPhoto ? '#FFFFFF' : text };
  }
  return {};
}

export function defaultItem(theme: StorefrontTheme, item: CanvasItem, index: number): ElementStyle {
  const onPhoto = theme.hero.style === 'photo';
  if (item.kind === 'sticker') return { x: 80, y: 3, w: 30 };
  // Text notes default to the top corner, like the old handwritten note.
  return {
    x: index % 2 === 0 ? 76 : 26,
    y: 4,
    w: 44,
    size: 24,
    font: theme.fonts.accent === 'handwritten' ? 'handwritten' : 'script',
    align: 'center',
    color: onPhoto ? '#FFFFFF' : theme.colors.primary,
  };
}

export function resolveElement(theme: StorefrontTheme, id: string, fallback?: ElementStyle): ElementStyle {
  return { ...(fallback ?? defaultElement(theme, id)), ...(theme.elements[id] ?? {}) };
}

// The owner's extra header items. Themes from before canvas items existed
// keep their handwritten note and sticker (they were decorations then).
export function canvasItems(theme: StorefrontTheme): CanvasItem[] {
  if (theme.canvasItems) return theme.canvasItems;
  const items: CanvasItem[] = [];
  for (const d of theme.decorations) {
    if (d.kind === 'text') items.push({ id: 'note', kind: 'text', text: d.text });
    if (d.kind === 'image') items.push({ id: 'sticker', kind: 'sticker', image: d.image });
  }
  return items;
}

// Loaded font for an element; undefined means the system font ('clean').
export function fontFamily(font: ElementFont | undefined) {
  switch (font) {
    case 'serif':
      return 'PlayfairDisplay_800ExtraBold';
    case 'script':
      return 'DancingScript_700Bold';
    case 'handwritten':
      return 'Caveat_600SemiBold';
    default:
      return undefined;
  }
}

export const FONT_LABELS: Record<ElementFont, string> = {
  clean: 'Clean',
  serif: 'Serif',
  script: 'Script',
  handwritten: 'Handwritten',
};
