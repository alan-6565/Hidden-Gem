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
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import RatingStars from '../components/RatingStars';
import { getDisplayRating, getRatingDistribution, getReviewCount } from '../utils/rating';
import { getStatusLabel, isOpenNow } from '../utils/hours';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SpotProfile'>;

const CATEGORY_LABELS: Record<string, string> = {
  coffee: 'Cafe',
  matcha: 'Matcha & Tea',
  dessert: 'Dessert',
  brunch: 'Brunch',
  home_based: 'Home-Based',
  pop_up: 'Pop-Up',
  food_truck: 'Food Truck',
};

export default function SpotProfileScreen({ route, navigation }: Props) {
  const { spotId } = route.params;
  const { width } = useWindowDimensions();
  const { spots, reviews, isSaved, toggleSaved, claimSpot } = useAppData();
  const { user } = useAuth();
  const spot = spots.find((s) => s.id === spotId);
  const saved = isSaved(spotId);
  const [sortBy, setSortBy] = useState<'helpful' | 'recent' | 'highest'>('helpful');
  const [claiming, setClaiming] = useState(false);

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

  let spotReviews = reviews.filter((r) => r.spotId === spot.id);
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

  const handleClaim = () => {
    Alert.alert(
      'Claim this business?',
      `You'll be able to edit ${spot.name}'s hours, menu, and photos, and your posts here will show an Owner badge. Anyone can claim an unclaimed spot for now — there's no verification yet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim it',
          onPress: async () => {
            setClaiming(true);
            try {
              await claimSpot(spotId);
            } catch (e: any) {
              Alert.alert("Couldn't claim this business", e?.message ?? 'Please try again.');
            } finally {
              setClaiming(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      <View style={styles.section}>
        <Text style={styles.name}>{spot.name}</Text>
        <View style={styles.ratingRow}>
          <RatingStars rating={rating} size={15} />
          <Text style={styles.ratingText}>
            {rating.toFixed(1)} ({reviewCount} reviews) · {CATEGORY_LABELS[spot.category]}
          </Text>
        </View>
        <Text style={styles.address}>{spot.isHomeBased ? spot.serviceArea : spot.address}</Text>
        <Text style={[styles.status, { color: open ? colors.success : colors.textMuted }]}>
          {getStatusLabel(spot.hours)}
        </Text>

        {spot.ownerUserId === null && (
          <View style={styles.claimBanner}>
            <Ionicons name="storefront-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.claimBannerText}>Is this your business?</Text>
            <Pressable onPress={handleClaim} disabled={claiming}>
              <Text style={styles.claimBannerAction}>
                {claiming ? 'Claiming…' : 'Claim it'}
              </Text>
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
      </View>

      <View style={styles.section}>
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
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
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
  address: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 13,
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
