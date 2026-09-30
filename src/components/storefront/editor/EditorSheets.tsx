import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { useAppData } from '../../../context/DataContext';
import { MenuItem } from '../../../types';
import { BLOCK_LABELS, BlockType, ElementFont, ElementStyle } from '../../../types/storefront';
import { canvasItems as canvasItemsOf, defaultItem, FONT_LABELS, fontFamily, resolveElement } from '../../../utils/headerLayout';
import { PRESETS, SWATCHES, TITLE_ACCENTS } from '../../../constants/storefrontPresets';
import { contrastRatio, onColor } from '../../../utils/storefrontTheme';
import { radius, spacing, ThemeColors } from '../../../theme';
import ValueSlider from './ValueSlider';
import { applyPreset } from './decor';
import { ColorRow, EditorUI, Field, ImagePickerRow, makeEditorStyles, Section, Segmented, useUI } from './controls';
import { StorefrontEditor } from './useStorefrontEditor';

// The bottom panels edit mode opens. They cover the lower part of the
// screen only, so the storefront above keeps updating live behind them.
export default function EditorSheets({ ed }: { ed: StorefrontEditor }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // A % max height collapses inside the keyboard wrapper, so use pixels.
  const { height: windowHeight } = useWindowDimensions();
  // The color wheel locks scrolling while it's dragged, or the panel would scroll instead.
  const [scrollLocked, setScrollLocked] = React.useState(false);
  const ui = React.useMemo(() => ({ styles: makeEditorStyles(colors), colors, setScrollLocked }), [colors]);
  const frame = React.useMemo(() => makeFrameStyles(colors), [colors]);
  const sheet = ed.sheet;
  if (!sheet) return null;

  const title =
    sheet.kind === 'page'
      ? 'Page'
      : sheet.kind === 'element'
        ? sheet.id === 'photo'
          ? 'Header photo'
          : sheet.id === 'logo'
            ? 'Logo'
            : `Edit ${ELEMENT_NAMES[sheet.id]?.toLowerCase() ?? (ed.isItem(sheet.id) ? 'text' : 'element')}`
        : sheet.kind === 'add'
          ? 'Add a section'
          : sheet.kind === 'arrange'
            ? 'Arrange your page'
            : sheet.kind === 'item'
              ? 'Edit menu item'
              : 'Edit section';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={ed.closeSheet}>
      <EditorUI.Provider value={ui}>
        {/* The dim layer covers the whole screen and the panel is pinned to
            the bottom, so nothing shows through underneath it. */}
        <View style={frame.root}>
        <Pressable style={[StyleSheet.absoluteFill, frame.backdrop]} onPress={ed.closeSheet} accessibilityLabel="Close panel" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[frame.sheet, { maxHeight: windowHeight * 0.64, paddingBottom: insets.bottom + spacing.sm }]}>
            <View style={frame.grab} />
            <View style={frame.headerRow}>
              <Text style={frame.title}>{title}</Text>
              <Pressable onPress={ed.closeSheet} style={frame.done} hitSlop={8}>
                <Text style={frame.doneText}>Done</Text>
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              // Size to the content (up to the panel's max height) instead of
              // collapsing, which hid the photo panel's buttons.
              style={frame.scroll}
              contentContainerStyle={frame.body}
              scrollEnabled={!scrollLocked}
            >
              {sheet.kind === 'page' && <PagePanel ed={ed} />}
              {sheet.kind === 'element' && <ElementPanel ed={ed} id={sheet.id} />}
              {sheet.kind === 'block' && (
                <View style={frame.padded}>
                  <BlockPanel ed={ed} id={sheet.id} />
                </View>
              )}
              {sheet.kind === 'add' && <AddPanel ed={ed} index={sheet.index} />}
              {sheet.kind === 'arrange' && <ArrangePanel ed={ed} />}
              {sheet.kind === 'item' && (
                <View style={frame.padded}>
                  <ItemPanel ed={ed} itemId={sheet.itemId} />
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
        </View>
      </EditorUI.Provider>
    </Modal>
  );
}

