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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { useAppData } from '../../../context/DataContext';
import { MenuItem } from '../../../types';
import { BLOCK_LABELS, BlockType } from '../../../types/storefront';
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
  const ui = React.useMemo(() => ({ styles: makeEditorStyles(colors), colors }), [colors]);
  const frame = React.useMemo(() => makeFrameStyles(colors), [colors]);
  const sheet = ed.sheet;
  if (!sheet) return null;

  const title =
    sheet.kind === 'design'
      ? 'Design'
      : sheet.kind === 'header'
        ? sheet.focus === 'photo'
          ? 'Header photo & style'
          : sheet.focus === 'buttons'
            ? 'Edit buttons'
            : 'Name & tagline'
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
        <Pressable style={frame.backdrop} onPress={ed.closeSheet} accessibilityLabel="Close panel" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[frame.sheet, { paddingBottom: insets.bottom + spacing.sm }]}>
            <View style={frame.grab} />
            <View style={frame.headerRow}>
              <Text style={frame.title}>{title}</Text>
              <Pressable onPress={ed.closeSheet} style={frame.done} hitSlop={8}>
                <Text style={frame.doneText}>Done</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={frame.body}>
              {sheet.kind === 'design' && <DesignPanel ed={ed} />}
              {sheet.kind === 'header' && <HeaderPanel ed={ed} focus={sheet.focus} />}
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
      </EditorUI.Provider>
    </Modal>
  );
}

