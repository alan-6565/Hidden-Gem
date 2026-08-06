import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spot } from '../types';
import { useAppData } from '../context/DataContext';
import { getDisplayRating, getReviewCount } from '../utils/rating';
import { colors, radius, spacing } from '../theme';

interface Props {
  spot: Spot;
  onPress: () => void;
}

export default function SpotTrendingCard({ spot, onPress }: Props) {
  const { reviews } = useAppData();
  const rating = getDisplayRating(spot, reviews);
  const count = getReviewCount(spot, reviews);
  const location = spot.isHomeBased ? spot.serviceArea : spot.address?.split(',')[0];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: spot.photos[0] }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {spot.name}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={colors.gold} />
          <Text style={styles.ratingText}>
            {rating.toFixed(1)} {count > 0 ? `(${count})` : ''}
          </Text>
        </View>
        <Text style={styles.location} numberOfLines={1}>
          {location}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 168,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  image: {
    width: '100%',
    height: 110,
    backgroundColor: colors.cream,
  },
  body: {
    padding: spacing.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  location: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
});
