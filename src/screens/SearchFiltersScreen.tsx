import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import { useSearchFilters } from '../context/SearchFilterContext';
import { SpotCategory } from '../types';
import DistanceSlider from '../components/DistanceSlider';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import {
  applySearchFilters,
  DEFAULT_SEARCH_FILTERS,
  DISTANCE_FILTER_MAX_MILES,
  SortBy,
} from '../utils/searchFilters';

type Props = NativeStackScreenProps<RootStackParamList, 'SearchFilters'>;

const CATEGORY_OPTIONS: { key: SpotCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'coffee', label: 'Cafes', icon: 'cafe' },
  { key: 'brunch', label: 'Brunch', icon: 'egg' },
  { key: 'dessert', label: 'Desserts', icon: 'ice-cream' },
  { key: 'matcha', label: 'Drinks', icon: 'wine' },
];

export default function SearchFiltersScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { spots, reviews } = useAppData();
  const { filters: appliedFilters, setFilters: setAppliedFilters } = useSearchFilters();
  const [query, setQuery] = useState(appliedFilters.query);
  const [sortBy, setSortBy] = useState<SortBy>(appliedFilters.sortBy);
  const [selectedCategories, setSelectedCategories] = useState<SpotCategory[]>(appliedFilters.categories);
  const [openNow, setOpenNow] = useState(appliedFilters.openNow);
  const [outdoorSeating, setOutdoorSeating] = useState(appliedFilters.outdoorSeating);
  const [petFriendly, setPetFriendly] = useState(appliedFilters.petFriendly);
  const [goodForStudying, setGoodForStudying] = useState(appliedFilters.goodForStudying);
  const [distance, setDistance] = useState(appliedFilters.maxDistanceMiles);

  const toggleCategory = (key: SpotCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  };

  const draftFilters = {
    query,
    categories: selectedCategories,
    openNow,
    outdoorSeating,
    petFriendly,
    goodForStudying,
    maxDistanceMiles: distance,
    sortBy,
  };

  // Distance is skipped here (no GPS origin in this preview) — Map applies it for real.
  const resultCount = applySearchFilters(spots, draftFilters, reviews, null).length;

  const clearAll = () => {
    setQuery(DEFAULT_SEARCH_FILTERS.query);
    setSortBy(DEFAULT_SEARCH_FILTERS.sortBy);
    setSelectedCategories(DEFAULT_SEARCH_FILTERS.categories);
    setOpenNow(DEFAULT_SEARCH_FILTERS.openNow);
    setOutdoorSeating(DEFAULT_SEARCH_FILTERS.outdoorSeating);
    setPetFriendly(DEFAULT_SEARCH_FILTERS.petFriendly);
    setGoodForStudying(DEFAULT_SEARCH_FILTERS.goodForStudying);
    setDistance(DEFAULT_SEARCH_FILTERS.maxDistanceMiles);
  };

  const showResults = () => {
    setAppliedFilters(draftFilters);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.searchRow, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cafes, brunch spots..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>Filters</Text>
          <Pressable onPress={clearAll}>
            <Text style={styles.clearAll}>Clear all</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Sort by</Text>
        <View style={styles.pillRow}>
          {(['top_match', 'distance', 'rating'] as SortBy[]).map((key) => (
            <Pressable
              key={key}
              style={[styles.pill, sortBy === key && styles.pillActive]}
              onPress={() => setSortBy(key)}
            >
              <Text style={[styles.pillText, sortBy === key && styles.pillTextActive]}>
                {key === 'top_match' ? 'Top match' : key === 'distance' ? 'Distance' : 'Rating'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Categories</Text>
        <View style={styles.categoryGrid}>
          {CATEGORY_OPTIONS.map((opt) => {
            const active = selectedCategories.includes(opt.key);
            return (
              <Pressable
                key={opt.key}
                style={[styles.categoryTile, active && styles.categoryTileActive]}
                onPress={() => toggleCategory(opt.key)}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={active ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Open now</Text>
          <Switch
            value={openNow}
            onValueChange={setOpenNow}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Outdoor seating</Text>
          <Switch
            value={outdoorSeating}
            onValueChange={setOutdoorSeating}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Pet friendly</Text>
          <Switch
            value={petFriendly}
            onValueChange={setPetFriendly}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Good for studying</Text>
          <Switch
            value={goodForStudying}
            onValueChange={setGoodForStudying}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Text style={styles.sectionLabel}>Distance</Text>
        <DistanceSlider value={distance} max={DISTANCE_FILTER_MAX_MILES} onChange={setDistance} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.showResultsButton} onPress={showResults}>
          <Text style={styles.showResultsText}>Show results ({resultCount})</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  cancel: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  clearAll: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pillTextActive: {
    color: '#fff',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryTile: {
    width: 78,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryTileActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  categoryLabelActive: {
    color: colors.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  showResultsButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  showResultsText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
