import React, { useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { currentUser, collections } from '../data/user';
import { spots } from '../data/spots';
import { SpotCategory } from '../types';
import FilterChip from '../components/FilterChip';
import { colors, radius, spacing } from '../theme';
import { TabScreenProps } from '../navigation/types';

type Props = TabScreenProps<'Profile'>;

const SAVED_FILTERS: { key: SpotCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'coffee', label: 'Cafes' },
  { key: 'brunch', label: 'Brunch' },
  { key: 'dessert', label: 'Desserts' },
  { key: 'matcha', label: 'Drinks' },
];

const CATEGORY_LABELS: Record<SpotCategory, string> = {
  coffee: 'Cafe',
  matcha: 'Matcha & Tea',
  dessert: 'Dessert',
  brunch: 'Brunch',
  home_based: 'Home-Based',
  pop_up: 'Pop-Up',
  food_truck: 'Food Truck',
};

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [savedIds, setSavedIds] = useState<string[]>(currentUser.savedSpotIds);
  const [filter, setFilter] = useState<SpotCategory | 'all'>('all');

  const toggleSaved = (spotId: string) => {
    setSavedIds((prev) =>
      prev.includes(spotId) ? prev.filter((id) => id !== spotId) : [...prev, spotId],
    );
  };

  const savedSpots = spots
    .filter((s) => savedIds.includes(s.id))
    .filter((s) => filter === 'all' || s.category === filter);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
    >
      <View style={styles.profileHeader}>
        <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{currentUser.name}</Text>
      </View>

      <Text style={styles.sectionTitle}>Your Collections</Text>
      {collections.map((col) => (
        <View key={col.id} style={styles.collectionCard}>
          <Text style={styles.collectionName}>{col.name}</Text>
          <Text style={styles.collectionDesc}>{col.description}</Text>
          <Text style={styles.collectionCount}>{col.spotIds.length} spots</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Saved</Text>
      <FlatList
        data={SAVED_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <FilterChip
            label={item.label}
            active={filter === item.key}
            onPress={() => setFilter(item.key)}
          />
        )}
      />

      {savedSpots.length === 0 && (
        <Text style={styles.textMuted}>Nothing saved yet — go explore Home or the Map.</Text>
      )}
      {savedSpots.map((spot) => (
        <Pressable
          key={spot.id}
          style={styles.savedRow}
          onPress={() => navigation.navigate('SpotProfile', { spotId: spot.id })}
        >
          <Image source={{ uri: spot.photos[0] }} style={styles.savedThumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.savedName}>{spot.name}</Text>
            <Text style={styles.savedMeta}>
              {CATEGORY_LABELS[spot.category]} ·{' '}
              {(spot.isHomeBased ? spot.serviceArea : spot.address)?.split(',')[0]}
            </Text>
          </View>
          <Pressable hitSlop={8} onPress={() => toggleSaved(spot.id)}>
            <Ionicons name="heart" size={20} color={colors.primary} />
          </Pressable>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  collectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  collectionName: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  collectionDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  collectionCount: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  filterRow: {
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  textMuted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  savedThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },
  savedName: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
  savedMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
