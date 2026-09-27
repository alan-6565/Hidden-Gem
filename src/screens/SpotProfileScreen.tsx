import React, { useMemo, useState } from 'react';
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
import { getDisplayRating, getRatingDistribution, getReviewCount } from '../utils/rating';
import { getStatusLabel, isOpenNow } from '../utils/hours';
import { isPromoted } from '../utils/promotion';
import { formatDate } from '../utils/date';
import { CATEGORY_LABELS } from '../constants/categories';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { distanceMiles, formatDistance } from '../utils/geo';
import { useUserLocation } from '../utils/useUserLocation';

type Props = NativeStackScreenProps<RootStackParamList, 'SpotProfile'>;
type SpotTab = 'home' | 'reels' | 'menu' | 'reviews';

const GRID_GAP = 2;

export default function SpotProfileScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
  } = useAppData();
  const { user } = useAuth();
  const userLocation = useUserLocation();
  const spot = spots.find((s) => s.id === spotId);
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

  const TABS: { key: SpotTab; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'home', icon: 'home-outline' },
    { key: 'reels', icon: 'play-circle-outline' },
    { key: 'menu', icon: 'restaurant-outline' },
    { key: 'reviews', icon: 'star-outline' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isSpotOwner && !spot.published && (
        <View style={[styles.draftBanner, { paddingTop: insets.top + spacing.sm }]}>
          <Ionicons name="eye-off-outline" size={14} color="#fff" />
          <Text style={styles.draftBannerText}>
            Draft preview — only you can see this page. Publish it from Business Hub.
          </Text>
        </View>
      )}
      <View style={styles.photoWrapper}>
        <FlatList
          data={spot.photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={{ width, height: 240 }} />
          )}
        />
        <View style={[styles.photoOverlayRow, { top: insets.top + spacing.xs }]}>
          <Pressable style={styles.photoOverlayButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <View style={styles.photoOverlayRight}>
            <Pressable style={styles.photoOverlayButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.nameRow}>
          <View style={styles.nameWithBadge}>
            <Text style={styles.name} numberOfLines={1}>
              {spot.name}
            </Text>
            {spot.ownerUserId !== null && (
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            )}
          </View>
          <View style={styles.scoreColumn}>
            <KuppioScoreBadge score={spot.teaScore} variant="light" />
            <Text style={styles.scoreCaption}>Kuppio Score</Text>
          </View>
        </View>
        <View style={styles.ratingRow}>
          <RatingStars rating={rating} size={15} />
          <Text style={styles.ratingText}>
            {reviewCount === 0 ? 'No reviews yet' : `${rating.toFixed(1)} (${reviewCount} reviews)`} · {CATEGORY_LABELS[spot.category]}
          </Text>
        </View>
        <View style={styles.addressRow}>
          <Text style={styles.address}>{spot.isHomeBased ? spot.serviceArea : spot.address}</Text>
          <Text style={styles.distanceText}>{distance}</Text>
        </View>
        <Text style={[styles.status, { color: open ? colors.success : colors.textMuted }]}>
          {getStatusLabel(spot.hours)} · {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
        </Text>

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
          <Pressable
            style={styles.manageBanner}
            onPress={() => navigation.navigate('BusinessHub', { spotId })}
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.manageBannerText}>You manage this business</Text>
            <Text style={styles.manageBannerAction}>Manage</Text>
          </Pressable>
        )}

        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionItem}
            onPress={() => toggleFollowSpot(spotId)}
            disabled={isSpotOwner}
          >
            <Ionicons
              name={following ? 'checkmark-circle' : 'add-circle-outline'}
              size={20}
              color={isSpotOwner ? colors.textMuted : following ? colors.primary : colors.text}
            />
            <Text
              style={[
                styles.actionLabel,
                following && { color: colors.primary },
                isSpotOwner && { color: colors.textMuted },
              ]}
            >
              {following ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
          <Pressable style={styles.actionItem} onPress={handleCall}>
            <Ionicons
              name="call-outline"
              size={20}
              color={spot.phone ? colors.text : colors.textMuted}
            />
            <Text style={[styles.actionLabel, !spot.phone && { color: colors.textMuted }]}>
              Call
            </Text>
          </Pressable>
          <Pressable style={styles.actionItem} onPress={handleDirections}>
            <Ionicons name="navigate-outline" size={20} color={colors.text} />
            <Text style={styles.actionLabel}>Directions</Text>
          </Pressable>
          <Pressable style={styles.actionItem} onPress={() => toggleSaved(spotId)}>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={20}
              color={saved ? colors.primary : colors.text}
            />
            <Text style={styles.actionLabel}>Save</Text>
          </Pressable>
        </View>

        <View style={styles.tabsRow}>
          {TABS.map(({ key, icon }) => (
            <Pressable key={key} style={styles.tab} onPress={() => setTab(key)}>
              <Ionicons name={icon} size={19} color={tab === key ? colors.primary : colors.textMuted} />
              {tab === key && <View style={styles.tabUnderline} />}
            </Pressable>
          ))}
        </View>
      </View>

      {tab === 'home' && (
        <View style={styles.section}>
          {spot.description && <Text style={styles.description}>{spot.description}</Text>}

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

          {spot.menu.length > 0 && (
            <>
              <View style={styles.homeMenuHeaderRow}>
                <Text style={styles.sectionTitle}>Popular</Text>
                <Pressable onPress={() => setTab('menu')}>
                  <Text style={styles.seeAllLink}>Full menu →</Text>
                </Pressable>
              </View>
              <FlatList
                data={popularMenuItems.length > 0 ? popularMenuItems : spot.menu}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.menuItem}>
                    {item.photo && (
                      <View>
                        <Image source={{ uri: item.photo }} style={styles.menuPhoto} />
                        {item.soldOut && (
                          <View style={styles.soldOutBadge}>
                            <Text style={styles.soldOutBadgeText}>Sold out</Text>
                          </View>
                        )}
                      </View>
                    )}
                    <Text style={styles.menuName} numberOfLines={1}>
                      {item.name}
                      {!item.photo && item.soldOut ? ' (Sold out)' : ''}
                    </Text>
                    <Text style={styles.menuPrice}>${item.price.toFixed(2)}</Text>
                  </View>
                )}
              />
            </>
          )}
        </View>
      )}

      {tab === 'reels' && (
        <View style={styles.reelsGrid}>
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

      {tab === 'menu' && (
        <View style={styles.section}>
          {spot.menu.length === 0 ? (
            <View style={styles.emptyTabState}>
              <Ionicons name="restaurant-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyTabText}>No menu yet.</Text>
            </View>
          ) : (
            <>
              {spot.menu.map((item) => (
                <View key={item.id} style={styles.menuRow}>
                  {item.photo ? (
                    <Image source={{ uri: item.photo }} style={styles.menuRowPhoto} />
                  ) : (
                    <View style={styles.menuRowPhotoPlaceholder}>
                      <Ionicons name="cafe-outline" size={16} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.menuRowBody}>
                    <View style={styles.menuRowNameLine}>
                      <Text style={styles.menuRowName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.isPopular && (
                        <View style={styles.menuPopularBadge}>
                          <Text style={styles.menuPopularBadgeText}>Popular</Text>
                        </View>
                      )}
                    </View>
                    {item.soldOut && <Text style={styles.menuSoldOutText}>Sold out</Text>}
                  </View>
                  <Text style={styles.menuRowPrice}>${item.price.toFixed(2)}</Text>
                </View>
              ))}
              {!isSpotOwner &&
                (spot.acceptingOrders ? (
                  <>
                    <Pressable
                      style={styles.orderButton}
                      onPress={() => navigation.navigate('Order', { spotId })}
                    >
                      <Ionicons name="bag-handle-outline" size={16} color="#fff" />
                      <Text style={styles.orderButtonText}>Order ahead</Text>
                    </Pressable>
                    {spot.prepTime && (
                      <Text style={styles.prepTimeHint}>Ready in {spot.prepTime}</Text>
                    )}
                  </>
                ) : (
                  <View style={styles.orderButtonDisabled}>
                    <Text style={styles.orderButtonDisabledText}>Not accepting orders right now</Text>
                  </View>
                ))}
            </>
          )}
        </View>
      )}

      {tab === 'reviews' && (
        <View style={styles.section}>
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
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
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
