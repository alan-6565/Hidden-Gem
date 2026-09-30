import { useFonts } from 'expo-font';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { PlayfairDisplay_800ExtraBold } from '@expo-google-fonts/playfair-display/800ExtraBold';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script/700Bold';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat/600SemiBold';
import { ThemeColors, lightColors } from '../theme';
import {
  Block,
  DEFAULT_STOREFRONT,
  StoredStorefront,
  StorefrontTheme,
} from '../types/storefront';
import { MenuItem } from '../types';

// Loaded once at app start (App.tsx); text falls back to the system font
// until they're ready, so nothing waits on them.
export function useStorefrontFonts() {
  return useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    DancingScript_700Bold,
    Caveat_600SemiBold,
  });
}

export function resolveStorefront(stored: StoredStorefront | null | undefined): StorefrontTheme {
  const s = stored ?? {};
  const d = DEFAULT_STOREFRONT;
  return {
    version: 1,
    colors: { ...d.colors, ...(s.colors ?? {}) },
    fonts: { ...d.fonts, ...(s.fonts ?? {}) },
    background: s.background ? { ...BACKGROUND_DEFAULTS, ...s.background } : null,
    cards: s.cards ?? d.cards,
    layout: s.layout ?? d.layout,
    hero: { ...d.hero, ...(s.hero ?? {}) },
    decorations: (s.decorations as StorefrontTheme['decorations']) ?? d.decorations,
    blocks: (s.blocks as StorefrontTheme['blocks']) ?? null,
    elements: (s.elements as StorefrontTheme['elements']) ?? {},
    canvasItems: (s.canvasItems as StorefrontTheme['canvasItems']) ?? null,
    sections: { ...d.sections, ...(s.sections ?? {}) },
  };
}

const BACKGROUND_DEFAULTS = {
  image: null,
  fit: 'fill' as const,
  size: 60,
  strength: 40,
  fixedWhileScrolling: true,
};

// The Home tab's sections, in order. Themes saved before sections existed
// get the layout they always had: cover pages open with "About", the
// others lead with favorites and end with the story.
export function homeBlocks(theme: StorefrontTheme, businessName: string): Block[] {
  if (theme.blocks) return theme.blocks;
  const about: Block = {
    id: 'story',
    type: 'story',
    title: theme.hero.style === 'cover' ? `About ${businessName}` : 'Our story',
  };
  const favorites: Block = { id: 'favorites', type: 'favorites', title: theme.sections.favoritesTitle };
  const latest: Block = { id: 'latest', type: 'latest', title: `Latest from ${businessName}`, hidden: !theme.sections.showLatest };
  return theme.hero.style === 'cover' ? [about, favorites, latest] : [favorites, latest, about];
}

// ── Fonts ───────────────────────────────────────────────────────────────

export function headingFont(theme: StorefrontTheme, weight: 'bold' | 'extraBold' = 'bold') {
  if (theme.fonts.heading !== 'playfair') return undefined;
  return weight === 'extraBold' ? 'PlayfairDisplay_800ExtraBold' : 'PlayfairDisplay_700Bold';
}

export function accentFont(theme: StorefrontTheme) {
  if (theme.fonts.accent === 'script') return 'DancingScript_700Bold';
  if (theme.fonts.accent === 'handwritten') return 'Caveat_600SemiBold';
  return undefined;
}

// ── Colors ──────────────────────────────────────────────────────────────

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

// amount 0 = a, 1 = b
export function mix(a: string, b: string, amount: number) {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return toHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * amount) as [number, number, number]);
}

export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function luminance(hex: string) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio (1–21). 4.5+ is comfortable for body text.
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Label color for a button filled with `bg`. White wherever it's readable
// for bold button text (3:1, the large/bold text standard) — that's the look
// brand buttons are designed for — and near-black only on light fills.
export function onColor(bg: string) {
  return contrastRatio('#FFFFFF', bg) >= 3 ? '#FFFFFF' : '#1A1A1A';
}

// The whole spot page is drawn from a ThemeColors palette, so a storefront
// theme just produces a different one. Spots without a custom storefront
// keep following the app's light/dark mode; a custom storefront is the
// business's brand and looks the same for everyone.
export function storefrontPalette(
  theme: StorefrontTheme,
  appColors: ThemeColors,
  hasCustomStorefront: boolean,
): ThemeColors {
  if (!hasCustomStorefront) return appColors;
  const { primary, background } = theme.colors;
  // Never render unreadable body text, whatever was saved (e.g. dark text
  // left over after switching to a dark page).
  const text = readableTextFor(background, theme.colors.text);
  // On a dark page, cards are a slightly lighter shade of the page (a light
  // mix turned dark pages into muddy grey).
  const dark = luminance(background) < 0.18;
  const solidCard = dark ? mix(background, '#FFFFFF', 0.08) : mix(background, '#FFFFFF', 0.7);
  return {
    ...lightColors,
    background,
    card: theme.cards === 'glass' ? withAlpha(solidCard, 0.82) : solidCard,
    primary,
    primaryDark: mix(primary, '#000000', 0.18),
    primaryMuted: mix(primary, background, 0.85),
    cream: mix(text, background, 0.92),
    blush: mix(primary, background, 0.9),
    text,
    textMuted: mix(text, background, 0.42),
    border: mix(text, background, dark ? 0.8 : 0.86),
  };
}

// Readable body text for a page background: keeps the current text color if
// it reads well, otherwise near-white on dark pages and near-black on light.
export function readableTextFor(background: string, current: string) {
  if (contrastRatio(current, background) >= 4.5) return current;
  return luminance(background) < 0.18 ? '#F7F4F2' : '#241F1B';
}

// ── Menu helpers ────────────────────────────────────────────────────────

export function isSoldOut(item: MenuItem, now = new Date()) {
  if (item.soldOut) return true;
  return !!item.soldOutUntil && new Date(item.soldOutUntil) > now;
}

// Lowest possible price: base plus the cheapest choice of each required group.
export function fromPrice(item: MenuItem) {
  let price = item.price;
  for (const group of item.options ?? []) {
    if (group.required && group.choices.length > 0) {
      price += Math.min(...group.choices.map((c) => c.price));
    }
  }
  return price;
}

export function formatPrice(n: number) {
  return `$${n.toFixed(2)}`;
}
