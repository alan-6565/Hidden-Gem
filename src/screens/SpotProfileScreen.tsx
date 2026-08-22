import React, { useState } from 'react';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import RatingStars from '../components/RatingStars';
import KuppioScoreBadge from '../components/KuppioScoreBadge';
import ReportMenuButton from '../components/ReportMenuButton';
import { getDisplayRating, getRatingDistribution, getReviewCount } from '../utils/rating';
import { getStatusLabel, isOpenNow } from '../utils/hours';
import { isPromoted } from '../utils/promotion';
import { CATEGORY_LABELS } from '../constants/categories';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { distanceMiles, formatDistance } from '../utils/geo';
import { useUserLocation } from '../utils/useUserLocation';

type Props = NativeStackScreenProps<RootStackParamList, 'SpotProfile'>;

export default function SpotProfileScreen({ route, navigation }: Props) {
  const { spotId } = route.params;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { spots, reviews, isSaved, toggleSaved, myVerifications } = useAppData();
  const { user } = useAuth();
  const userLocation = useUserLocation();
  const spot = spots.find((s) => s.id === spotId);
  const saved = isSaved(spotId);
  const [sortBy, setSortBy] = useState<'helpful' | 'recent' | 'highest'>('helpful');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            <Pressable style={styles.photoOverlayButton} onPress={() => toggleSaved(spotId)}>
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={18}
                color={saved ? colors.primary : '#fff'}
              />
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
            {rating.toFixed(1)} ({reviewCount} reviews) · {CATEGORY_LABELS[spot.category]}
          </Text>
        </View>
        <View style={styles.addressRow}>
          <Text style={styles.address}>{spot.isHomeBased ? spot.serviceArea : spot.address}</Text>
          <Text style={styles.distanceText}>{distance}</Text>
        </View>
        <Text style={[styles.status, { color: open ? colors.success : colors.textMuted }]}>
          {getStatusLabel(spot.hours)}
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

        {user && spot.ownerUserId === user.id && (
          <Pressable
            style={styles.manageBanner}
            onPress={() => navigation.navigate('BusinessEdit', { spotId })}
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.manageBannerText}>You manage this business</Text>
            <Text style={styles.manageBannerAction}>Edit</Text>
          </Pressable>
        )}

        <View style={styles.actionRow}>
          <Pressable style={styles.actionItem}>
            <Ionicons name="call-outline" size={20} color={colors.text} />
            <Text style={styles.actionLabel}>Call</Text>
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
          <Pressable style={styles.actionItem} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={colors.text} />
            <Text style={styles.actionLabel}>Share</Text>
          </Pressable>
        </View>

        {spot.description && <Text style={styles.description}>{spot.description}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular</Text>
        <FlatList
          data={spot.menu}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.menuItem}>
              {item.photo && <Image source={{ uri: item.photo }} style={styles.menuPhoto} />}
              <Text style={styles.menuName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.menuPrice}>${item.price.toFixed(2)}</Text>
            </View>
          )}
        />
        {spot.menu.length > 0 && (
          <Pressable
            style={styles.orderButton}
            onPress={() => navigation.navigate('Order', { spotId })}
          >
            <Ionicons name="bag-handle-outline" size={16} color="#fff" />
            <Text style={styles.orderButtonText}>Order ahead</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What people say</Text>
        {recommendPercent !== null && (
          <View style={styles.recommendRow}>
            <Ionicons name="thumbs-up" size={14} color={colors.success} />
            <Text style={styles.recommendText}>{recommendPercent}% recommend</Text>
          </View>
        )}

        <View style={styles.reviewsSummaryRow}>
          <View style={styles.reviewsSummaryLeft}>
            <Text style={styles.bigRating}>{rating.toFixed(1)}</Text>
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

        <Pressable
          style={styles.writeReviewButton}
          onPress={() => navigation.navigate('AddReview', { spotId: spot.id })}
        >
          <Text style={styles.writeReviewText}>Write a review</Text>
        </Pressable>

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
              <Image source={{ uri: review.userAvatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewUser}>{review.userName}</Text>
                <Text style={styles.reviewDate}>{review.createdAt}</Text>
              </View>
              <ReportMenuButton
                targetType="review"
                targetId={review.id}
                authorUserId={review.userId}
                authorName={review.userName}
              />
            </View>
            <RatingStars rating={review.ratingOverall} size={13} />
            <Text style={styles.reviewText}>{review.text}</Text>
            <View style={styles.reviewFooter}>
              <Ionicons name="heart-outline" size={14} color={colors.textMuted} />
              <Text style={styles.reviewFooterText}>{review.likeCount}</Text>
              <Text style={styles.reviewFooterText}>Reply</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
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
    backgroundColor: '#E3F2E9',
  },
  topRatedBadge: {
    backgroundColor: '#FCEFD4',
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
  description: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
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
  reviewFooterText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginRight: spacing.md,
  },
});
