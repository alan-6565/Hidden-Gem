import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ColorPicker from 'react-native-wheel-color-picker';
import { radius, spacing, ThemeColors } from '../../../theme';
import { imageSource } from '../../../utils/storefrontImages';

type EditorStyles = ReturnType<typeof makeEditorStyles>;

// ── Editor building blocks ──────────────────────────────────────────────
// Module-level (not defined inside the screen) so text inputs keep focus
// while typing; they read styles/colors from context.
export const EditorUI = React.createContext<{
  styles: EditorStyles;
  colors: ThemeColors;
  // Lets a control stop the panel from scrolling while it's being dragged.
  setScrollLocked?: (locked: boolean) => void;
} | null>(null);
export function useUI() {
  const ui = React.useContext(EditorUI);
  if (!ui) throw new Error('EditorUI missing');
  return ui;
}

export function Segmented<T extends string>({
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

export function Section({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: React.ReactNode }) {
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

export function Field({
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

export function ColorRow({
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
  const { styles, setScrollLocked } = useUI();
  const [hex, setHex] = useState(value);
  const [wheelOpen, setWheelOpen] = useState(false);
  // Follow outside changes (presets, swatches, the wheel) without fighting typing.
  useEffect(() => setHex(value), [value]);
  const isCustom = !swatches.some((c) => c.toUpperCase() === value.toUpperCase());
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
        {/* Any color at all: opens the wheel. */}
        <Pressable
          onPress={() => setWheelOpen((v) => !v)}
          accessibilityLabel={`Pick any ${label.toLowerCase()} color`}
          style={[styles.swatch, styles.wheelSwatch, (wheelOpen || isCustom) && styles.swatchOn]}
        >
          <LinearGradient
            colors={['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#007AFF', '#AF52DE', '#FF2D55']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name={wheelOpen ? 'close' : 'color-wand'} size={14} color="#FFFFFF" />
        </Pressable>
        {swatches.map((c) => (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={[styles.swatch, { backgroundColor: c }, value.toUpperCase() === c && styles.swatchOn]}
          />
        ))}
      </ScrollView>
      {wheelOpen && (
        <View style={styles.wheelWrap}>
          <ColorPicker
            color={value}
            swatches={false}
            thumbSize={30}
            sliderSize={26}
            gapSize={14}
            noSnap
            row={false}
            onInteractionStart={() => setScrollLocked?.(true)}
            onColorChange={(c: string) => setHex(c.toUpperCase())}
            onColorChangeComplete={(c: string) => {
              setScrollLocked?.(false);
              onChange(c.toUpperCase());
            }}
          />
        </View>
      )}
    </View>
  );
}

export function ImagePickerRow({
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


export const makeEditorStyles = (colors: ThemeColors) =>
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
    wheelSwatch: {
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    wheelWrap: {
      height: 260,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
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
    presetIntro: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    presetCard: {
      width: '48%',
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    presetCardOn: {
      borderColor: colors.primary,
    },
    presetPreview: {
      height: 76,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
    },
    presetButton: {
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    presetButtonText: {
      fontSize: 12,
      fontWeight: '800',
    },
    presetLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
    },
    moreToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginHorizontal: spacing.md,
      marginTop: spacing.lg,
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    moreToggleText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    readableInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    addGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    addTile: {
      width: '48%',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    addTileName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    arrangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      marginHorizontal: spacing.md,
    },
    arrangeName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    shapeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: 6,
    },
    shapeOption: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    shapeThumb: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    shapeThumbOn: {
      borderColor: colors.primary,
    },
    shapeInner: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
    },
    shapeLine: {
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.textMuted,
    },
    shapeLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    arrangeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.cream,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: {
      marginTop: spacing.lg,
      height: 48,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
    },
  });
