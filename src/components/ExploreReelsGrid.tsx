import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

export const EXPLORE_TAGS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'cafes', label: 'Cafes', icon: 'cafe' },
  { key: 'brunch', label: 'Brunch', icon: 'egg' },
  { key: 'desserts', label: 'Desserts', icon: 'ice-cream' },
  { key: 'drinks', label: 'Drinks', icon: 'wine' },
  { key: 'hidden_gems', label: 'Hidden Gems', icon: 'diamond' },
  { key: 'date_night', label: 'Date Night', icon: 'heart' },
  { key: 'study_spots', label: 'Study Spots', icon: 'book' },
  { key: 'pet_friendly', label: 'Pet Friendly', icon: 'paw' },
  { key: 'aesthetic', label: 'Aesthetic', icon: 'sparkles' },
];

interface Props {
  onSelectTag: (tag: string) => void;
}

export default function ExploreReelsGrid({ onSelectTag }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore Reels</Text>
      <Text style={styles.subtitle}>Find your next favorite spot</Text>
      <View style={styles.grid}>
        {EXPLORE_TAGS.map((tag) => (
          <Pressable key={tag.key} style={styles.tile} onPress={() => onSelectTag(tag.key)}>
            <Ionicons name={tag.icon} size={22} color={colors.primary} />
            <Text style={styles.tileLabel}>{tag.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
});
