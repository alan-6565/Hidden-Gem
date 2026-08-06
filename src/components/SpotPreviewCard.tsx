import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spot } from '../types';
import { useAppData } from '../context/DataContext';
import { getDisplayRating, getReviewCount } from '../utils/rating';
import { getStatusLabel, isOpenNow } from '../utils/hours';
import { colors, radius, spacing } from '../theme';

const CATEGORY_LABELS: Record<Spot['category'], string> = {
  coffee: 'Cafe',
  matcha: 'Matcha & Tea',
  dessert: 'Dessert',
  brunch: 'Brunch',
  home_based: 'Home-Based',
  pop_up: 'Pop-Up',
  food_truck: 'Food Truck',
};

interface Props {
  spot: Spot;
  onPress: () => void;
}

export default function SpotPreviewCard({ spot, onPress }: Props) {
  const { reviews, isSaved, toggleSaved } = useAppData();
  const saved = isSaved(spot.id);
  const rating = getDisplayRating(spot, reviews);
  const count = getReviewCount(spot, reviews);
  const open = isOpenNow(spot.hours);
  const location = spot.isHomeBased ? spot.serviceArea : spot.address;

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
            {rating.toFixed(1)} ({count}) · {CATEGORY_LABELS[spot.category]}
          </Text>
        </View>
        <Text style={styles.location} numberOfLines={1}>
          {location}
        </Text>
        <Text style={[styles.status, { color: open ? colors.success : colors.textMuted }]}>
          {getStatusLabel(spot.hours)}
        </Text>
      </View>
      <Pressable
        style={styles.saveButton}
        onPress={(e) => {
          e.stopPropagation();
          toggleSaved(spot.id);
        }}
        hitSlop={8}
      >
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={20}
          color={saved ? colors.primary : colors.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },
  body: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    fontSize: 15,
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
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  location: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  status: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  saveButton: {
    padding: spacing.xs,
  },
});
