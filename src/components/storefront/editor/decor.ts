import { Decoration, DecorationPlacement, StorefrontTheme } from '../../../types/storefront';
import { StorefrontPreset, TITLE_ACCENTS, TitleAccent } from '../../../constants/storefrontPresets';
import { mix } from '../../../utils/storefrontTheme';

// ── Decorations <-> simple editor controls ──────────────────────────────
// The editor offers a few friendly choices instead of raw placement data:
// a title accent (flowers, leaves…), whether it also appears in the header
// corners, a short handwritten note, and one uploaded sticker.
export interface DecorChoices {
  accent: TitleAccent;
  corners: boolean;
  note: string;
  sticker: string | null;
}

export function readDecor(decorations: Decoration[]): DecorChoices {
  const titleIcon = decorations.find((d) => d.kind === 'icon' && d.placement === 'title-sides');
  const sectionIcon = decorations.find((d) => d.kind === 'icon' && d.placement === 'section-title-sides');
  const icon = (titleIcon ?? sectionIcon) as Extract<Decoration, { kind: 'icon' }> | undefined;
  const accent = (TITLE_ACCENTS.find((a) => a.icon === icon?.icon)?.id ?? 'none') as TitleAccent;
  const corners = decorations.some(
    (d) => d.kind === 'icon' && (d.placement === 'hero-top-left' || d.placement === 'hero-bottom-right'),
  );
  const note = decorations.find((d) => d.kind === 'text') as Extract<Decoration, { kind: 'text' }> | undefined;
  const sticker = decorations.find((d) => d.kind === 'image') as Extract<Decoration, { kind: 'image' }> | undefined;
  return { accent, corners, note: note?.text ?? '', sticker: sticker?.image ?? null };
}

export function buildDecor(choices: DecorChoices, theme: StorefrontTheme): Decoration[] {
  const out: Decoration[] = [];
  const icon = TITLE_ACCENTS.find((a) => a.id === choices.accent)?.icon;
  const tint = mix(theme.colors.primary, theme.colors.background, 0.3);
  if (icon) {
    out.push({ kind: 'icon', icon, color: tint, placement: 'title-sides', size: 22 });
    out.push({ kind: 'icon', icon, color: tint, placement: 'section-title-sides', size: 16 });
    if (choices.corners) {
      out.push({ kind: 'icon', icon, color: tint, placement: 'hero-top-left', size: 26 });
      out.push({ kind: 'icon', icon, color: tint, placement: 'hero-bottom-right', size: 30 });
    }
  }
  const noteCorner: DecorationPlacement = choices.sticker ? 'hero-top-left' : 'hero-top-right';
  if (choices.note.trim()) {
    out.push({
      kind: 'text',
      text: choices.note.trim(),
      // White reads best over a full photo; the brand color everywhere else.
      color: theme.hero.style === 'photo' ? '#FFFFFF' : theme.colors.primary,
      placement: noteCorner,
      size: 24,
    });
  }
  if (choices.sticker) {
    out.push({ kind: 'image', image: choices.sticker, placement: 'hero-top-right', size: 96 });
  }
  return out;
}

export function applyPreset(theme: StorefrontTheme, preset: StorefrontPreset): StorefrontTheme {
  return {
    ...theme,
    colors: preset.look.colors,
    fonts: preset.look.fonts,
    cards: preset.look.cards,
    layout: preset.look.layout,
    hero: { ...theme.hero, style: preset.look.heroStyle },
    sections: { ...theme.sections, menuLayout: preset.look.menuLayout },
  };
}

