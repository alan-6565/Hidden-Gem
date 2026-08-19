import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../context/DataContext';
import { CURRENT_USER_DISPLAY } from '../constants';
import { SpotCategory } from '../types';
import CategoryIconButton from '../components/CategoryIconButton';
import SpotTrendingCard from '../components/SpotTrendingCard';
import { colors, spacing } from '../theme';
import { TabScreenProps } from '../navigation/types';
import { useUserLocation } from '../utils/useUserLocation';

type Props = TabScreenProps<'Home'>;

type CategoryFilter = 'for_you' | SpotCategory | 'trending';

const CATEGORIES: { key: CategoryFilter; label: string; icon?: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'for_you', label: 'For You' },
  { key: 'coffee', label: 'Cafes', icon: 'cafe' },
  { key: 'brunch', label: 'Brunch', icon: 'egg' },
  { key: 'dessert', label: 'Desserts', icon: 'ice-cream' },
  { key: 'trending', label: 'Trending', icon: 'flame' },
];

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { spots, savedSpotIds } = useAppData();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('for_you');
  const userLocation = useUserLocation();
  const locationLabel = userLocation.isRealLocation && userLocation.placeName
    ? userLocation.placeName
    : 'San Francisco';

  const trendingSpots = useMemo(() => {
    const sorted = [...spots].sort((a, b) => b.teaScore - a.teaScore);
    if (activeCategory === 'for_you' || activeCategory === 'trending') return sorted;
    return sorted.filter((s) => s.category === activeCategory);
  }, [spots, activeCategory]);

  const savedSpots = spots.filter((s) => savedSpotIds.includes(s.id));

  const goToSpot = (spotId: string) => navigation.navigate('SpotProfile', { spotId });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.logo}>Kuppio</Text>
        <Ionicons name="notifications-outline" size={22} color={colors.text} />
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
        <Text style={styles.locationText}>{locationLabel}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </View>

      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.categoryRow}
        renderItem={({ item }) =>
          item.key === 'for_you' ? (
            <CategoryIconButton
              label={item.label}
              avatarUrl={CURRENT_USER_DISPLAY.avatar}
              active={activeCategory === item.key}
              onPress={() => setActiveCategory(item.key)}
            />
          ) : (
            <CategoryIconButton
              label={item.label}
              icon={item.icon}
              active={activeCategory === item.key}
              onPress={() => setActiveCategory(item.key)}
            />
          )
        }
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trending near you 🔥</Text>
        {trendingSpots.length === 0 ? (
          <Text style={styles.emptyText}>Nothing in this category yet.</Text>
        ) : (
          <FlatList
            data={trendingSpots}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SpotTrendingCard spot={item} onPress={() => goToSpot(item.id)} />
            )}
          />
        )}
      </View>

      {savedSpots.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Because you saved this place</Text>
          <FlatList
            data={savedSpots}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SpotTrendingCard spot={item} onPress={() => goToSpot(item.id)} />
            )}
          />
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    fontStyle: 'italic',
    color: colors.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginRight: 2,
  },
  categoryRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  section: {
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    paddingRight: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    paddingRight: spacing.md,
  },
});
