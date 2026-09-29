// A business's storefront theme: how its page looks, never how it works.
// Menus, cart, ordering and navigation always render the standard Kuppio
// way — a theme only changes colors, type, background, hero and
// decorations, so every shop feels like its own while staying easy to use.
//
// Stored per spot as jsonb: `storefront` (what customers see) and
// `storefront_draft` (what the owner is editing). Every field is optional in
// storage; resolveStorefront() fills gaps from DEFAULT_STOREFRONT, so older
// spots and partial themes always render.

export type HeroStyle =
  // Cover image with an overlapping logo and a name card (Kuppio default).
  | 'cover'
  // Big decorated title and tagline above a feature photo (Chismesito).
  | 'title'
  // Full-bleed photo with the headline written over it (Taza de Miel).
  | 'photo';

export type HeadingFont = 'system' | 'playfair';
export type AccentFont = 'none' | 'script' | 'handwritten';

export type BackgroundFit = 'fill' | 'tile' | 'fixed';

export interface StorefrontBackground {
  // Image URL, or a bundled `showcase:` key (see utils/storefrontImages).
  image: string | null;
  fit: BackgroundFit;
  // 10–100: tile width as % of screen width ('tile'), or image scale ('fixed').
  size: number;
  // 0–100: how strongly the image shows through over the background color.
  strength: number;
  // Stays put while the page scrolls over it.
  fixedWhileScrolling: boolean;
}

export type DecorationPlacement =
  | 'hero-top-left'
  | 'hero-top-right'
  | 'hero-bottom-left'
  | 'hero-bottom-right'
  | 'title-sides'
  | 'section-title-sides';

export type Decoration =
  | { kind: 'icon'; icon: string; color?: string; placement: DecorationPlacement; size?: number }
  | { kind: 'image'; image: string; placement: DecorationPlacement; size?: number }
  | { kind: 'text'; text: string; color?: string; placement: DecorationPlacement; size?: number };

export interface StorefrontHero {
  style: HeroStyle;
  image: string | null;
  logo: string | null;
  // Small caps label above the headline, e.g. "CAFÉ CON RAÍCES".
  eyebrow: string | null;
  // Defaults to the business name.
  headline: string | null;
  // Accent-font line, e.g. "Coffee with a little chisme".
  tagline: string | null;
  subtext: string | null;
  primaryCta: string;
  secondaryCta: string;
  // Primary always opens the menu; the secondary button either gives
  // directions ("Cómo Llegar") or also opens the menu ("Order Now").
  secondaryAction: 'directions' | 'menu';
}

// The Home tab is an ordered list of sections the owner can reorder, hide,
// duplicate and add to. Other tabs (Menu, Reels, Reviews, About) are fixed.
export type BlockType = 'favorites' | 'latest' | 'story' | 'hours' | 'offer' | 'gallery' | 'menuCategory';

export interface Block {
  id: string;
  type: BlockType;
  // Section heading; each type has a sensible default.
  title?: string;
  // Body text for 'story' and 'offer'. A story without text shows the
  // business description.
  text?: string;
  // 'menuCategory' shows the items of this menu section.
  sectionId?: string;
  hidden?: boolean;
}

export const BLOCK_LABELS: Record<BlockType, { name: string; hint: string; defaultTitle: string }> = {
  favorites: { name: 'Favorites row', hint: 'Your best sellers', defaultTitle: 'Popular today' },
  latest: { name: 'Latest reel', hint: 'Your newest video', defaultTitle: 'Latest from us' },
  story: { name: 'Our story', hint: 'A few lines about you', defaultTitle: 'Our story' },
  hours: { name: 'Hours', hint: 'When you’re open', defaultTitle: 'Hours' },
  offer: { name: 'Offer banner', hint: 'A deal or stamp card', defaultTitle: 'This week' },
  gallery: { name: 'Photo gallery', hint: 'Drinks, space, people', defaultTitle: 'Gallery' },
  menuCategory: { name: 'Menu category', hint: 'e.g. Matcha, Refreshers', defaultTitle: 'From our menu' },
};

export interface StorefrontTheme {
  version: 1;
  colors: {
    primary: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: HeadingFont;
    accent: AccentFont;
  };
  background: StorefrontBackground | null;
  cards: 'solid' | 'glass';
  // Over a background pattern: 'cards' puts each section on its own card
  // with the pattern showing between them; 'panel' puts everything on one
  // continuous panel, so the pattern only frames the edges.
  layout: 'cards' | 'panel';
  hero: StorefrontHero;
  decorations: Decoration[];
  // null until the owner arranges sections; defaultBlocks() fills in.
  blocks: Block[] | null;
  sections: {
    favoritesTitle: string;
    showLatest: boolean;
    menuLayout: 'grid' | 'list';
  };
}

// A theme as stored — anything can be missing.
export type StoredStorefront = {
  [K in keyof StorefrontTheme]?: StorefrontTheme[K] extends object
    ? Partial<StorefrontTheme[K]> | null
    : StorefrontTheme[K];
};

export const DEFAULT_STOREFRONT: StorefrontTheme = {
  version: 1,
  colors: { primary: '#EE4C6A', background: '#FFFBF5', text: '#241F1B' },
  fonts: { heading: 'system', accent: 'none' },
  background: null,
  cards: 'solid',
  layout: 'cards',
  hero: {
    style: 'cover',
    image: null,
    logo: null,
    eyebrow: null,
    headline: null,
    tagline: null,
    subtext: null,
    primaryCta: 'Order ahead',
    secondaryCta: 'Directions',
    secondaryAction: 'directions',
  },
  decorations: [],
  blocks: null,
  sections: { favoritesTitle: 'Popular today', showLatest: true, menuLayout: 'grid' },
};

// ── Menu v2 ─────────────────────────────────────────────────────────────

export interface MenuOptionChoice {
  id: string;
  name: string;
  // Added to the item's base price.
  price: number;
}

export interface MenuOptionGroup {
  id: string;
  name: string; // "Size", "Milk", "Add-ons"
  required: boolean;
  // true = pick any number (add-ons); false = pick one (size, milk).
  multiple: boolean;
  choices: MenuOptionChoice[];
}

export interface MenuSection {
  id: string;
  name: string;
  // Optional line under the section title, e.g. "Flavors that taste like Mexico."
  description?: string;
}

export interface SelectedOption {
  groupId: string;
  choiceId: string;
}
