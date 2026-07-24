import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spots } from '../data/spots';
import { SpotCategory } from '../types';
import SpotMap from '../components/SpotMap';
import SpotPreviewCard from '../components/SpotPreviewCard';
import FilterChip from '../components/FilterChip';
import { colors, radius, spacing } from '../theme';
import { TabScreenProps } from '../navigation/types';
import { isOpenNow } from '../utils/hours';

type Props = TabScreenProps<'Map'>;

const CATEGORY_FILTERS: { key: SpotCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'coffee', label: 'Cafes' },
  { key: 'brunch', label: 'Brunch' },
  { key: 'dessert', label: 'Desserts' },
];

export default function MapScreen({ navigation }: Props) {
  const [category, setCategory] = useState<SpotCategory | 'all'>('all');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);

  const filteredSpots = useMemo(() => {
    return spots.filter((s) => {
      if (category !== 'all' && s.category !== category) return false;
      if (openNowOnly && !isOpenNow(s.hours)) return false;
      return true;
    });
  }, [category, openNowOnly]);

  const selectedSpot = spots.find((s) => s.id === selectedSpotId) ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.searchBar}
          onPress={() => navigation.navigate('SearchFilters')}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search cafes, brunch spots...</Text>
        </Pressable>

        <View style={styles.chipRow}>
          {CATEGORY_FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={category === f.key}
              onPress={() => setCategory(f.key)}
            />
          ))}
          <FilterChip
            label="Open now"
            active={openNowOnly}
            onPress={() => setOpenNowOnly((v) => !v)}
          />
        </View>
      </View>

      <SpotMap
        spots={filteredSpots}
        selectedSpotId={selectedSpotId}
        onSelectSpot={setSelectedSpotId}
      />

      <View style={styles.mapButtons}>
        <View style={styles.roundButton}>
          <Ionicons name="locate" size={18} color={colors.text} />
        </View>
      </View>

      {selectedSpot && (
        <View style={styles.previewWrapper}>
          <SpotPreviewCard
            spot={selectedSpot}
            onPress={() =>
              navigation.navigate('SpotProfile', { spotId: selectedSpot.id })
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    zIndex: 2,
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
  },
  searchPlaceholder: {
    color: colors.textMuted,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  mapButtons: {
    position: 'absolute',
    right: spacing.md,
    bottom: 140,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  previewWrapper: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
});
