import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { spots } from '../data/spots';
import { SpotCategory } from '../types';
import DistanceSlider from '../components/DistanceSlider';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SearchFilters'>;

type SortBy = 'top_match' | 'distance' | 'rating';

const CATEGORY_OPTIONS: { key: SpotCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'coffee', label: 'Cafes', icon: 'cafe' },
  { key: 'brunch', label: 'Brunch', icon: 'egg' },
  { key: 'dessert', label: 'Desserts', icon: 'ice-cream' },
  { key: 'matcha', label: 'Drinks', icon: 'wine' },
];

export default function SearchFiltersScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('top_match');
  const [selectedCategories, setSelectedCategories] = useState<SpotCategory[]>(['coffee']);
  const [openNow, setOpenNow] = useState(false);
  const [outdoorSeating, setOutdoorSeating] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);
  const [goodForStudying, setGoodForStudying] = useState(false);
  const [distance, setDistance] = useState(10);

  const toggleCategory = (key: SpotCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  };

  const resultCount = spots.filter((s) => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(s.category)) return false;
    if (outdoorSeating && !s.tags.includes('outdoor seating')) return false;
    if (goodForStudying && !s.tags.includes('study-friendly')) return false;
    return true;
  }).length;

  const clearAll = () => {
    setSelectedCategories([]);
    setOpenNow(false);
    setOutdoorSeating(false);
    setPetFriendly(false);
    setGoodForStudying(false);
    setDistance(10);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
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
        <DistanceSlider value={distance} onChange={setDistance} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.showResultsButton} onPress={() => navigation.goBack()}>
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
