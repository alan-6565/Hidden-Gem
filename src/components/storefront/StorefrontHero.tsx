import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spot } from '../../types';
import { StorefrontTheme } from '../../types/storefront';
import { radius, spacing, ThemeColors } from '../../theme';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../../constants/categories';
import { imageSource } from '../../utils/storefrontImages';
import { accentFont, headingFont, onColor } from '../../utils/storefrontTheme';
import { CornerDecorations, DecoratedTitle } from './Decorations';
import EditPen from './editor/EditPen';

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
  // Edit mode: pencils on the header's text, photo and buttons, and on the
  // info strip.
  onEditHeader?: () => void;
  onEditDetails?: () => void;
}

export default function StorefrontHero(props: Props) {
  switch (props.theme.hero.style) {
    case 'title':
      return <TitleHero {...props} />;
    case 'photo':
      return <PhotoHero {...props} />;
    default:
      return <CoverHero {...props} />;
  }
}

function ctaButtons(props: Props, variant: 'row' | 'stack' | 'onPhoto') {
  const { theme, colors } = props;
  const primaryBg = colors.primary;
  const primaryText = onColor(primaryBg);
  const primaryLabel = theme.hero.primaryCta;
  const secondaryLabel = theme.hero.secondaryCta;
  const outlineColor = variant === 'onPhoto' ? '#FFFFFF' : colors.text;
  return (
    <View style={variant === 'row' ? styles.ctaRow : styles.ctaStack}>
      {props.onEditHeader && <EditPen onPress={props.onEditHeader} style={styles.penCtas} label="Edit buttons" />}
      <Pressable
        style={[styles.cta, { backgroundColor: primaryBg }, variant !== 'row' && styles.ctaStackItem]}
        onPress={props.onPrimary}
      >
        {variant === 'row' && theme.hero.style === 'cover' && (
          <Ionicons name="bag-handle-outline" size={16} color={primaryText} />
        )}
        <Text style={[styles.ctaText, { color: primaryText }]}>{primaryLabel}</Text>
        {variant === 'onPhoto' && <Ionicons name="arrow-forward" size={15} color={primaryText} />}
      </Pressable>
      <Pressable
        style={[
          styles.cta,
          styles.ctaOutline,
          { borderColor: variant === 'onPhoto' ? '#FFFFFF' : colors.border, backgroundColor: variant === 'onPhoto' ? 'rgba(0,0,0,0.15)' : colors.card },
          variant !== 'row' && styles.ctaStackItem,
        ]}
        onPress={props.onSecondary}
      >
        {theme.hero.style !== 'title' && (
          <Ionicons name={variant === 'onPhoto' ? 'location-outline' : 'navigate-outline'} size={15} color={outlineColor} />
        )}
        <Text style={[styles.ctaText, { color: outlineColor }]}>{secondaryLabel}</Text>
      </Pressable>
    </View>
  );
}

