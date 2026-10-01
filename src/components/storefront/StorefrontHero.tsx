import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spot } from '../../types';
import { StorefrontTheme } from '../../types/storefront';
import { radius, spacing, ThemeColors } from '../../theme';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../../constants/categories';
import { imageSource } from '../../utils/storefrontImages';
import { fontFamily } from '../../utils/headerLayout';
import { CornerDecorations } from './Decorations';
import EditPen from './editor/EditPen';
import HeaderCanvas, { CanvasEditing, CoverCanvasItems, ElementButton } from './HeaderCanvas';

export interface HeroInfo {
  rating: number;
  reviewCount: number;
  open: boolean;
  statusLabel: string; // "Open · Closes 6PM"
  cityLabel: string;
  distanceLabel: string;
  prepTime?: string;
  following: boolean;
  isOwner: boolean;
  canOrder: boolean;
}

interface Props {
  spot: Spot;
  theme: StorefrontTheme;
  colors: ThemeColors;
  info: HeroInfo;
  onPrimary: () => void;
  onSecondary: () => void;
  onFollow: () => void;
  // Rendered at the bottom of the name card (the cover style keeps the page
  // tabs inside it, like the mockups).
  footer?: React.ReactNode;
  // Edit mode: select, drag and edit individual header elements.
  canvas?: CanvasEditing;
  onEditDetails?: () => void;
}

export default function StorefrontHero(props: Props) {
  if (props.theme.hero.style === 'cover') return <CoverHero {...props} />;
  // Big title and Full photo headers are a free-form canvas.
  return (
    <View>
      <HeaderCanvas
        spot={props.spot}
        theme={props.theme}
        colors={props.colors}
        editing={props.canvas}
        onPrimary={props.onPrimary}
        onSecondary={props.onSecondary}
      />
      <InfoStrip {...props} />
    </View>
  );
}

