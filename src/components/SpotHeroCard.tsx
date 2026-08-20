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
      <Image source={{ uri: spot.photos[0] }} style={styles.image} />
      <KuppioScoreBadge score={spot.teaScore} style={styles.scoreBadge} />
      <View style={styles.scrim} />
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
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 220,
    backgroundColor: colors.cream,
  },
  scoreBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: colors.dark,
    opacity: 0.55,
  },
  body: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  tagLine: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    marginTop: 4,
  },
});