// ── Page: settings that really are page-wide ────────────────────────────
// Everything that belongs to one element (text, color, size, position)
// lives on that element's own pencil instead.
function PagePanel({ ed }: { ed: StorefrontEditor }) {
  const { styles, colors } = useUI();
  const { theme, setBase, decor, setDecor, set, setColors, setBackground, setSections, upload, uploading } = ed;
  const bg = theme.background;
  const textContrast = contrastRatio(theme.colors.text, theme.colors.background);
  const buttonContrast = contrastRatio(onColor(theme.colors.primary), theme.colors.primary);
  const readable = textContrast >= 4.5 && buttonContrast >= 3;
  // Presets are the whole first screen: tap one, see it on the page, done.
  // Everything granular waits behind "Customize further" (from #34).
  const [advanced, setAdvanced] = React.useState(false);
  const hiddenIds = Object.entries(theme.elements)
    .filter(([id, el]) => el.hidden && id in ELEMENT_NAMES)
    .map(([id]) => id);
  const activePreset = PRESETS.find(
    (p) =>
      p.look.colors.primary.toUpperCase() === theme.colors.primary.toUpperCase() &&
      p.look.colors.background.toUpperCase() === theme.colors.background.toUpperCase() &&
      p.look.fonts.heading === theme.fonts.heading,
  );
  return (
    <>
      <Text style={[styles.hint, styles.presetIntro]}>
        Pick a look. It changes colors, fonts and layout; your photos, logo and words stay.
      </Text>
      <View style={styles.presetGrid}>
        {PRESETS.map((p) => {
          const on = activePreset?.id === p.id;
          return (
            <Pressable
              key={p.id}
              style={[styles.presetCard, on && styles.presetCardOn]}
              onPress={() => {
                setBase((t) => applyPreset(t, p));
                setDecor((d) => ({ ...d, accent: p.look.titleAccent }));
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <View style={[styles.presetPreview, { backgroundColor: p.look.colors.background }]}>
                <Text
                  style={{
                    color: p.look.colors.text,
                    fontFamily: p.look.fonts.heading === 'playfair' ? 'PlayfairDisplay_700Bold' : undefined,
                    fontWeight: '800',
                    fontSize: 18,
                  }}
                >
                  Aa
                </Text>
                <View style={[styles.presetButton, { backgroundColor: p.look.colors.primary }]}>
                  <Text style={[styles.presetButtonText, { color: onColor(p.look.colors.primary) }]}>Order</Text>
                </View>
              </View>
              <View style={styles.presetLabelRow}>
                <Text style={styles.presetName}>{p.name}</Text>
                {on && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Section icon="add-circle-outline" title="Add to your header">
        <Text style={styles.hint}>Drag it where you want it, then tap it to change the text, font, size or color.</Text>
        <View style={styles.imageButtons}>
          <Pressable
            style={styles.smallButton}
            onPress={() => {
              ed.addItem({ kind: 'text', text: 'Good coffee, better days' });
              ed.closeSheet();
            }}
          >
            <Ionicons name="text-outline" size={14} color={colors.primary} />
            <Text style={styles.smallButtonText}>Text</Text>
          </Pressable>
          <Pressable
            style={styles.smallButton}
            disabled={uploading !== null}
            onPress={() =>
              upload('sticker', (url) => {
                ed.addItem({ kind: 'sticker', image: url });
                ed.closeSheet();
              })
            }
          >
            <Ionicons name="happy-outline" size={14} color={colors.primary} />
            <Text style={styles.smallButtonText}>{uploading === 'sticker' ? 'Uploading…' : 'Sticker'}</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>Stickers: a PNG with a transparent background works best.</Text>
      </Section>

      {hiddenIds.length > 0 && (
        <Section icon="eye-off-outline" title="Hidden from your page">
          {hiddenIds.map((id) => (
            <View key={id} style={styles.switchRow}>
              <Text style={[styles.fieldLabel, { flex: 1 }]}>{ELEMENT_NAMES[id] ?? id}</Text>
              <Pressable style={styles.smallButton} onPress={() => ed.setElement(id, { hidden: false })}>
                <Ionicons name="eye-outline" size={14} color={colors.primary} />
                <Text style={styles.smallButtonText}>Show</Text>
              </Pressable>
            </View>
          ))}
        </Section>
      )}

      <Section icon="browsers-outline" title="Header style">
        <Segmented
          options={[
            { id: 'cover', label: 'Cover' },
            { id: 'title', label: 'Big title' },
            { id: 'photo', label: 'Full photo' },
          ]}
          value={theme.hero.style}
          onChange={(style) => ed.setHero({ style })}
        />
        <Text style={styles.hint}>
          {theme.hero.style === 'cover'
            ? 'A cover image with your logo and name card underneath.'
            : theme.hero.style === 'title'
              ? 'Your name and tagline in big type above a photo. Drag anything anywhere.'
              : 'A full-screen photo with your words on top. Drag anything anywhere.'}
        </Text>
      </Section>

      <Pressable style={styles.moreToggle} onPress={() => setAdvanced((v) => !v)} accessibilityRole="button">
        <Ionicons name="options-outline" size={16} color={colors.text} />
        <Text style={styles.moreToggleText}>{advanced ? 'Hide extra options' : 'Customize further'}</Text>
        <Ionicons name={advanced ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>
      {!advanced && (
        <Text style={[styles.hint, styles.presetIntro]}>Page background and pattern, accent color, layout and title decorations.</Text>
      )}

      {advanced && (
      <>
      <View style={[styles.readableInline, { backgroundColor: readable ? colors.successMuted : colors.goldMuted }]}>
        <Ionicons name={readable ? 'checkmark-circle' : 'warning-outline'} size={14} color={readable ? colors.success : '#9A6200'} />
        <Text style={[styles.readableText, { color: readable ? colors.success : '#9A6200' }]}>
          {readable ? 'Readable: text and buttons are easy to read' : textContrast < 4.5 ? 'Text may be hard to read on this background' : 'Button text may be hard to read'}
        </Text>
      </View>
  {/* ── Colors ── */}
  <Section icon="brush-outline" title="Colors">
    <ColorRow label="Accent: buttons, prices, tabs" value={theme.colors.primary} swatches={SWATCHES.primary} onChange={(c) => setColors({ primary: c })} />
    <ColorRow label="Page background" value={theme.colors.background} swatches={SWATCHES.background} onChange={(c) => setColors({ background: c })} />
    <ColorRow label="Body text: menus, reviews" value={theme.colors.text} swatches={SWATCHES.text} onChange={(c) => setColors({ text: c })} />
  </Section>

  {/* ── Background ── */}
  <Section icon="image-outline" title="Background">
    <ImagePickerRow
      label="Background image"
      hint="A pattern or texture. Menus and prices always sit on solid cards over it."
      value={bg?.image ?? null}
      busy={uploading === 'background'}
      disabled={uploading !== null}
      onPick={() => upload('background', (url) => setBackground({ image: url }))}
      onRemove={() => set({ background: null })}
    />
    {bg?.image && (
      <>
        <Text style={[styles.fieldLabel, styles.gapTop]}>Fit</Text>
        <Segmented
          options={[
            { id: 'fill', label: 'Fill' },
            { id: 'tile', label: 'Tile' },
            { id: 'fixed', label: 'Fixed' },
          ]}
          value={bg.fit}
          onChange={(fit) => setBackground({ fit })}
        />
        <Text style={styles.hint}>
          {bg.fit === 'fill'
            ? 'Covers the whole screen (cropped if needed).'
            : bg.fit === 'tile'
              ? 'Repeats the image. Best with seamless patterns.'
              : 'Shows the image once at the top.'}
        </Text>
        {bg.fit !== 'fill' && (
          <ValueSlider
            label="Pattern size"
            value={bg.size}
            min={10}
            onChange={(size) => setBackground({ size })}
            colors={colors}
          />
        )}
        <ValueSlider
          label="Strength"
          value={bg.strength}
          onChange={(strength) => setBackground({ strength })}
          colors={colors}
        />
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Keep fixed while scrolling</Text>
            <Text style={styles.hint}>The background stays put as customers scroll.</Text>
          </View>
          <Switch
            value={bg.fixedWhileScrolling}
            onValueChange={(fixedWhileScrolling) => setBackground({ fixedWhileScrolling })}
          />
        </View>
      </>
    )}
  </Section>

  {/* ── Layout ── */}
  <Section icon="albums-outline" title="Layout">
    {bg?.image ? (
      <>
        <Text style={styles.fieldLabel}>Over the background</Text>
        <Segmented
          options={[
            { id: 'cards', label: 'Separate cards' },
            { id: 'panel', label: 'One panel' },
          ]}
          value={theme.layout}
          onChange={(layout) => set({ layout })}
        />
        <Text style={styles.hint}>
          {theme.layout === 'panel'
            ? 'Everything on one panel. The background frames the edges.'
            : 'Each section on its own card. The background shows between them.'}
        </Text>
      </>
    ) : null}
    <Text style={[styles.fieldLabel, styles.gapTop]}>Cards</Text>
    <Segmented
      options={[
        { id: 'solid', label: 'Solid' },
        { id: 'glass', label: 'Glass' },
      ]}
      value={theme.cards}
      onChange={(cards) => set({ cards })}
    />
    <Text style={[styles.fieldLabel, styles.gapTop]}>Menu</Text>
    <Segmented
      options={[
        { id: 'grid', label: 'Photo grid' },
        { id: 'list', label: 'List' },
      ]}
      value={theme.sections.menuLayout}
      onChange={(menuLayout) => setSections({ menuLayout })}
    />
  </Section>

  {/* ── Fonts ── */}
  <Section icon="text-outline" title="Fonts">
    <Text style={styles.fieldLabel}>Headings</Text>
    <Segmented
      options={[
        { id: 'system', label: 'Clean' },
        { id: 'playfair', label: 'Editorial serif' },
      ]}
      value={theme.fonts.heading}
      onChange={(heading) => setBase((t) => ({ ...t, fonts: { ...t.fonts, heading } }))}
    />
    <Text style={[styles.fieldLabel, styles.gapTop]}>Tagline & notes</Text>
    <Segmented
      options={[
        { id: 'none', label: 'Plain' },
        { id: 'script', label: 'Script' },
        { id: 'handwritten', label: 'Handwritten' },
      ]}
      value={theme.fonts.accent}
      onChange={(accentFont) => setBase((t) => ({ ...t, fonts: { ...t.fonts, accent: accentFont } }))}
    />
  </Section>

  {/* ── Decorations ── */}
  <Section icon="flower-outline" title="Decorations">
    <Text style={styles.fieldLabel}>Around your name and section titles</Text>
    <View style={styles.accentRow}>
      {TITLE_ACCENTS.map((a) => (
        <Pressable
          key={a.id}
          style={[styles.accentChip, decor.accent === a.id && styles.accentChipOn]}
          onPress={() => setDecor((d) => ({ ...d, accent: a.id }))}
        >
          {a.icon ? (
            <Ionicons name={a.icon as keyof typeof Ionicons.glyphMap} size={16} color={theme.colors.primary} />
          ) : (
            <Ionicons name="close" size={16} color={colors.textMuted} />
          )}
          <Text style={styles.accentLabel}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
    {decor.accent !== 'none' && (
      <View style={styles.switchRow}>
        <Text style={[styles.fieldLabel, { flex: 1 }]}>Also in the header corners</Text>
        <Switch value={decor.corners} onValueChange={(corners) => setDecor((d) => ({ ...d, corners }))} />
      </View>
    )}
  </Section>

      </>
      )}
      <Pressable
        style={styles.resetLink}
        onPress={() =>
          Alert.alert('Start over?', undefined, [
            { text: 'Discard unpublished changes', onPress: ed.discardChanges },
            {
              text: 'Reset to Kuppio look',
              style: 'destructive',
              onPress: () => {
                setBase((t) => ({ ...applyPreset(t, PRESETS[0]), background: null }));
                setDecor({ accent: 'none', corners: false, note: '', sticker: null });
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ])
        }
      >
        <Text style={styles.resetText}>Start over…</Text>
      </Pressable>
    </>
  );
}

// ── Header: photo, logo, words, buttons ───────────────────────────────────
const ELEMENT_NAMES: Record<string, string> = {
  eyebrow: 'Small label',
  name: 'Name',
  tagline: 'Tagline',
  intro: 'Intro',
  primaryButton: 'Main button',
  secondaryButton: 'Second button',
};

// Size slider runs 0–100; map it to 10–64pt text.
const toSlider = (size: number) => Math.round(((size - 10) / 54) * 100);
const fromSlider = (v: number) => Math.round(10 + (v / 100) * 54);

// ── One element: everything about just this thing ─────────────────────────
function ElementPanel({ ed, id }: { ed: StorefrontEditor; id: string }) {
  const { styles, colors } = useUI();
  const { theme, setHero, upload, uploading, spot } = ed;
  const pad = { paddingHorizontal: spacing.md };
  const palette = [theme.colors.primary, theme.colors.text, '#FFFFFF', ...SWATCHES.primary.slice(0, 8)];

  if (id === 'photo' || id === 'logo') {
    const photo = id === 'photo';
    return (
      <View style={pad}>
        <ImagePickerRow
          label={photo ? 'Header photo' : 'Logo'}
          hint={photo && theme.background && theme.hero.style === 'cover' ? 'Leave empty to use your background pattern as the cover.' : undefined}
          value={photo ? theme.hero.image : theme.hero.logo}
          busy={uploading === id}
          disabled={uploading !== null}
          onPick={() => upload(id, (url) => setHero(photo ? { image: url } : { logo: url }))}
          onRemove={() => setHero(photo ? { image: null } : { logo: null })}
        />
      </View>
    );
  }

  const item = currentItemsOf(ed).find((i) => i.id === id);
  const index = currentItemsOf(ed).findIndex((i) => i.id === id);
  const el = item ? resolveElement(theme, id, defaultItem(theme, item, index)) : resolveElement(theme, id);
  const set = (patch: Partial<ElementStyle>) => ed.setElement(id, patch);
  const isButton = id === 'primaryButton' || id === 'secondaryButton';
  const canMove = theme.hero.style !== 'cover' || !!item;

  const common = (
    <>
      {canMove && (
        <Pressable style={[styles.smallButton, styles.gapTop]} onPress={() => ed.resetElement(id, ['x', 'y', 'w'])}>
          <Ionicons name="refresh-outline" size={14} color={colors.primary} />
          <Text style={styles.smallButtonText}>Reset position</Text>
        </Pressable>
      )}
      <Pressable
        style={[styles.smallButton, styles.gapTop]}
        onPress={() => {
          ed.removeElement(id);
          ed.closeSheet();
        }}
      >
        <Ionicons name={item ? 'trash-outline' : 'eye-off-outline'} size={14} color={colors.danger} />
        <Text style={[styles.smallButtonText, { color: colors.danger }]}>
          {item ? 'Delete' : 'Hide (show it again from Page)'}
        </Text>
      </Pressable>
    </>
  );

  if (item?.kind === 'sticker') {
    return (
      <View style={pad}>
        <ImagePickerRow
          label="Sticker"
          value={item.image ?? null}
          busy={uploading === 'sticker'}
          disabled={uploading !== null}
          onPick={() => upload('sticker', (url) => ed.updateItem(id, { image: url }))}
          onRemove={() => ed.removeElement(id)}
        />
        <ValueSlider label="Size" value={el.w ?? 30} min={8} onChange={(w) => set({ w })} colors={colors} />
        {common}
      </View>
    );
  }

  if (isButton) {
    const primary = id === 'primaryButton';
    return (
      <View style={pad}>
        <Field
          label="Button text"
          value={primary ? theme.hero.primaryCta : theme.hero.secondaryCta}
          onChange={(v) => setHero(primary ? { primaryCta: v || 'Order ahead' } : { secondaryCta: v || 'Directions' })}
        />
        {!primary && (
          <>
            <Text style={[styles.fieldLabel, styles.gapTop]}>Opens</Text>
            <Segmented
              options={[
                { id: 'directions', label: 'Directions' },
                { id: 'menu', label: 'Menu' },
              ]}
              value={theme.hero.secondaryAction}
              onChange={(secondaryAction) => setHero({ secondaryAction })}
            />
          </>
        )}
        {primary && <Text style={styles.hint}>Opens your menu.</Text>}
        <Text style={[styles.fieldLabel, styles.gapTop]}>Style</Text>
        <Segmented
          options={[
            { id: 'filled', label: 'Filled' },
            { id: 'outline', label: 'Outline' },
          ]}
          value={el.variant ?? 'filled'}
          onChange={(variant) => set({ variant })}
        />
        <View style={styles.gapTop}>
          <ColorRow
            label={el.variant === 'outline' ? 'Border' : 'Fill'}
            value={el.fill ?? theme.colors.primary}
            swatches={palette}
            onChange={(fill) => set({ fill })}
          />
          <ColorRow
            label="Text"
            value={el.textColor ?? (el.variant === 'outline' ? theme.colors.text : onColor(el.fill ?? theme.colors.primary))}
            swatches={palette}
            onChange={(textColor) => set({ textColor })}
          />
        </View>
        {theme.hero.style !== 'cover' && (
          <ValueSlider label="Width" value={el.w ?? 44} min={20} onChange={(w) => set({ w })} colors={colors} />
        )}
        {common}
      </View>
    );
  }

  // Text: built-in (name, tagline, intro, label) or an added text item.
  const textValue = item
    ? item.text ?? ''
    : id === 'name'
      ? theme.hero.headline ?? ''
      : id === 'tagline'
        ? theme.hero.tagline ?? ''
        : id === 'intro'
          ? theme.hero.subtext ?? ''
          : theme.hero.eyebrow ?? '';
  const setText = (v: string) => {
    if (item) ed.updateItem(id, { text: v });
    else if (id === 'name') setHero({ headline: v || null });
    else if (id === 'tagline') setHero({ tagline: v || null });
    else if (id === 'intro') setHero({ subtext: v || null });
    else setHero({ eyebrow: v || null });
  };
  return (
    <View style={pad}>
      <Field
        label="Text"
        value={textValue}
        onChange={setText}
        placeholder={id === 'name' ? spot.name : 'Type something'}
        multiline={id === 'intro' || !!item}
      />
      <Text style={[styles.fieldLabel, styles.gapTop]}>Font</Text>
      <View style={styles.accentRow}>
        {(Object.keys(FONT_LABELS) as ElementFont[]).map((f) => (
          <Pressable key={f} style={[styles.accentChip, el.font === f && styles.accentChipOn]} onPress={() => set({ font: f })}>
            <Text style={[styles.accentLabel, { fontFamily: fontFamily(f) }]}>{FONT_LABELS[f]}</Text>
          </Pressable>
        ))}
      </View>
      <ValueSlider
        label={`Size · ${el.size ?? 16}pt`}
        value={toSlider(el.size ?? 16)}
        onChange={(v) => set({ size: fromSlider(v) })}
        colors={colors}
      />
      <View style={styles.gapTop}>
        <ColorRow label="Color" value={el.color && el.color.startsWith('#') ? el.color : theme.colors.text} swatches={palette} onChange={(color) => set({ color })} />
      </View>
      {canMove && (
        <>
          <Text style={styles.fieldLabel}>Align</Text>
          <Segmented
            options={[
              { id: 'left', label: 'Left' },
              { id: 'center', label: 'Center' },
              { id: 'right', label: 'Right' },
            ]}
            value={el.align ?? 'center'}
            onChange={(align) => set({ align })}
          />
          <ValueSlider label="Box width" value={el.w ?? 60} min={15} onChange={(w) => set({ w })} colors={colors} />
        </>
      )}
      {common}
    </View>
  );
}

function currentItemsOf(ed: StorefrontEditor) {
  return canvasItemsOf(ed.theme);
}

// ── One section: title and text ───────────────────────────────────────────
function BlockPanel({ ed, id }: { ed: StorefrontEditor; id: string }) {
  const { styles } = useUI();
  const block = ed.blocks.find((b) => b.id === id);
  if (!block) return null;
  const label = BLOCK_LABELS[block.type];
  const menuSections = ed.spot.menuSections;
  return (
    <>
      <Text style={styles.hint}>{label.name}</Text>
      <Field
        label="Title"
        value={block.title ?? ''}
        placeholder={label.defaultTitle}
        onChange={(title) => ed.updateBlock(id, { title })}
      />
      <BlockTitleStyle ed={ed} id={id} />
      {(block.type === 'story' || block.type === 'offer') && (
        <Field
          label={block.type === 'offer' ? 'Offer' : 'Text'}
          value={block.text ?? ''}
          placeholder={block.type === 'offer' ? 'Buy 9 drinks, the 10th is on us' : ed.spot.description ?? 'Tell customers about you'}
          onChange={(text) => ed.updateBlock(id, { text })}
          multiline
        />
      )}
      {block.type === 'menuCategory' && (
        <>
          <Text style={[styles.fieldLabel, styles.gapTop]}>Menu section to show</Text>
          <View style={styles.accentRow}>
            {menuSections.map((s) => (
              <Pressable
                key={s.id}
                style={[styles.accentChip, block.sectionId === s.id && styles.accentChipOn]}
                onPress={() => ed.updateBlock(id, { sectionId: s.id, title: block.title || s.name })}
              >
                <Text style={styles.accentLabel}>{s.name}</Text>
              </Pressable>
            ))}
          </View>
          {menuSections.length === 0 && <Text style={styles.hint}>Add sections to your menu first.</Text>}
        </>
      )}
      {(block.type === 'hours' || block.type === 'gallery') && (
        <Text style={styles.hint}>
          {block.type === 'hours' ? 'Shows the hours from Edit business.' : 'Shows your business photos.'}
        </Text>
      )}
    </>
  );
}

// Just this section's title: font, size, color, alignment.
function BlockTitleStyle({ ed, id }: { ed: StorefrontEditor; id: string }) {
  const { styles, colors } = useUI();
  const key = `block:${id}`;
  const el = ed.theme.elements[key] ?? {};
  const set = (patch: Partial<ElementStyle>) => ed.setElement(key, patch);
  const palette = [ed.theme.colors.text, ed.theme.colors.primary, ...SWATCHES.primary.slice(0, 8)];
  return (
    <>
      <Text style={[styles.fieldLabel, styles.gapTop]}>Title font</Text>
      <View style={styles.accentRow}>
        {(Object.keys(FONT_LABELS) as ElementFont[]).map((f) => (
          <Pressable key={f} style={[styles.accentChip, el.font === f && styles.accentChipOn]} onPress={() => set({ font: f })}>
            <Text style={[styles.accentLabel, { fontFamily: fontFamily(f) }]}>{FONT_LABELS[f]}</Text>
          </Pressable>
        ))}
      </View>
      <ValueSlider
        label={`Title size · ${el.size ?? 20}pt`}
        value={toSlider(el.size ?? 20)}
        onChange={(v) => set({ size: fromSlider(v) })}
        colors={colors}
      />
      <View style={styles.gapTop}>
        <ColorRow label="Title color" value={el.color ?? ed.theme.colors.text} swatches={palette} onChange={(color) => set({ color })} />
      </View>
      <Text style={styles.fieldLabel}>Title alignment</Text>
      <Segmented
        options={[
          { id: 'left', label: 'Left' },
          { id: 'center', label: 'Center' },
          { id: 'right', label: 'Right' },
        ]}
        value={el.align ?? 'left'}
        onChange={(align) => set({ align })}
      />
    </>
  );
}

// ── Add a section ─────────────────────────────────────────────────────────
function AddPanel({ ed, index }: { ed: StorefrontEditor; index: number }) {
  const { styles } = useUI();
  const types: BlockType[] = ['favorites', 'menuCategory', 'story', 'offer', 'gallery', 'hours', 'latest'];
  return (
    <View style={styles.addGrid}>
      {types.map((type) => (
        <Pressable
          key={type}
          style={styles.addTile}
          onPress={() => {
            const block = ed.addBlock(index, type, { title: BLOCK_LABELS[type].defaultTitle });
            // Sections that need content open straight into editing.
            if (type === 'story' || type === 'offer' || type === 'menuCategory') ed.openSheet({ kind: 'block', id: block.id });
            else ed.closeSheet();
          }}
        >
          <Text style={styles.addTileName}>{BLOCK_LABELS[type].name}</Text>
          <Text style={styles.hint}>{BLOCK_LABELS[type].hint}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Arrange: reorder, hide, delete ────────────────────────────────────────
function ArrangePanel({ ed }: { ed: StorefrontEditor }) {
  const { styles, colors } = useUI();
  return (
    <View style={{ gap: 6 }}>
      {ed.blocks.map((b, i) => (
        <View key={b.id} style={styles.arrangeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.arrangeName, b.hidden && { color: colors.textMuted }]}>
              {b.title || BLOCK_LABELS[b.type].defaultTitle}
            </Text>
            <Text style={styles.hint}>{b.hidden ? 'Hidden from customers' : BLOCK_LABELS[b.type].name}</Text>
          </View>
          <Pressable style={styles.arrangeBtn} onPress={() => ed.moveBlock(i, -1)} disabled={i === 0} accessibilityLabel="Move up">
            <Ionicons name="arrow-up" size={16} color={i === 0 ? colors.border : colors.text} />
          </Pressable>
          <Pressable
            style={styles.arrangeBtn}
            onPress={() => ed.moveBlock(i, 1)}
            disabled={i === ed.blocks.length - 1}
            accessibilityLabel="Move down"
          >
            <Ionicons name="arrow-down" size={16} color={i === ed.blocks.length - 1 ? colors.border : colors.text} />
          </Pressable>
          <Switch value={!b.hidden} onValueChange={() => ed.toggleHidden(b.id)} />
        </View>
      ))}
      <Text style={styles.hint}>The Menu, Reels, Reviews and About tabs always stay.</Text>
    </View>
  );
}

// ── Menu item quick edit (goes live right away — menus aren't drafted) ────
function nextMidnight() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
}

function ItemPanel({ ed, itemId }: { ed: StorefrontEditor; itemId: string }) {
  const { styles } = useUI();
  const { updateSpot } = useAppData();
  const item = ed.spot.menu.find((m) => m.id === itemId);
  const [draft, setDraft] = React.useState<MenuItem | null>(item ?? null);
  const [saving, setSaving] = React.useState(false);
  if (!item || !draft) return null;
  const soldOutToday = !!draft.soldOutUntil && new Date(draft.soldOutUntil) > new Date();

  const save = async (next: MenuItem) => {
    setSaving(true);
    try {
      await updateSpot(ed.spot.id, { menu: ed.spot.menu.map((m) => (m.id === itemId ? next : m)) });
      ed.closeSheet();
    } catch (e: any) {
      Alert.alert("Couldn't save item", e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Text style={styles.hint}>Menu changes go live right away.</Text>
      <ImagePickerRow
        label="Photo"
        value={draft.photo ?? null}
        busy={ed.uploading === 'item'}
        disabled={ed.uploading !== null}
        onPick={() => ed.upload('item', (url) => setDraft((d) => (d ? { ...d, photo: url } : d)))}
        onRemove={() => setDraft((d) => (d ? { ...d, photo: undefined } : d))}
      />
      <Field label="Name" value={draft.name} onChange={(name) => setDraft((d) => (d ? { ...d, name } : d))} />
      <Field
        label="Description"
        value={draft.description ?? ''}
        onChange={(description) => setDraft((d) => (d ? { ...d, description } : d))}
        multiline
      />
      <Field
        label="Price"
        value={String(draft.price)}
        onChange={(v) => {
          const price = Number(v.replace(/[^0-9.]/g, ''));
          if (!Number.isNaN(price)) setDraft((d) => (d ? { ...d, price } : d));
        }}
      />
      <View style={styles.switchRow}>
        <Text style={[styles.fieldLabel, { flex: 1 }]}>Popular (shows in favorites)</Text>
        <Switch value={!!draft.isPopular} onValueChange={(isPopular) => setDraft((d) => (d ? { ...d, isPopular } : d))} />
      </View>
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Sold out today</Text>
          <Text style={styles.hint}>Turns back on automatically tomorrow.</Text>
        </View>
        <Switch
          value={soldOutToday}
          onValueChange={(on) => setDraft((d) => (d ? { ...d, soldOutUntil: on ? nextMidnight() : null } : d))}
        />
      </View>
      <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={() => save(draft)} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save item'}</Text>
      </Pressable>
    </>
  );
}

const makeFrameStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      backgroundColor: 'rgba(20,10,20,0.18)',
    },
    scroll: {
      flexGrow: 0,
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 12,
    },
    grab: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginTop: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    done: {
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    doneText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
    },
    body: {
      paddingBottom: spacing.lg,
    },
    padded: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
    },
  });
