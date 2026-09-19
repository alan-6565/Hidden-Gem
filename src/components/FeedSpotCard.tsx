import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spot } from '../types';
import { useAppData } from '../context/DataContext';
import { getDisplayRating, getReviewCount } from '../utils/rating';
import KuppioScoreBadge from './KuppioScoreBadge';
import RatingStars from './RatingStars';
import { colors, radius, spacing } from '../theme';

interface Props {
  spot: Spot;
  onPress: () => void;
}

export default function FeedSpotCard({ spot, onPress }: Props) {
  const { reviews, isSaved, toggleSaved } = useAppData();
  const saved = isSaved(spot.id);
  const location = spot.isHomeBased ? spot.serviceArea : spot.address?.split(',')[0];
  const rating = getDisplayRating(spot, reviews);
  const reviewCount = getReviewCount(spot, reviews);
  const isHiddenGem = spot.hiddenGemVotes > spot.worthTheHypeVotes;

  const reviewers = reviews
    .filter((r) => r.spotId === spot.id)
    .slice(0, 3)
    .map((r) => r.userAvatar)
    .filter(Boolean);

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: spot.photos[0] }} style={styles.image} />
        {location && (
          <View style={styles.locationPill}>
            <Ionicons name="location" size={11} color="#fff" />
            <Text style={styles.locationPillText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}
        <KuppioScoreBadge score={spot.teaScore} style={styles.scoreBadge} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {spot.name}
          </Text>
          <Pressable onPress={() => toggleSaved(spot.id)} hitSlop={8}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={saved ? colors.primary : colors.textMuted}
            />
          </Pressable>
        </View>

        <View style={styles.ratingRow}>
          <RatingStars rating={rating} size={13} />
          <Text style={[styles.ratingText, { color: colors.textMuted }]}>
            {rating.toFixed(1)} ({reviewCount})
          </Text>
          {isHiddenGem && (
            <Text style={[styles.hiddenGemTag, { color: colors.matchaDark }]}>· Hidden gem</Text>
          )}
        </View>

        {spot.description && (
          <Text style={[styles.tagline, { color: colors.textMuted }]} numberOfLines={1}>
            {spot.description}
          </Text>
        )}

        {reviewers.length > 0 && (
          <View style={styles.socialRow}>
            <View style={styles.avatarStack}>
              {reviewers.map((uri, i) => (
                <Image
                  key={uri + i}
                  source={{ uri }}
                  style={[
                    styles.avatar,
                    { borderColor: colors.card, marginLeft: i === 0 ? 0 : -10 },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.socialText, { color: colors.textMuted }]}>
              {reviewCount} {reviewCount === 1 ? 'person' : 'people'} reviewed this
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 220,
  },
  locationPill: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: '70%',
  },
  locationPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  scoreBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  body: {
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    marginRight: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hiddenGemTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 13,
    marginTop: 2,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  socialText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
