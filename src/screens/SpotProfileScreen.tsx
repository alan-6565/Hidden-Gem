import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { fetchSpotFollowerCount } from '../lib/api';
import RatingStars from '../components/RatingStars';
import Avatar from '../components/Avatar';
import KuppioScoreBadge from '../components/KuppioScoreBadge';
import ReportMenuButton from '../components/ReportMenuButton';
import StorefrontBackground from '../components/storefront/StorefrontBackground';
import StorefrontHero, { HeroInfo } from '../components/storefront/StorefrontHero';
import ItemSheet from '../components/storefront/ItemSheet';
import { CartBar, FavoritesRow, MenuView } from '../components/storefront/StorefrontMenu';
import { useCart } from '../context/CartContext';
import { MenuItem } from '../types';
import { headingFont, isSoldOut, resolveStorefront, storefrontPalette } from '../utils/storefrontTheme';
import { getDisplayRating, getRatingDistribution, getReviewCount } from '../utils/rating';
import { getStatusLabel, isOpenNow } from '../utils/hours';
import { isPromoted } from '../utils/promotion';
import { formatDate } from '../utils/date';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../constants/categories';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { distanceMiles, formatDistance } from '../utils/geo';
import { useUserLocation } from '../utils/useUserLocation';

type Props = NativeStackScreenProps<RootStackParamList, 'SpotProfile'>;
type SpotTab = 'home' | 'menu' | 'reels' | 'reviews' | 'about';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const GRID_GAP = 2;

