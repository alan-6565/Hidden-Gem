import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../context/DataContext';
import { useSearchFilters } from '../context/SearchFilterContext';
import { SpotCategory } from '../types';
import CategoryIconButton from '../components/CategoryIconButton';
import SpotTrendingCard from '../components/SpotTrendingCard';
import SpotDropCard from '../components/SpotDropCard';
import SpotHeroCard from '../components/SpotHeroCard';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../constants/categories';
import { colors, radius, spacing } from '../theme';
import { TabScreenProps } from '../navigation/types';
import { useUserLocation } from '../utils/useUserLocation';
import { isPromoted } from '../utils/promotion';

type Props = TabScreenProps<'Home'>;

type CategoryFilter = 'all' | SpotCategory;

const HOME_CATEGORIES: SpotCategory[] = ['coffee', 'matcha', 'dessert', 'home_based', 'food_truck'];
const HOME_CATEGORY_LABELS: Record<SpotCategory, string> = {
  ...CATEGORY_LABELS,
  coffee: 'Cafes',
  matcha: 'Matcha',
  dessert: 'Desserts',
  home_based: 'Home',
  food_truck: 'Trucks',
};

const CATEGORIES: { key: CategoryFilter; label: string; icon?: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  ...HOME_CATEGORIES.map((key) => ({ key, label: HOME_CATEGORY_LABELS[key], icon: CATEGORY_ICONS[key] })),
];

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { spots, savedSpotIds } = useAppData();
  const { filters } = useSearchFilters();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const userLocation = useUserLocation();
  const locationLabel = userLocation.isRealLocation && userLocation.placeName
    ? userLocation.placeName
    : 'San Francisco';

  const sortedByTrending = useMemo(() => {
    return [...spots].sort((a, b) => {
      const promoDiff = Number(isPromoted(b)) - Number(isPromoted(a));
      if (promoDiff !== 0) return promoDiff;
      return b.teaScore - a.teaScore;
    });
  }, [spots]);

  const trendingSpots = useMemo(() => {
    if (activeCategory === 'all') return sortedByTrending;
    return sortedByTrending.filter((s) => s.category === activeCategory);
  }, [sortedByTrending, activeCategory]);

  const happeningTodaySpots = sortedByTrending.slice(0, 8);

  const hiddenGemSpot = useMemo(() => {
    if (spots.length === 0) return null;
    return [...spots].sort((a, b) => b.hiddenGemVotes - a.hiddenGemVotes)[0];
  }, [spots]);

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

      <Text style={styles.headline}>What's good{'\n'}near you right now?</Text>

      <Pressable style={styles.searchBar} onPress={() => navigation.navigate('SearchFilters')}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder} numberOfLines={1}>
          {filters.query.trim() || 'Search for cafes, foods, people...'}
        </Text>
        <Ionicons name="options-outline" size={18} color={colors.primary} />
      </Pressable>

      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.categoryRow}
        renderItem={({ item }) => (
          <CategoryIconButton
            label={item.label}
            icon={item.icon}
            active={activeCategory === item.key}
            onPress={() => setActiveCategory(item.key)}
          />
        )}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 Happening Today</Text>
        {happeningTodaySpots.length === 0 ? (
          <Text style={styles.emptyText}>Nothing happening yet.</Text>
        ) : (
          <FlatList
            data={happeningTodaySpots}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SpotDropCard
                spot={item}
                userCoords={userLocation.coords}
                onPress={() => goToSpot(item.id)}
              />
            )}
          />
        )}
      </View>

      {hiddenGemSpot && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💎 Hidden Gems Near You</Text>
          <SpotHeroCard spot={hiddenGemSpot} onPress={() => goToSpot(hiddenGemSpot.id)} />
        </View>
      )}

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
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    lineHeight: 30,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  searchPlaceholder: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 14,
  },
  categoryRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  section: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
