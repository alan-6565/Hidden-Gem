import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { radius, spacing, ThemeColors } from '../theme';
import {
  Decoration,
  DecorationPlacement,
  DEFAULT_STOREFRONT,
  StorefrontTheme,
} from '../types/storefront';
import { PRESETS, StorefrontPreset, SWATCHES, TITLE_ACCENTS, TitleAccent } from '../constants/storefrontPresets';
import {
  accentFont,
  contrastRatio,
  headingFont,
  mix,
  onColor,
  resolveStorefront,
  storefrontPalette,
} from '../utils/storefrontTheme';
import { imageSource } from '../utils/storefrontImages';
import { pickMediaFromLibrary, uploadMedia } from '../lib/mediaUpload';
import StorefrontBackground from '../components/storefront/StorefrontBackground';
import ValueSlider from '../components/storefront/editor/ValueSlider';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomizeStorefront'>;

// ── Decorations <-> simple editor controls ──────────────────────────────
// The editor offers a few friendly choices instead of raw placement data:
// a title accent (flowers, leaves…), whether it also appears in the header
// corners, a short handwritten note, and one uploaded sticker.
interface DecorChoices {
  accent: TitleAccent;
  corners: boolean;
  note: string;
  sticker: string | null;
}

function readDecor(decorations: Decoration[]): DecorChoices {
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

function buildDecor(choices: DecorChoices, theme: StorefrontTheme): Decoration[] {
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

function applyPreset(theme: StorefrontTheme, preset: StorefrontPreset): StorefrontTheme {
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

// ── Editor building blocks ──────────────────────────────────────────────
// Module-level (not defined inside the screen) so text inputs keep focus
// while typing; they read styles/colors from context.
const EditorUI = React.createContext<{ styles: ReturnType<typeof makeStyles>; colors: ThemeColors } | null>(null);
function useUI() {
  const ui = React.useContext(EditorUI);
  if (!ui) throw new Error('EditorUI missing');
  return ui;
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { styles } = useUI();
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable key={o.id} style={[styles.segment, value === o.id && styles.segmentOn]} onPress={() => onChange(o.id)}>
          <Text style={[styles.segmentText, value === o.id && styles.segmentTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Section({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: React.ReactNode }) {
  const { styles, colors } = useUI();
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Ionicons name={icon} size={18} color={colors.text} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const { styles, colors } = useUI();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
      />
    </View>
  );
}

function ColorRow({
  label,
  value,
  swatches,
  onChange,
}: {
  label: string;
  value: string;
  swatches: string[];
  onChange: (hex: string) => void;
}) {
  const { styles } = useUI();
  const [hex, setHex] = useState(value);
  // Follow outside changes (presets, swatches) without fighting typing.
  useEffect(() => setHex(value), [value]);
  return (
    <View style={styles.colorRow}>
      <View style={styles.colorHeader}>
        <View style={[styles.colorDot, { backgroundColor: value }]} />
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={styles.hexInput}
          value={hex}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          onChangeText={(t) => {
            setHex(t);
            if (/^#[0-9a-fA-F]{6}$/.test(t)) onChange(t.toUpperCase());
          }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
        {swatches.map((c) => (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={[styles.swatch, { backgroundColor: c }, value.toUpperCase() === c && styles.swatchOn]}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ImagePickerRow({
  label,
  value,
  busy,
  disabled,
  onPick,
  onRemove,
  hint,
}: {
  label: string;
  value: string | null;
  busy: boolean;
  disabled: boolean;
  onPick: () => void;
  onRemove: () => void;
  hint?: string;
}) {
  const { styles, colors } = useUI();
  const src = imageSource(value);
  return (
    <View style={styles.imageRow}>
      {src ? (
        <Image source={src} style={styles.imageThumb} />
      ) : (
        <View style={[styles.imageThumb, styles.imageThumbEmpty]}>
          <Ionicons name="image-outline" size={20} color={colors.textMuted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        <View style={styles.imageButtons}>
          <Pressable style={styles.smallButton} onPress={onPick} disabled={disabled}>
            {busy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
                <Text style={styles.smallButtonText}>{value ? 'Replace' : 'Upload'}</Text>
              </>
            )}
          </Pressable>
          {value && (
            <Pressable style={styles.smallButton} onPress={onRemove}>
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={[styles.smallButtonText, { color: colors.danger }]}>Remove</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────

export default function CustomizeStorefrontScreen({ route, navigation }: Props) {
  const { spotId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const ui = useMemo(() => ({ styles, colors }), [styles, colors]);
  const insets = useSafeAreaInsets();
  const { spots, updateSpot, isAdmin } = useAppData();
  const { user } = useAuth();
  const spot = spots.find((s) => s.id === spotId);

  const published = useMemo(() => resolveStorefront(spot?.storefront), [spot?.storefront]);
  const initial = useMemo(
    () => resolveStorefront(spot?.storefrontDraft ?? spot?.storefront),
    // Only on open — later saves shouldn't reset what's being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [base, setBase] = useState<StorefrontTheme>(initial);
  const [decor, setDecor] = useState<DecorChoices>(() => readDecor(initial.decorations));
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [uploading, setUploading] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const theme = useMemo<StorefrontTheme>(() => ({ ...base, decorations: buildDecor(decor, base) }), [base, decor]);
  const preview = useMemo(() => storefrontPalette(theme, colors, true), [theme, colors]);
  const unpublished = JSON.stringify(theme) !== JSON.stringify(published) || !spot?.storefront;

  // ── Autosave the draft ────────────────────────────────────────────────
  const firstRun = useRef(true);
  const latest = useRef(theme);
  latest.current = theme;
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState('saving');
    const timer = setTimeout(() => {
      updateSpot(spotId, { storefrontDraft: latest.current })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 700);
    return () => clearTimeout(timer);
  }, [theme, spotId, updateSpot]);

  const flushDraft = async () => {
    setSaveState('saving');
    await updateSpot(spotId, { storefrontDraft: latest.current });
    setSaveState('saved');
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.saveBadge}>
          {saveState === 'saving' ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : saveState === 'error' ? (
            <Ionicons name="alert-circle" size={15} color={colors.danger} />
          ) : (
            <Ionicons name="checkmark-circle" size={15} color={colors.success} />
          )}
          <Text style={[styles.saveBadgeText, saveState === 'error' && { color: colors.danger }]}>
            {saveState === 'saving' ? 'Saving' : saveState === 'error' ? 'Not saved' : 'Draft saved'}
          </Text>
        </View>
      ),
    });
  }, [navigation, saveState, styles, colors]);

  if (!spot) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Business not found.</Text>
      </View>
    );
  }
  if (spot.ownerUserId !== user?.id && !isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Only this business's owner can customize it.</Text>
      </View>
    );
  }

  // ── Updaters ──────────────────────────────────────────────────────────
  const set = (patch: Partial<StorefrontTheme>) => setBase((t) => ({ ...t, ...patch }));
  const setColors = (patch: Partial<StorefrontTheme['colors']>) =>
    setBase((t) => ({ ...t, colors: { ...t.colors, ...patch } }));
  const setHero = (patch: Partial<StorefrontTheme['hero']>) => setBase((t) => ({ ...t, hero: { ...t.hero, ...patch } }));
  const setSections = (patch: Partial<StorefrontTheme['sections']>) =>
    setBase((t) => ({ ...t, sections: { ...t.sections, ...patch } }));
  const setBackground = (patch: Partial<NonNullable<StorefrontTheme['background']>>) =>
    setBase((t) => ({
      ...t,
      background: {
        image: null,
        fit: 'fill',
        size: 60,
        strength: 40,
        fixedWhileScrolling: true,
        ...(t.background ?? {}),
        ...patch,
      },
    }));

  const upload = async (key: string, apply: (url: string) => void) => {
    if (!user) return;
    setUploading(key);
    try {
      const picked = await pickMediaFromLibrary({ allowVideos: false });
      if (!picked) return;
      apply(await uploadMedia(user.id, picked));
    } catch (e: any) {
      Alert.alert("Couldn't upload", e?.message ?? 'Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handlePreview = async () => {
    try {
      await flushDraft();
      navigation.navigate('SpotProfile', { spotId, preview: true });
    } catch (e: any) {
      Alert.alert("Couldn't save your draft", e?.message ?? 'Please try again.');
    }
  };

  const handlePublish = () => {
    Alert.alert('Publish your storefront?', 'Customers will see this design right away.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          setPublishing(true);
          try {
            await updateSpot(spotId, { storefront: latest.current, storefrontDraft: latest.current });
            Alert.alert('Published!', 'Your storefront is live.');
          } catch (e: any) {
            Alert.alert("Couldn't publish", e?.message ?? 'Please try again.');
          } finally {
            setPublishing(false);
          }
        },
      },
    ]);
  };

  const handleReset = () => {
    Alert.alert('Start over?', undefined, [
      {
        text: 'Discard unpublished changes',
        onPress: () => {
          setBase(published);
          setDecor(readDecor(published.decorations));
        },
      },
      {
        text: 'Reset to Kuppio default',
        style: 'destructive',
        onPress: () => {
          // Keeps the shop's own photos and words; resets the look.
          setBase((t) => ({
            ...applyPreset(t, PRESETS[0]),
            background: null,
            sections: { ...t.sections, favoritesTitle: DEFAULT_STOREFRONT.sections.favoritesTitle },
          }));
          setDecor({ accent: 'none', corners: false, note: '', sticker: null });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Readability ───────────────────────────────────────────────────────
  const textContrast = contrastRatio(theme.colors.text, theme.colors.background);
  const buttonContrast = contrastRatio(onColor(theme.colors.primary), theme.colors.primary);
  const readable = textContrast >= 4.5 && buttonContrast >= 3;

  const bg = theme.background;
  const logoSrc = imageSource(theme.hero.logo);
  const heading = headingFont(theme);
  const accent = accentFont(theme);
  const primaryText = onColor(preview.primary);

  return (
    <EditorUI.Provider value={ui}>
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Live preview (sticks to the top while scrolling) ── */}
        <View style={styles.previewWrap}>
          <View style={[styles.preview, { backgroundColor: preview.background }]}>
            {bg && <StorefrontBackground background={bg} height={190} />}
            <View
              style={[
                styles.previewCard,
                { backgroundColor: preview.card },
                theme.layout === 'panel' && bg && styles.previewCardPanel,
              ]}
            >
              <View style={styles.previewNameRow}>
                {logoSrc ? (
                  <Image source={logoSrc} style={styles.previewLogo} />
                ) : (
                  <View style={[styles.previewLogo, { backgroundColor: preview.primaryMuted, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: preview.primary, fontWeight: '800' }}>{spot.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.previewName, { color: preview.text, fontFamily: heading }]} numberOfLines={1}>
                    {theme.hero.headline?.split('\n')[0] || spot.name}
                  </Text>
                  <Text
                    style={[styles.previewTagline, { color: preview.primary, fontFamily: accent }, !accent && styles.previewTaglinePlain]}
                    numberOfLines={1}
                  >
                    {theme.hero.tagline || theme.sections.favoritesTitle}
                  </Text>
                </View>
              </View>
              <View style={styles.previewButtons}>
                <View style={[styles.previewButton, { backgroundColor: preview.primary }]}>
                  <Text style={[styles.previewButtonText, { color: primaryText }]}>{theme.hero.primaryCta}</Text>
                </View>
                <View style={[styles.previewButton, styles.previewButtonOutline, { borderColor: preview.border }]}>
                  <Text style={[styles.previewButtonText, { color: preview.text }]}>{theme.hero.secondaryCta}</Text>
                </View>
              </View>
              <Text style={[styles.previewPrice, { color: preview.textMuted }]}>
                Vanilla Latte · <Text style={{ color: preview.primary, fontWeight: '800' }}>$5.25</Text>
              </Text>
            </View>
            <View style={[styles.readableBadge, { backgroundColor: readable ? colors.successMuted : colors.goldMuted }]}>
              <Ionicons name={readable ? 'checkmark' : 'warning-outline'} size={12} color={readable ? colors.success : '#9A6200'} />
              <Text style={[styles.readableText, { color: readable ? colors.success : '#9A6200' }]}>
                {readable ? 'Readable' : textContrast < 4.5 ? 'Text hard to read' : 'Button text hard to read'}
              </Text>
            </View>
          </View>
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

        {/* ── Header ── */}
        <Section icon="browsers-outline" title="Header">
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
          <Field
            label="Headline"
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
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Field label="Main button" value={theme.hero.primaryCta} onChange={(v) => setHero({ primaryCta: v || 'Order ahead' })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Second button" value={theme.hero.secondaryCta} onChange={(v) => setHero({ secondaryCta: v || 'Directions' })} />
            </View>
          </View>
          <Text style={styles.fieldLabel}>Second button opens</Text>
          <Segmented
            options={[
              { id: 'directions', label: 'Directions' },
              { id: 'menu', label: 'Menu' },
            ]}
            value={theme.hero.secondaryAction}
            onChange={(secondaryAction) => setHero({ secondaryAction })}
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

        {/* ── Sections ── */}
        <Section icon="list-outline" title="Sections">
          <Field
            label="Favorites row title"
            value={theme.sections.favoritesTitle}
            onChange={(favoritesTitle) => setSections({ favoritesTitle: favoritesTitle || 'Popular today' })}
            placeholder="Popular today"
          />
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Show your latest reel</Text>
              <Text style={styles.hint}>On your Home tab, once you've posted one.</Text>
            </View>
            <Switch value={theme.sections.showLatest} onValueChange={(showLatest) => setSections({ showLatest })} />
          </View>
        </Section>

        <Pressable onPress={handleReset} style={styles.resetLink}>
          <Text style={styles.resetText}>Start over…</Text>
        </Pressable>
      </ScrollView>

      {/* ── Bottom bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        {unpublished && <Text style={styles.unpublished}>Unpublished changes — customers still see your last published design.</Text>}
        <View style={styles.bottomButtons}>
          <Pressable style={[styles.bottomButton, styles.bottomOutline]} onPress={handlePreview}>
            <Ionicons name="eye-outline" size={17} color={colors.text} />
            <Text style={styles.bottomOutlineText}>Preview</Text>
          </Pressable>
          <Pressable
            style={[styles.bottomButton, { backgroundColor: colors.primary }, (!unpublished || publishing) && styles.disabled]}
            onPress={handlePublish}
            disabled={!unpublished || publishing}
          >
            <Text style={styles.bottomPrimaryText}>{publishing ? 'Publishing…' : unpublished ? 'Publish' : 'Published'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
    </EditorUI.Provider>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      backgroundColor: colors.background,
    },
    muted: {
      color: colors.textMuted,
      textAlign: 'center',
    },
    saveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    saveBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    previewWrap: {
      backgroundColor: colors.background,
      padding: spacing.md,
      paddingBottom: spacing.sm,
    },
    preview: {
      height: 190,
      borderRadius: radius.lg,
      overflow: 'hidden',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    previewCard: {
      marginHorizontal: spacing.md,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    previewCardPanel: {
      marginHorizontal: spacing.sm,
      borderRadius: 0,
    },
    previewNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    previewLogo: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    previewName: {
      fontSize: 17,
      fontWeight: '800',
    },
    previewTagline: {
      fontSize: 16,
    },
    previewTaglinePlain: {
      fontSize: 12,
      fontWeight: '600',
    },
    previewButtons: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    previewButton: {
      flex: 1,
      height: 32,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewButtonOutline: {
      borderWidth: 1.5,
    },
    previewButtonText: {
      fontSize: 12,
      fontWeight: '800',
    },
    previewPrice: {
      fontSize: 12,
      marginTop: spacing.sm,
    },
    readableBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    readableText: {
      fontSize: 11,
      fontWeight: '800',
    },
    card: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    presets: {
      gap: spacing.sm,
    },
    preset: {
      alignItems: 'center',
      width: 84,
    },
    presetSwatch: {
      width: 84,
      height: 58,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    presetBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 12,
    },
    presetName: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
      marginTop: 4,
      textAlign: 'center',
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
    gapTop: {
      marginTop: spacing.md,
    },
    colorRow: {
      marginBottom: spacing.sm,
    },
    colorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    colorDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
    },
    hexInput: {
      marginLeft: 'auto',
      width: 90,
      fontSize: 13,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 4,
      textAlign: 'center',
    },
    swatches: {
      gap: 8,
      paddingVertical: 6,
    },
    swatch: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    swatchOn: {
      borderWidth: 3,
      borderColor: colors.text,
    },
    imageRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    imageThumb: {
      width: 64,
      height: 64,
      borderRadius: radius.sm,
    },
    imageThumbEmpty: {
      backgroundColor: colors.cream,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageButtons: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: 6,
    },
    smallButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      minWidth: 70,
      justifyContent: 'center',
    },
    smallButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    segmented: {
      flexDirection: 'row',
      backgroundColor: colors.cream,
      borderRadius: radius.pill,
      padding: 3,
      marginTop: 6,
    },
    segment: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: radius.pill,
      alignItems: 'center',
    },
    segmentOn: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    segmentTextOn: {
      color: '#fff',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    field: {
      marginTop: spacing.sm,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    input: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.background,
    },
    inputMultiline: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    twoCol: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    accentRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: 6,
    },
    accentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    accentChipOn: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    accentLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    resetLink: {
      alignSelf: 'center',
      padding: spacing.lg,
    },
    resetText: {
      color: colors.textMuted,
      fontWeight: '600',
    },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    unpublished: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 6,
    },
    bottomButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    bottomButton: {
      flex: 1,
      height: 48,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    bottomOutline: {
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    bottomOutlineText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    bottomPrimaryText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#fff',
    },
    disabled: {
      opacity: 0.5,
    },
  });