// ── Cover: image band, overlapping logo, name card (Kuppio default) ──────
// The name card stays a tidy card; its name and buttons are still styled
// one by one, and the cover band above holds draggable text and stickers.
function CoverHero(props: Props) {
  const { spot, theme, colors, info, canvas } = props;
  const insets = useSafeAreaInsets();
  // A shop with a background pattern uses the pattern as its cover unless
  // it picks a hero photo; otherwise fall back to its first photo.
  const coverSrc = theme.hero.image ?? (theme.background ? null : spot.photos[0] ?? null);
  const panel = !!theme.background && theme.layout === 'panel';
  const cover = imageSource(coverSrc);
  const logo = imageSource(theme.hero.logo);
  // With a background pattern the photo is inset (the pattern frames it),
  // so the band is taller to keep the photo a useful size.
  const coverHeight = (theme.background ? 210 : 170) + insets.top;
  const iconsOnly = { ...theme, decorations: theme.decorations.filter((d) => d.kind === 'icon') };
  // The cover card is laid out by the page, so only the owner's own
  // overrides apply here. Default colors come from the page palette, which
  // also follows light/dark mode for shops without a custom storefront.
  const nameEl = theme.elements.name ?? {};
  const primaryEl = { variant: 'filled' as const, ...(theme.elements.primaryButton ?? {}) };
  const secondaryEl = { variant: 'outline' as const, ...(theme.elements.secondaryButton ?? {}) };
  const nameFamily = fontFamily(nameEl.font);

  return (
    <View>
      <View style={{ height: coverHeight, overflow: 'hidden' }}>
        {canvas && <Pressable style={StyleSheet.absoluteFill} onPress={() => canvas.onSelect(null)} />}
        {cover ? (
          <Image
            source={cover}
            // With a pattern behind the page, the photo is inset so the
            // pattern frames it; otherwise it runs edge to edge.
            style={theme.background ? [styles.coverInset, { top: insets.top + 8 }] : styles.coverFill}
            resizeMode="cover"
          />
        ) : theme.background ? null : (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.coverPlaceholder, { backgroundColor: CATEGORY_COLORS[spot.category] }]}
          >
            <Ionicons name={CATEGORY_ICONS[spot.category]} size={52} color="rgba(255,255,255,0.9)" />
          </View>
        )}
        <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 36, left: 0, right: 0, bottom: 30 }}>
          <CornerDecorations theme={iconsOnly} />
        </View>
        <CoverCanvasItems theme={theme} top={insets.top + 36} height={coverHeight - insets.top - 66} editing={canvas} />
        {canvas && <EditPen onPress={() => canvas.onEdit('photo')} style={{ right: 16, bottom: 40 }} label="Change cover photo" />}
      </View>

      <View
        style={[
          styles.coverCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          // In panel layout the page continues straight on from this card.
          panel && styles.coverCardPanel,
        ]}
      >
        <View style={styles.coverNameRow}>
          {logo ? (
            <Image source={logo} style={[styles.logo, { borderColor: colors.card }]} />
          ) : (
            <View style={[styles.logo, styles.logoPlaceholder, { borderColor: colors.card, backgroundColor: colors.primaryMuted }]}>
              <Text style={[styles.logoInitial, { color: colors.primary }]}>{spot.name.charAt(0)}</Text>
            </View>
          )}
          {canvas && <EditPen onPress={() => canvas.onEdit('logo')} style={styles.penLogo} label="Change logo" />}
          <View style={styles.coverNameText}>
            {canvas && <EditPen onPress={() => canvas.onEdit('name')} style={styles.penName} label="Edit name" />}
            {!nameEl.hidden && (
              <View style={styles.nameLine}>
                <Text
                  style={[
                    styles.coverName,
                    {
                      color: nameEl.color ?? colors.text,
                      fontFamily: nameFamily,
                      fontWeight: nameFamily ? undefined : '800',
                      // Cover names sit in a card row; cap the size so it fits.
                      fontSize: Math.min(nameEl.size ? nameEl.size * 0.66 : 21, 28),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {theme.hero.headline ?? spot.name}
                </Text>
                {spot.ownerUserId !== null && <Ionicons name="checkmark-circle" size={17} color={colors.primary} />}
              </View>
            )}
            <View style={styles.metaLine}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                {info.cityLabel}
              </Text>
            </View>
          </View>
          {!info.isOwner && (
            <Pressable style={styles.followButton} onPress={props.onFollow} hitSlop={6}>
              <View style={[styles.followCircle, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Ionicons name={info.following ? 'heart' : 'heart-outline'} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.followLabel, { color: colors.textMuted }]}>{info.following ? 'Following' : 'Follow'}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.chipRow}>
          <View style={[styles.chip, { borderColor: colors.border }]}>
            <Ionicons name="star" size={12} color={colors.gold} />
            <Text style={[styles.chipText, { color: colors.text }]}>
              {info.reviewCount === 0 ? 'New' : `${info.rating.toFixed(1)}`}
            </Text>
            {info.reviewCount > 0 && (
              <Text style={[styles.chipMuted, { color: colors.textMuted }]}>({info.reviewCount})</Text>
            )}
          </View>
          <View style={[styles.chip, { borderColor: colors.border }]}>
            <Ionicons name={CATEGORY_ICONS[spot.category]} size={12} color={colors.text} />
            <Text style={[styles.chipText, { color: colors.text }]}>{CATEGORY_LABELS[spot.category]}</Text>
          </View>
          {spot.tags.slice(0, 1).map((tag) => (
            <View key={tag} style={[styles.chip, { borderColor: colors.border }]}>
              <Ionicons name="leaf-outline" size={12} color={colors.matchaDark} />
              <Text style={[styles.chipText, { color: colors.text }]}>{tag}</Text>
            </View>
          ))}
          <View style={[styles.chip, { borderColor: colors.border }]}>
            <View style={[styles.dot, { backgroundColor: info.open ? colors.success : colors.textMuted }]} />
            <Text style={[styles.chipText, { color: colors.text }]}>{shortStatus(info.statusLabel)}</Text>
          </View>
        </View>

        <View style={styles.ctaRow}>
          {!primaryEl.hidden && (
            <View style={styles.ctaSlot}>
              <ElementButton el={primaryEl} label={theme.hero.primaryCta || 'Order ahead'} icon="bag-handle-outline" colors={colors} onPress={canvas ? undefined : props.onPrimary} />
              {canvas && <EditPen onPress={() => canvas.onEdit('primaryButton')} style={styles.penCtas} label="Edit main button" />}
            </View>
          )}
          {!secondaryEl.hidden && (
            <View style={styles.ctaSlot}>
              <ElementButton
                el={secondaryEl}
                label={theme.hero.secondaryCta || 'Directions'}
                icon={theme.hero.secondaryAction === 'directions' ? 'navigate-outline' : undefined}
                colors={colors}
                onPress={canvas ? undefined : props.onSecondary}
              />
              {canvas && <EditPen onPress={() => canvas.onEdit('secondaryButton')} style={styles.penCtas} label="Edit second button" />}
            </View>
          )}
        </View>
        {props.footer}
      </View>
    </View>
  );
}

// "Open · Closes 6PM" → "Open until 6PM"; closed labels pass through.
function shortStatus(label: string) {
  const match = label.match(/^Open · Closes (.+)$/);
  return match ? `Open until ${match[1]}` : label.replace(/^Closed · /, '');
}

// Open / location / pickup strip under the title and photo heroes.
export function InfoStrip({ colors, info, onEditDetails }: Props) {
  const [state, detail] = info.statusLabel.split(' · ');
  return (
    <View style={[styles.infoStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {onEditDetails && <EditPen onPress={onEditDetails} style={styles.penInfo} label="Edit hours and details" />}
      <View style={styles.infoCell}>
        <View style={[styles.dot, { backgroundColor: info.open ? colors.success : colors.textMuted }]} />
        <View style={styles.infoText}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>{state}</Text>
          {detail && <Text style={[styles.infoDetail, { color: colors.textMuted }]}>{detail}</Text>}
        </View>
      </View>
      <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
      <View style={styles.infoCell}>
        <Ionicons name="location" size={15} color={colors.primary} />
        <View style={styles.infoText}>
          <Text style={[styles.infoTitle, { color: colors.text }]} numberOfLines={1}>{info.cityLabel}</Text>
          <Text style={[styles.infoDetail, { color: colors.textMuted }]}>{info.distanceLabel} away</Text>
        </View>
      </View>
      <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
      <View style={styles.infoCell}>
        <Ionicons name="bag-handle-outline" size={15} color={colors.text} />
        <View style={styles.infoText}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Pickup</Text>
          <Text style={[styles.infoDetail, { color: colors.textMuted }]}>
            {info.canOrder ? info.prepTime ?? 'Order ahead' : 'Not taking orders'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  coverFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  coverInset: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: 10,
    borderRadius: radius.lg,
  },
  ctaSlot: {
    flex: 1,
  },
  penLogo: {
    left: 58,
    top: -30,
  },
  penCtas: {
    top: -12,
    left: -8,
  },
  penName: {
    top: -4,
    right: 0,
  },
  penTitle: {
    top: -6,
    left: 8,
  },
  penInfo: {
    top: -12,
    left: -8,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverCardPanel: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 0,
  },
  coverCard: {
    marginTop: -26,
    marginHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  coverNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    marginTop: -30,
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitial: {
    fontSize: 30,
    fontWeight: '800',
  },
  coverNameText: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coverName: {
    fontSize: 21,
    fontWeight: '800',
    flexShrink: 1,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
  },
  followButton: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  followCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipMuted: {
    fontSize: 11,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ctaStack: {
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  cta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  ctaStackItem: {
    flex: 0,
    minWidth: 180,
  },
  ctaOutline: {
    borderWidth: 1.5,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
  },
  titleBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  titleName: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  titleTagline: {
    fontSize: 26,
    marginTop: 2,
    textAlign: 'center',
  },
  titleSubtext: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 290,
  },
  titlePhotoFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  titlePhotoFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  titleCtas: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.sm,
  },
  photoCopy: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  photoEyebrow: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: spacing.xs,
  },
  photoHeadline: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
  },
  photoSubtext: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 19,
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  infoCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  infoText: {
    flexShrink: 1,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoDetail: {
    fontSize: 10,
    marginTop: 1,
  },
  infoDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});

