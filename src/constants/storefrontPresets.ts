import { DEFAULT_STOREFRONT, StorefrontTheme } from '../types/storefront';

// Starting points for the storefront editor. Applying a preset changes the
// look (colors, fonts, hero style, layout) but keeps the shop's own photos,
// logo, text and background image.
export interface StorefrontPreset {
  id: string;
  name: string;
  look: Pick<StorefrontTheme, 'colors' | 'fonts' | 'cards' | 'layout'> & {
    heroStyle: StorefrontTheme['hero']['style'];
    menuLayout: StorefrontTheme['sections']['menuLayout'];
    titleAccent: TitleAccent;
  };
}

export type TitleAccent = 'none' | 'flower' | 'leaf-outline' | 'heart' | 'sparkles';

export const PRESETS: StorefrontPreset[] = [
  {
    id: 'kuppio',
    name: 'Kuppio',
    look: {
      colors: DEFAULT_STOREFRONT.colors,
      fonts: { heading: 'system', accent: 'none' },
      cards: 'solid',
      layout: 'cards',
      heroStyle: 'cover',
      menuLayout: 'grid',
      titleAccent: 'none',
    },
  },
  {
    id: 'playful',
    name: 'Playful Café',
    look: {
      colors: { primary: '#C9577B', background: '#FFF7F3', text: '#4B1F24' },
      fonts: { heading: 'playfair', accent: 'script' },
      cards: 'solid',
      layout: 'cards',
      heroStyle: 'title',
      menuLayout: 'grid',
      titleAccent: 'flower',
    },
  },
  {
    id: 'minimal',
    name: 'Modern Minimal',
    look: {
      colors: { primary: '#2F2F2F', background: '#FFFFFF', text: '#161616' },
      fonts: { heading: 'system', accent: 'none' },
      cards: 'solid',
      layout: 'cards',
      heroStyle: 'photo',
      menuLayout: 'list',
      titleAccent: 'none',
    },
  },
  {
    id: 'bold',
    name: 'Bold & Modern',
    look: {
      colors: { primary: '#E94F6D', background: '#FFF9F4', text: '#2B211C' },
      fonts: { heading: 'system', accent: 'script' },
      cards: 'solid',
      layout: 'panel',
      heroStyle: 'cover',
      menuLayout: 'grid',
      titleAccent: 'none',
    },
  },
  {
    id: 'raices',
    name: 'Café con Raíces',
    look: {
      colors: { primary: '#D17C32', background: '#FAF3E6', text: '#3A2A1F' },
      fonts: { heading: 'playfair', accent: 'handwritten' },
      cards: 'solid',
      layout: 'cards',
      heroStyle: 'photo',
      menuLayout: 'list',
      titleAccent: 'leaf-outline',
    },
  },
];

export const SWATCHES = {
  primary: ['#EE4C6A', '#E94F6D', '#C9577B', '#B5452B', '#D17C32', '#C99A2E', '#8A8F4E', '#2E7D6B', '#3B6FB6', '#6B4FA0', '#2F2F2F'],
  background: ['#FFFFFF', '#FFFBF5', '#FFF7F3', '#FAF3E6', '#FDF2E9', '#F3F6F1', '#F2F4F8', '#F7F0FA', '#1C1917'],
  text: ['#111111', '#241F1B', '#2B211C', '#3A2A1F', '#4B1F24', '#1F2A44', '#2E3B2F', '#FFFFFF'],
};

export const TITLE_ACCENTS: { id: TitleAccent; label: string; icon: string | null }[] = [
  { id: 'none', label: 'None', icon: null },
  { id: 'flower', label: 'Flowers', icon: 'flower' },
  { id: 'leaf-outline', label: 'Leaves', icon: 'leaf-outline' },
  { id: 'heart', label: 'Hearts', icon: 'heart' },
  { id: 'sparkles', label: 'Sparkles', icon: 'sparkles' },
];