// ── Design: the whole-page look ──────────────────────────────────────────
function DesignPanel({ ed }: { ed: StorefrontEditor }) {
  const { styles, colors } = useUI();
  const { theme, setBase, decor, setDecor, set, setColors, setBackground, setSections, upload, uploading } = ed;
  const bg = theme.background;
  const textContrast = contrastRatio(theme.colors.text, theme.colors.background);
  const buttonContrast = contrastRatio(onColor(theme.colors.primary), theme.colors.primary);
  const readable = textContrast >= 4.5 && buttonContrast >= 3;
  return (
    <>
      <View style={[styles.readableInline, { backgroundColor: readable ? colors.successMuted : colors.goldMuted }]}>
        <Ionicons name={readable ? 'checkmark-circle' : 'warning-outline'} size={14} color={readable ? colors.success : '#9A6200'} />
        <Text style={[styles.readableText, { color: readable ? colors.success : '#9A6200' }]}>
          {readable ? 'Readable: text and buttons are easy to read' : textContrast < 4.5 ? 'Text may be hard to read on this background' : 'Button text may be hard to read'}
        </Text>
      </View>
  {/* ── Theme presets ── */}
  <Section icon="color-palette-outline" title="Theme">
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
      {PRESETS.map((p) => (
        <Pressable
          key={p.id}
          style={styles.preset}
          onPress={() => {
            setBase((t) => applyPreset(t, p));
            setDecor((d) => ({ ...d, accent: p.look.titleAccent }));
          }}
        >
          <View style={[styles.presetSwatch, { backgroundColor: p.look.colors.background }]}>
            <View style={[styles.presetBar, { backgroundColor: p.look.colors.primary }]} />
            <Text
              style={{
                color: p.look.colors.text,
                fontFamily: p.look.fonts.heading === 'playfair' ? 'PlayfairDisplay_700Bold' : undefined,
                fontWeight: '800',
                fontSize: 13,
              }}
            >
              Aa
            </Text>
          </View>
          <Text style={styles.presetName}>{p.name}</Text>
        </Pressable>
      ))}
    </ScrollView>
    <Text style={styles.hint}>A preset changes the look. Your photos, logo and words stay.</Text>
  </Section>

  {/* ── Colors ── */}
  <Section icon="brush-outline" title="Colors">
    <ColorRow label="Brand color" value={theme.colors.primary} swatches={SWATCHES.primary} onChange={(c) => setColors({ primary: c })} />
    <ColorRow label="Background" value={theme.colors.background} swatches={SWATCHES.background} onChange={(c) => setColors({ background: c })} />
    <ColorRow label="Text" value={theme.colors.text} swatches={SWATCHES.text} onChange={(c) => setColors({ text: c })} />
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
    <Field
      label="Handwritten note in the header"
      value={decor.note}
      onChange={(note) => setDecor((d) => ({ ...d, note }))}
      placeholder="Good Coffee, Brighter Days"
    />
    <ImagePickerRow
      label="Sticker"
      hint="A mascot or illustration. PNG with a transparent background works best."
      value={decor.sticker}
      busy={uploading === 'sticker'}
      disabled={uploading !== null}
      onPick={() => upload('sticker', (url) => setDecor((d) => ({ ...d, sticker: url })))}
      onRemove={() => setDecor((d) => ({ ...d, sticker: null }))}
    />
  </Section>

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
type HeaderFocus = 'text' | 'photo' | 'buttons';

// Each header pencil opens only what it points at: the name/tagline, the
// photo (and logo and header style), or the buttons.
function HeaderPanel({ ed, focus }: { ed: StorefrontEditor; focus: HeaderFocus }) {
  const { styles } = useUI();
  const { theme, setHero, upload, uploading, spot } = ed;
  const bg = theme.background;
  const pad = { paddingHorizontal: spacing.md };

  if (focus === 'photo') {
    return (
      <View style={pad}>
        <Text style={styles.fieldLabel}>Header style</Text>
        <Segmented
          options={[
            { id: 'cover', label: 'Cover' },
            { id: 'title', label: 'Big title' },
            { id: 'photo', label: 'Full photo' },
          ]}
          value={theme.hero.style}
          onChange={(style) => setHero({ style })}
        />
        <Text style={styles.hint}>
          {theme.hero.style === 'cover'
            ? 'A cover image with your logo and name underneath.'
            : theme.hero.style === 'title'
              ? 'Your name and tagline in big type, above a feature photo.'
              : 'A full-screen photo with your headline written over it.'}
        </Text>
        <ImagePickerRow
          label="Header photo"
          hint={bg?.image && theme.hero.style === 'cover' ? 'Leave empty to use your background as the cover.' : undefined}
          value={theme.hero.image}
          busy={uploading === 'hero'}
          disabled={uploading !== null}
          onPick={() => upload('hero', (url) => setHero({ image: url }))}
          onRemove={() => setHero({ image: null })}
        />
        <ImagePickerRow
          label="Logo"
          value={theme.hero.logo}
          busy={uploading === 'logo'}
          disabled={uploading !== null}
          onPick={() => upload('logo', (url) => setHero({ logo: url }))}
          onRemove={() => setHero({ logo: null })}
        />
      </View>
    );
  }

  if (focus === 'buttons') {
    return (
      <View style={pad}>
        <Field label="Main button (opens your menu)" value={theme.hero.primaryCta} onChange={(v) => setHero({ primaryCta: v || 'Order ahead' })} />
        <Field label="Second button" value={theme.hero.secondaryCta} onChange={(v) => setHero({ secondaryCta: v || 'Directions' })} />
        <Text style={[styles.fieldLabel, styles.gapTop]}>Second button opens</Text>
        <Segmented
          options={[
            { id: 'directions', label: 'Directions' },
            { id: 'menu', label: 'Menu' },
          ]}
          value={theme.hero.secondaryAction}
          onChange={(secondaryAction) => setHero({ secondaryAction })}
        />
        {theme.hero.secondaryAction === 'menu' && (
          <Text style={styles.hint}>Both buttons will open your menu. Directions is usually more useful here.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={pad}>
      <Field
        label="Name"
        value={theme.hero.headline ?? ''}
        onChange={(v) => setHero({ headline: v || null })}
        placeholder={spot.name}
      />
      {theme.hero.style === 'photo' && (
        <Field
          label="Small label above the headline"
          value={theme.hero.eyebrow ?? ''}
          onChange={(v) => setHero({ eyebrow: v || null })}
          placeholder="CAFÉ CON RAÍCES"
        />
      )}
      {theme.hero.style !== 'photo' && (
        <Field
          label="Tagline"
          value={theme.hero.tagline ?? ''}
          onChange={(v) => setHero({ tagline: v || null })}
          placeholder="Coffee with a little chisme"
        />
      )}
      {theme.hero.style !== 'cover' && (
        <Field
          label="Intro"
          value={theme.hero.subtext ?? ''}
          onChange={(v) => setHero({ subtext: v || null })}
          placeholder="Specialty drinks, good vibes…"
          multiline
        />
      )}
    </View>
  );
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
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(20,10,20,0.18)',
    },
    sheet: {
      maxHeight: '64%',
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
