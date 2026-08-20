import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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

export default function SpotHeroCard({ spot, onPress }: Props) {
  const { reviews } = useAppData();
  const rating = getDisplayRating(spot, reviews);
  const count = getReviewCount(spot, reviews);
  const tagLine = `Hidden gem${spot.isHomeBased ? ' · Home-based' : ''}`;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: spot.photos[0] }} style={styles.image} />
        <KuppioScoreBadge score={spot.teaScore} style={styles.scoreBadge} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {spot.name}
        </Text>
        <View style={styles.ratingRow}>
          <RatingStars rating={rating} size={13} />
          <Text style={styles.ratingText}>
            {rating.toFixed(1)} ({count})
          </Text>
        </View>
        <Text style={styles.tagLine}>{tagLine}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: colors.cream,
  },
  scoreBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  body: {
    padding: spacing.md,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tagLine: {
    fontSize: 12,
    color: colors.matchaDark,
    fontWeight: '600',
    marginTop: 4,
  },
});