export default function SpotProfileScreen({ route, navigation }: Props) {
  const { colors: appColors } = useTheme();
  const { spotId } = route.params;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    spots,
    reviews,
    posts,
    isSaved,
    toggleSaved,
    isFollowingSpot,
    toggleFollowSpot,
    myVerifications,
    isReviewLiked,
    toggleReviewLike,
    deleteReview,
    replyToReview,
    isAdmin,
    removeSpot,
  } = useAppData();
  const { user } = useAuth();
  const userLocation = useUserLocation();
  const spot = spots.find((s) => s.id === spotId);
  // The whole page draws from `colors`, so a custom storefront re-themes
  // everything — reviews and tabs included — just by swapping the palette.
  const theme = useMemo(() => resolveStorefront(spot?.storefront), [spot?.storefront]);
  const colors = useMemo(
    () => storefrontPalette(theme, appColors, !!spot?.storefront),
    [theme, appColors, spot?.storefront],
  );
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { linesFor, addToCart } = useCart();
  const cartLines = linesFor(spotId);
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const tabsY = useRef(0);
  const [contentHeight, setContentHeight] = useState(0);
  const saved = isSaved(spotId);
  const following = isFollowingSpot(spotId);
  const isSpotOwner = !!spot && !!user && spot.ownerUserId === user.id;
  const [tab, setTab] = useState<SpotTab>('home');
  const [sortBy, setSortBy] = useState<'helpful' | 'recent' | 'highest'>('helpful');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      fetchSpotFollowerCount(spotId).then(setFollowerCount).catch(() => {});
    }, [spotId]),
  );

  const startReply = (reviewId: string, existingReply: string | null | undefined) => {
    setReplyingToId(reviewId);
    setReplyDraft(existingReply ?? '');
  };

  const handleSubmitReply = async (reviewId: string) => {
    setSubmittingReply(true);
    try {
      await replyToReview(reviewId, replyDraft);
      setReplyingToId(null);
      setReplyDraft('');
    } catch (e: any) {
      Alert.alert("Couldn't save reply", e?.message ?? 'Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };
  const confirmAdminRemove = () => {
    Alert.alert(
      'Remove this listing?',
      'It will disappear from the app for everyone, including its owner. It can be restored from the database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeSpot(spotId);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert("Couldn't remove listing", e?.message ?? 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const pendingVerification = myVerifications.find(
    (v) => v.status === 'pending' && v.existingSpotId === spotId,
  );

  if (!spot) {
    return (
      <View style={styles.container}>
        <Text>Spot not found.</Text>
      </View>
    );
  }

  const rating = getDisplayRating(spot, reviews);
  const reviewCount = getReviewCount(spot, reviews);
  const distribution = getRatingDistribution(spot.id, reviews);
  const maxDistribution = Math.max(1, ...distribution);
  const open = isOpenNow(spot.hours);
  const distance = formatDistance(
    distanceMiles(userLocation.coords, { lat: spot.lat, lng: spot.lng }),
  );

  const allSpotReviews = reviews.filter((r) => r.spotId === spot.id);
  const recommendPercent =
    allSpotReviews.length > 0
      ? Math.round(
          (allSpotReviews.filter((r) => r.ratingOverall >= 4).length / allSpotReviews.length) * 100,
        )
      : null;

  const spotReels = posts.filter((p) => p.spotId === spot.id && p.authorType === 'owner' && p.isVideo);
  const popularMenuItems = spot.menu.filter((item) => item.isPopular);

  const isHiddenGem = spot.hiddenGemVotes > spot.worthTheHypeVotes;
  const isTopRated = rating >= 4.5;
  const isPopularSpot = isPromoted(spot) || spot.worthTheHypeVotes > 50;

  let spotReviews = allSpotReviews;
  if (sortBy === 'recent') {
    spotReviews = [...spotReviews].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } else if (sortBy === 'highest') {
    spotReviews = [...spotReviews].sort((a, b) => b.ratingOverall - a.ratingOverall);
  } else {
    spotReviews = [...spotReviews].sort((a, b) => b.likeCount - a.likeCount);
  }

  const handleDirections = () => {
    const url = `https://maps.apple.com/?daddr=${spot.lat},${spot.lng}&dirflg=d`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Couldn't open Maps", 'Please try again.'),
    );
  };

  const handleCall = () => {
    if (!spot.phone) {
      Alert.alert('No phone number', 'This business hasn\'t added a phone number yet.');
      return;
    }
    Linking.openURL(`tel:${spot.phone}`).catch(() =>
      Alert.alert("Couldn't start the call", 'Please try again.'),
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${spot.name} on Kuppio!${
          spot.isHomeBased ? '' : `\n${spot.address}`
        }`,
      });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  };

  const TABS: { key: SpotTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'home', label: 'Home', icon: 'home-outline' },
    { key: 'menu', label: 'Menu', icon: 'restaurant-outline' },
    { key: 'reels', label: 'Reels', icon: 'play-circle-outline' },
    { key: 'reviews', label: 'Reviews', icon: 'star-outline' },
    { key: 'about', label: 'About', icon: 'information-circle-outline' },
  ];

  const canOrder = !isSpotOwner && spot.acceptingOrders;
  const heroInfo: HeroInfo = {
    rating,
    reviewCount,
    open,
    statusLabel: getStatusLabel(spot.hours),
    cityLabel: cityOf(spot.isHomeBased ? spot.serviceArea : spot.address),
    distanceLabel: distance,
    prepTime: spot.prepTime,
    following,
    isOwner: isSpotOwner,
    canOrder,
  };

  const favorites = (popularMenuItems.length > 0 ? popularMenuItems : spot.menu).slice(0, 8);
  const heading = headingFont(theme);

  const goToTab = (next: SpotTab) => {
    setTab(next);
    scrollRef.current?.scrollTo({ y: Math.max(0, tabsY.current - insets.top - 60), animated: true });
  };

  const quickAdd = (item: MenuItem) => {
    if (!canOrder || isSoldOut(item)) return;
    addToCart(spotId, item, [], 1);
  };

  const tabBar = (
    <View
      style={[styles.tabsRow, theme.hero.style !== 'cover' && styles.tabsCard]}
      onLayout={(e) => {
        tabsY.current = e.nativeEvent.layout.y;
      }}
    >
      {TABS.map(({ key, label, icon }) => (
        <Pressable key={key} style={styles.tab} onPress={() => setTab(key)}>
          <Ionicons name={icon} size={19} color={tab === key ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: tab === key ? colors.primary : colors.textMuted }]}>{label}</Text>
          {tab === key && <View style={styles.tabUnderline} />}
        </Pressable>
      ))}
    </View>
  );

  const background = theme.background;
  // Over a patterned background, content sits on solid cards (the pattern
  // only shows between them) so nothing is ever unreadable.
  const panel = !!background && theme.layout === 'panel';
  const surface = background && !panel ? styles.surface : null;
  const flatCard = panel ? styles.aboutCardFlat : null;

  return (
    <View style={styles.container}>
      {background?.fixedWhileScrolling && <StorefrontBackground background={background} />}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          cartLines.length > 0 && styles.contentWithCart,
          panel && styles.contentPanel,
        ]}
        onContentSizeChange={(_, h) => setContentHeight(h)}
      >
        {background && !background.fixedWhileScrolling && (
          <StorefrontBackground background={background} height={contentHeight} />
        )}
        {isSpotOwner && !spot.published && (
          <View style={[styles.draftBanner, { paddingTop: insets.top + spacing.sm }]}>
            <Ionicons name="eye-off-outline" size={14} color={colors.background} />
            <Text style={styles.draftBannerText}>
              Draft preview — only you can see this page. Publish it from Business Hub.
            </Text>
          </View>
        )}

        <View>
          <StorefrontHero
            spot={spot}
            theme={theme}
            colors={colors}
            info={heroInfo}
            onPrimary={() => goToTab('menu')}
            onSecondary={() => (theme.hero.secondaryAction === 'menu' ? goToTab('menu') : handleDirections())}
            onFollow={() => toggleFollowSpot(spotId)}
            footer={theme.hero.style === 'cover' ? tabBar : undefined}
          />
          <View style={[styles.photoOverlayRow, { top: insets.top + spacing.xs }]}>
            <Pressable style={styles.photoOverlayButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>
            <View style={styles.photoOverlayRight}>
              {theme.hero.style !== 'cover' && !isSpotOwner && (
                <Pressable style={styles.photoOverlayButton} onPress={() => toggleFollowSpot(spotId)}>
                  <Ionicons name={following ? 'heart' : 'heart-outline'} size={18} color="#fff" />
                </Pressable>
              )}
              <Pressable style={styles.photoOverlayButton} onPress={() => toggleSaved(spotId)}>
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={17} color="#fff" />
              </Pressable>
              <Pressable style={styles.photoOverlayButton} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
              </Pressable>
              {!isSpotOwner && (
                <View style={styles.photoOverlayButton}>
                  <ReportMenuButton
                    targetType="spot"
                    targetId={spot.id}
                    color="#fff"
                    size={18}
                    extraActions={
                      isAdmin
                        ? [{ text: 'Remove listing (admin)', style: 'destructive', onPress: confirmAdminRemove }]
                        : undefined
                    }
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={panel ? [styles.panel, cartLines.length > 0 && styles.contentWithCart] : undefined}>
        <View style={styles.bannerArea}>
          {spot.ownerUserId === null && pendingVerification && (
            <View style={styles.claimBanner}>
              <Ionicons name="time-outline" size={18} color={colors.primaryDark} />
              <Text style={styles.claimBannerText}>Your claim is pending review</Text>
              <Pressable onPress={() => navigation.navigate('VerificationStatus')}>
                <Text style={styles.claimBannerAction}>View status</Text>
              </Pressable>
            </View>
          )}
          {spot.ownerUserId === null && !pendingVerification && (
            <View style={styles.claimBanner}>
              <Ionicons name="storefront-outline" size={18} color={colors.primaryDark} />
              <Text style={styles.claimBannerText}>Is this your business?</Text>
              <Pressable onPress={() => navigation.navigate('ClaimBusiness', { spotId })}>
                <Text style={styles.claimBannerAction}>Claim it</Text>
              </Pressable>
            </View>
          )}
          {isSpotOwner && (
            <Pressable style={styles.manageBanner} onPress={() => navigation.navigate('BusinessHub', { spotId })}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.manageBannerText}>You manage this business</Text>
              <Text style={styles.manageBannerAction}>Manage</Text>
            </Pressable>
          )}
        </View>

        {theme.hero.style !== 'cover' && tabBar}

        {tab === 'home' && (
          <View>
            {theme.hero.style === 'cover' && spot.description ? (
              <View style={[styles.aboutCard, flatCard]}>
                <Text style={[styles.aboutCardTitle, { fontFamily: heading }]}>About {spot.name}</Text>
                <Text style={styles.description}>{spot.description}</Text>
              </View>
            ) : null}
            <FavoritesRow
              theme={theme}
              colors={colors}
              items={favorites}
              onOpen={setOpenItem}
              onSeeAll={() => goToTab('menu')}
            />
            {theme.sections.showLatest && spotReels.length > 0 && (
              <View style={[styles.latestBlock, surface]}>
                <View style={styles.homeMenuHeaderRow}>
                  <Text style={[styles.sectionTitle, { fontFamily: heading }]}>Latest from {spot.name}</Text>
                  <Pressable onPress={() => setTab('reels')}>
                    <Text style={styles.seeAllLink}>See all</Text>
                  </Pressable>
                </View>
                <Pressable
                  style={styles.latestCard}
                  onPress={() => navigation.navigate('Tabs', { screen: 'Reels' })}
                >
                  <Ionicons name="play-circle" size={44} color="#fff" />
                </Pressable>
              </View>
            )}
            {theme.hero.style !== 'cover' && spot.description ? (
              <View style={[styles.aboutCard, flatCard]}>
                <Text style={[styles.aboutCardTitle, { fontFamily: heading }]}>Our story</Text>
                <Text style={styles.description}>{spot.description}</Text>
              </View>
            ) : null}
          </View>
        )}

        {tab === 'menu' && (
          <View style={surface}>
            {spot.menu.length === 0 ? (
              <View style={styles.emptyTabState}>
                <Ionicons name="restaurant-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyTabText}>No menu yet.</Text>
              </View>
            ) : (
              <>
                <MenuView
                  theme={theme}
                  colors={colors}
                  items={spot.menu}
                  sections={spot.menuSections}
                  canOrder={canOrder}
                  onOpen={setOpenItem}
                  onQuickAdd={quickAdd}
                />
                {!isSpotOwner && !spot.acceptingOrders && (
                  <View style={[styles.orderButtonDisabled, styles.menuNotice]}>
                    <Text style={styles.orderButtonDisabledText}>Not accepting orders right now</Text>
                  </View>
                )}
                {isSpotOwner && (
                  <Text style={[styles.prepTimeHint, styles.menuNotice]}>
                    This is how customers see your menu. You can't order from your own business.
                  </Text>
                )}
              </>
            )}
          </View>
        )}

      {tab === 'reels' && (
        <View style={[styles.reelsGrid, surface]}>
          {spotReels.length === 0 ? (
            <View style={styles.emptyTabState}>
              <Ionicons name="play-circle-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyTabText}>No Reels yet.</Text>
            </View>
          ) : (
            <View style={styles.gridRow}>
              {spotReels.map((post) => (
                <Pressable
                  key={post.id}
                  style={styles.gridTile}
                  onPress={() => navigation.navigate('Tabs', { screen: 'Reels' })}
                >
                  <View style={[styles.gridTile, styles.videoPlaceholder]}>
                    <Ionicons name="play" size={22} color="#fff" />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {tab === 'reviews' && (
        <View style={[styles.section, surface]}>
          {recommendPercent !== null && (
            <View style={styles.recommendRow}>
              <Ionicons name="thumbs-up" size={14} color={colors.success} />
              <Text style={styles.recommendText}>{recommendPercent}% recommend</Text>
            </View>
          )}

          <View style={styles.reviewsSummaryRow}>
            <View style={styles.reviewsSummaryLeft}>
              <Text style={styles.bigRating}>{reviewCount === 0 ? '–' : rating.toFixed(1)}</Text>
              <RatingStars rating={rating} size={16} />
              <Text style={styles.reviewCountText}>{reviewCount} reviews</Text>
            </View>
            <View style={styles.distributionBars}>
              {distribution.map((count, i) => (
                <View key={i} style={styles.barRow}>
                  <Text style={styles.barLabel}>{5 - i}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${(count / maxDistribution) * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {spot.ownerUserId !== user?.id && (
            <Pressable
              style={styles.writeReviewButton}
              onPress={() => navigation.navigate('AddReview', { spotId: spot.id })}
            >
              <Text style={styles.writeReviewText}>
                {allSpotReviews.some((r) => r.userId === user?.id) ? 'Edit your review' : 'Write a review'}
              </Text>
            </Pressable>
          )}

          <View style={styles.sortRow}>
            {(['helpful', 'recent', 'highest'] as const).map((key) => (
              <Pressable key={key} onPress={() => setSortBy(key)}>
                <Text style={[styles.sortLabel, sortBy === key && styles.sortLabelActive]}>
                  {key === 'helpful' ? 'Most helpful' : key === 'recent' ? 'Most recent' : 'Highest rating'}
                </Text>
              </Pressable>
            ))}
          </View>

          {spotReviews.length === 0 && (
            <Text style={styles.textMuted}>No reviews yet — be the first to post one.</Text>
          )}
          {spotReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Avatar uri={review.userAvatar} name={review.userName} size={32} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewUser}>{review.userName}</Text>
                  <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                </View>
                <ReportMenuButton
                  targetType="review"
                  targetId={review.id}
                  authorUserId={review.userId}
                  authorName={review.userName}
                  onDelete={review.userId === user?.id ? () => deleteReview(review.id) : undefined}
                />
              </View>
              <RatingStars rating={review.ratingOverall} size={13} />
              <Text style={styles.reviewText}>{review.text}</Text>
              <View style={styles.reviewFooter}>
                <Pressable
                  style={styles.reviewFooterLike}
                  hitSlop={8}
                  onPress={() => toggleReviewLike(review.id)}
                >
                  <Ionicons
                    name={isReviewLiked(review.id) ? 'heart' : 'heart-outline'}
                    size={14}
                    color={isReviewLiked(review.id) ? colors.danger : colors.textMuted}
                  />
                  <Text style={styles.reviewFooterText}>{review.likeCount}</Text>
                </Pressable>
                {isSpotOwner && (
                  <Pressable hitSlop={8} onPress={() => startReply(review.id, review.replyText)}>
                    <Text style={styles.reviewFooterText}>
                      {review.replyText ? 'Edit reply' : 'Reply'}
                    </Text>
                  </Pressable>
                )}
              </View>

              {review.replyText && replyingToId !== review.id && (
                <View style={styles.ownerReplyBlock}>
                  <Text style={styles.ownerReplyLabel}>Reply from the owner</Text>
                  <Text style={styles.ownerReplyText}>{review.replyText}</Text>
                </View>
              )}

              {replyingToId === review.id && (
                <View style={styles.replyEditor}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Write a reply..."
                    placeholderTextColor={colors.textMuted}
                    value={replyDraft}
                    onChangeText={setReplyDraft}
                    multiline
                  />
                  <View style={styles.replyEditorActions}>
                    <Pressable
                      hitSlop={8}
                      onPress={() => {
                        setReplyingToId(null);
                        setReplyDraft('');
                      }}
                    >
                      <Text style={styles.replyEditorCancel}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      disabled={submittingReply}
                      onPress={() => handleSubmitReply(review.id)}
                    >
                      <Text style={styles.replyEditorSave}>
                        {submittingReply ? 'Saving...' : 'Save'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
        {tab === 'about' && (
          <View style={[styles.section, surface, surface && styles.surfacePadded]}>
            {spot.description ? (
              <View style={[styles.aboutCard, styles.aboutCardFlush]}>
                <Text style={[styles.aboutCardTitle, { fontFamily: heading }]}>About {spot.name}</Text>
                <Text style={styles.description}>{spot.description}</Text>
              </View>
            ) : null}

            <View style={styles.scoreRow}>
              <KuppioScoreBadge score={spot.teaScore} variant="light" />
              <View style={{ flex: 1 }}>
                <Text style={styles.scoreRowTitle}>Kuppio Score</Text>
                <Text style={styles.textMuted}>
                  {reviewCount === 0 ? 'No reviews yet' : `${rating.toFixed(1)}★ from ${reviewCount} reviews`} · {followerCount}{' '}
                  {followerCount === 1 ? 'follower' : 'followers'}
                </Text>
              </View>
            </View>
            {(isHiddenGem || isTopRated || isPopularSpot) && (
              <View style={styles.badgeRow}>
                {isHiddenGem && (
                  <View style={[styles.achievementBadge, styles.hiddenGemBadge]}>
                    <Text style={styles.achievementBadgeText}>💎 Hidden Gem</Text>
                  </View>
                )}
                {isTopRated && (
                  <View style={[styles.achievementBadge, styles.topRatedBadge]}>
                    <Text style={styles.achievementBadgeText}>🏆 Top Rated</Text>
                  </View>
                )}
                {isPopularSpot && (
                  <View style={[styles.achievementBadge, styles.popularBadge]}>
                    <Text style={styles.achievementBadgeText}>🔥 Popular</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={[styles.sectionTitle, styles.aboutHeading]}>Hours</Text>
            {spot.hours.length === 0 ? (
              <Text style={styles.textMuted}>Hours not listed yet.</Text>
            ) : (
              DAY_ORDER.map((day) => {
                const entry = spot.hours.find((h) => h.day === day);
                return (
                  <View key={day} style={styles.hoursRow}>
                    <Text style={styles.hoursDay}>{day}</Text>
                    <Text style={entry ? styles.hoursTime : styles.textMuted}>
                      {entry ? `${entry.open} – ${entry.close}` : 'Closed'}
                    </Text>
                  </View>
                );
              })
            )}
            <Text style={[styles.status, { color: open ? colors.success : colors.textMuted }]}>
              {getStatusLabel(spot.hours)}
            </Text>

            <Text style={[styles.sectionTitle, styles.aboutHeading]}>Find us</Text>
            <Pressable style={styles.aboutRow} onPress={handleDirections}>
              <Ionicons name="location-outline" size={18} color={colors.text} />
              <Text style={styles.aboutRowText}>
                {(spot.isHomeBased ? spot.serviceArea : spot.address) ?? 'Location not listed'} · {distance}
              </Text>
              <Ionicons name="navigate-outline" size={16} color={colors.primary} />
            </Pressable>
            <Pressable style={styles.aboutRow} onPress={handleCall}>
              <Ionicons name="call-outline" size={18} color={spot.phone ? colors.text : colors.textMuted} />
              <Text style={[styles.aboutRowText, !spot.phone && { color: colors.textMuted }]}>
                {spot.phone ?? 'No phone number yet'}
              </Text>
            </Pressable>

            {(spot.instagramUrl || spot.tiktokUrl) && (
              <View style={styles.socialRow}>
                {spot.instagramUrl && (
                  <Pressable
                    style={styles.socialButton}
                    onPress={() =>
                      Linking.openURL(spot.instagramUrl!).catch(() =>
                        Alert.alert("Couldn't open Instagram", 'Please try again.'),
                      )
                    }
                  >
                    <Ionicons name="logo-instagram" size={16} color={colors.text} />
                    <Text style={styles.socialButtonText}>Instagram</Text>
                  </Pressable>
                )}
                {spot.tiktokUrl && (
                  <Pressable
                    style={styles.socialButton}
                    onPress={() =>
                      Linking.openURL(spot.tiktokUrl!).catch(() =>
                        Alert.alert("Couldn't open TikTok", 'Please try again.'),
                      )
                    }
                  >
                    <Ionicons name="logo-tiktok" size={16} color={colors.text} />
                    <Text style={styles.socialButtonText}>TikTok</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}
        </View>
      </ScrollView>

      {!isSpotOwner && (
        <CartBar colors={colors} lines={cartLines} onPress={() => navigation.navigate('Order', { spotId })} />
      )}
      <ItemSheet
        item={openItem}
        theme={theme}
        colors={colors}
        canOrder={canOrder}
        onClose={() => setOpenItem(null)}
        onAdd={(item, options, quantity) => addToCart(spotId, item, options, quantity)}
      />
    </View>
  );
}

// "150 Christine Dr, San Pablo, CA" → "San Pablo, CA"; short strings pass through.
function cityOf(location?: string) {
  if (!location) return 'Location not listed';
  const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length >= 3 ? parts.slice(-2).join(', ') : location;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingBottom: spacing.xl,
  },
  contentWithCart: {
    paddingBottom: 100,
  },
  contentPanel: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  panel: {
    flexGrow: 1,
    marginHorizontal: spacing.sm,
    backgroundColor: colors.card,
    paddingBottom: spacing.xl,
  },
  aboutCardFlat: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginTop: spacing.xs,
    paddingBottom: 0,
  },
  surface: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  surfacePadded: {
    paddingHorizontal: spacing.md,
  },
  bannerArea: {
    paddingHorizontal: spacing.md,
  },
  tabsCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderBottomWidth: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  aboutCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  aboutCardFlush: {
    marginHorizontal: 0,
    marginTop: 0,
  },
  aboutCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  latestBlock: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  latestCard: {
    height: 170,
    borderRadius: radius.md,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuNotice: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  scoreRowTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  aboutHeading: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  hoursDay: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  hoursTime: {
    fontSize: 14,
    color: colors.text,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  aboutRowText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  draftBannerText: {
    flex: 1,
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  photoWrapper: {
    position: 'relative',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlayRow: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoOverlayRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoOverlayButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nameWithBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  scoreColumn: {
    alignItems: 'center',
  },
  scoreCaption: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  achievementBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  hiddenGemBadge: {
    backgroundColor: colors.successMuted,
  },
  topRatedBadge: {
    backgroundColor: colors.goldMuted,
  },
  popularBadge: {
    backgroundColor: colors.primaryMuted,
  },
  achievementBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  recommendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  recommendText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  ratingText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  address: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
  },
  distanceText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  status: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  claimBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  claimBannerAction: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  manageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  manageBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  manageBannerAction: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  actionItem: {
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  tabUnderline: {
    height: 2,
    width: 28,
    borderRadius: 1,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
  },
  description: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  socialButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  homeMenuHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  seeAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  menuItem: {
    width: 110,
    marginRight: spacing.sm,
  },
  menuPhoto: {
    width: 110,
    height: 90,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
  },
  menuName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  menuPrice: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptyTabState: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  emptyTabText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  reelsGrid: {
    paddingTop: spacing.xs,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: GRID_GAP,
  },
  gridTile: {
    width: '33%',
    aspectRatio: 1,
    marginBottom: GRID_GAP,
    backgroundColor: colors.cream,
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowPhoto: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },
  menuRowPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowBody: {
    flex: 1,
  },
  menuRowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  menuRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  menuPopularBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  menuPopularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  menuSoldOutText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  menuRowPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.md,
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  prepTimeHint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  orderButtonDisabled: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.md,
  },
  orderButtonDisabledText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  soldOutBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.sm,
    paddingVertical: 2,
    alignItems: 'center',
  },
  soldOutBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  reviewsSummaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
  reviewsSummaryLeft: {
    alignItems: 'center',
  },
  bigRating: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
  },
  reviewCountText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  distributionBars: {
    flex: 1,
    gap: 3,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textMuted,
    width: 8,
  },
  barTrack: {
    flex: 1,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: 5,
    backgroundColor: colors.primary,
  },
  writeReviewButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  writeReviewText: {
    color: '#fff',
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sortLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sortLabelActive: {
    color: colors.primary,
  },
  textMuted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  reviewCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  reviewUser: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 13,
  },
  reviewDate: {
    color: colors.textMuted,
    fontSize: 11,
  },
  reviewText: {
    color: colors.text,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  reviewFooterLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewFooterText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginRight: spacing.md,
  },
  ownerReplyBlock: {
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  ownerReplyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  ownerReplyText: {
    fontSize: 12,
    color: colors.text,
  },
  replyEditor: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 12,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  replyEditorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  replyEditorCancel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  replyEditorSave: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