// ── Cover: image band, overlapping logo, name card (Kuppio default) ──────
function CoverHero(props: Props) {
  const { spot, theme, colors, info } = props;
  const insets = useSafeAreaInsets();
  // A shop with a background pattern uses the pattern as its cover unless
  // it picks a hero photo; otherwise fall back to its first photo.
  const coverSrc = theme.hero.image ?? (theme.background ? null : spot.photos[0] ?? null);
  const panel = !!theme.background && theme.layout === 'panel';
  const cover = imageSource(coverSrc);
  const logo = imageSource(theme.hero.logo);
  const coverHeight = 170 + insets.top;
  const heading = headingFont(theme);

  return (
    <View>
      <View style={{ height: coverHeight }}>
        {cover ? (
          <Image
            source={cover}
            // With a pattern behind the page, the photo is inset so the
            // pattern frames it; otherwise it runs edge to edge.
            style={theme.background ? [styles.coverInset, { top: insets.top + 44 }] : StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : theme.background ? null : (
          <View style={[StyleSheet.absoluteFill, styles.coverPlaceholder, { backgroundColor: CATEGORY_COLORS[spot.category] }]}>
            <Ionicons name={CATEGORY_ICONS[spot.category]} size={52} color="rgba(255,255,255,0.9)" />
          </View>
        )}
        <View style={{ position: 'absolute', top: insets.top + 36, left: 0, right: 0, bottom: 30 }}>
          <CornerDecorations theme={theme} />
        </View>
        {props.onEditHeader && (
          <EditPen onPress={props.onEditHeader} style={{ right: 16, bottom: 40 }} label="Edit header photo" />
        )}
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
          <View style={styles.coverNameText}>
            {props.onEditHeader && <EditPen onPress={props.onEditHeader} style={styles.penName} label="Edit name and logo" />}
            <View style={styles.nameLine}>
              <Text style={[styles.coverName, { color: colors.text, fontFamily: heading }]} numberOfLines={1}>
                {theme.hero.headline ?? spot.name}
              </Text>
              {spot.ownerUserId !== null && <Ionicons name="checkmark-circle" size={17} color={colors.primary} />}
            </View>
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

        {ctaButtons(props, 'row')}
        {props.footer}
      </View>
    </View>
  );
}

// ── Title: decorated name + tagline above a feature photo (Chismesito) ───
function TitleHero(props: Props) {
  const { spot, theme, colors } = props;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const photo = imageSource(theme.hero.image ?? spot.photos[0] ?? null);
  const accent = accentFont(theme);
  return (
    <View style={{ paddingTop: insets.top + 52 }}>
      <LinearGradient
        colors={[colors.blush, colors.background]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.titleBlock}>
        {props.onEditHeader && <EditPen onPress={props.onEditHeader} style={styles.penTitle} label="Edit name and tagline" />}
        <DecoratedTitle theme={theme} placement="title-sides">
          <Text style={[styles.titleName, { color: colors.text, fontFamily: headingFont(theme, 'extraBold') }]}>
            {theme.hero.headline ?? spot.name}
          </Text>
        </DecoratedTitle>
        {theme.hero.tagline && (
          <Text style={[styles.titleTagline, { color: colors.primary, fontFamily: accent }]}>{theme.hero.tagline}</Text>
        )}
        {theme.hero.subtext && (
          <Text style={[styles.titleSubtext, { color: colors.text }]}>{theme.hero.subtext}</Text>
        )}
      </View>
      {photo && (
        <View>
          <Image source={photo} style={{ width, height: width * 0.62 }} resizeMode="cover" />
          <LinearGradient
            colors={[colors.background, 'transparent']}
            style={styles.titlePhotoFadeTop}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.titlePhotoFadeBottom}
            pointerEvents="none"
          />
          <CornerDecorations theme={theme} />
          {props.onEditHeader && <EditPen onPress={props.onEditHeader} style={{ top: 12, right: 16 }} label="Edit header photo" />}
        </View>
      )}
      <View style={styles.titleCtas}>{ctaButtons(props, 'row')}</View>
      <InfoStrip {...props} />
    </View>
  );
}

// ── Photo: full-bleed image with headline over it (Taza de Miel) ─────────
function PhotoHero(props: Props) {
  const { spot, theme, colors } = props;
  const insets = useSafeAreaInsets();
  const photo = imageSource(theme.hero.image ?? spot.photos[0] ?? null);
  return (
    <View>
      <View style={{ height: 420 + insets.top, backgroundColor: colors.text }}>
        {photo && <Image source={photo} style={StyleSheet.absoluteFill} resizeMode="cover" />}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.78)']}
          locations={[0.25, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={{ position: 'absolute', top: insets.top + 44, left: 0, right: 0, bottom: 0 }}>
          <CornerDecorations theme={theme} />
        </View>
        {props.onEditHeader && (
          <EditPen onPress={props.onEditHeader} style={{ top: insets.top + 60, left: 16 }} label="Edit header photo" />
        )}
        <View style={styles.photoCopy}>
          {theme.hero.eyebrow && <Text style={styles.photoEyebrow}>{theme.hero.eyebrow}</Text>}
          <Text style={[styles.photoHeadline, { fontFamily: headingFont(theme, 'extraBold') }]}>
            {theme.hero.headline ?? spot.name}
          </Text>
          {theme.hero.subtext && <Text style={styles.photoSubtext}>{theme.hero.subtext}</Text>}
          {ctaButtons(props, 'onPhoto')}
        </View>
      </View>
      <InfoStrip {...props} />
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
  coverInset: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: 10,
    borderRadius: radius.lg,
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

