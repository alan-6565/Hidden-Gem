import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import { useAppData } from '../context/DataContext';
import { SpotCategory } from '../types';
import SpotPreviewCard from '../components/SpotPreviewCard';
import FilterChip from '../components/FilterChip';
import { colors, radius, spacing } from '../theme';
import { TabScreenProps } from '../navigation/types';
import { isOpenNow } from '../utils/hours';
import { MOCK_USER_LOCATION } from '../utils/geo';
import { useUserLocation } from '../utils/useUserLocation';

type Props = TabScreenProps<'Map'>;

const CATEGORY_FILTERS: { key: SpotCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'coffee', label: 'Cafes' },
  { key: 'brunch', label: 'Brunch' },
  { key: 'dessert', label: 'Desserts' },
];

const REGION_DELTA = { latitudeDelta: 0.12, longitudeDelta: 0.12 };

const INITIAL_REGION: Region = {
  latitude: MOCK_USER_LOCATION.lat,
  longitude: MOCK_USER_LOCATION.lng,
  ...REGION_DELTA,
};

export default function MapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { spots } = useAppData();
  const mapRef = useRef<MapView>(null);
  const [category, setCategory] = useState<SpotCategory | 'all'>('all');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const userLocation = useUserLocation();

  const filteredSpots = useMemo(() => {
    return spots.filter((s) => {
      if (category !== 'all' && s.category !== category) return false;
      if (openNowOnly && !isOpenNow(s.hours)) return false;
      return true;
    });
  }, [spots, category, openNowOnly]);

  const selectedSpot = spots.find((s) => s.id === selectedSpotId) ?? null;

  useEffect(() => {
    if (userLocation.isRealLocation) {
      mapRef.current?.animateToRegion(
        { latitude: userLocation.coords.lat, longitude: userLocation.coords.lng, ...REGION_DELTA },
        400,
      );
    }
  }, [userLocation.isRealLocation, userLocation.coords]);

  const recenter = async () => {
    if (userLocation.permissionDenied) {
      Alert.alert(
        'Location access needed',
        'Turn on location access for Where\'s the Tea? in Settings to find spots near you.',
      );
      return;
    }
    // Refreshing updates userLocation.coords, which the effect above picks up
    // to animate the map — avoids animating with a stale closure value here.
    await userLocation.refresh();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
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

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onPress={() => setSelectedSpotId(null)}
        showsUserLocation={userLocation.isRealLocation}
        showsMyLocationButton={false}
      >
        {filteredSpots.map((spot) => {
          const selected = spot.id === selectedSpotId;
          return (
            <Marker
              key={spot.id}
              coordinate={{ latitude: spot.lat, longitude: spot.lng }}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedSpotId(spot.id);
              }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
            >
              <View style={styles.pinWrapper}>
                <View style={[styles.pinBubble, selected && styles.pinBubbleSelected]}>
                  <Text style={[styles.pinLabel, selected && styles.pinLabelSelected]}>
                    {spot.priceRange}
                  </Text>
                </View>
                <View style={[styles.pinPointer, selected && styles.pinPointerSelected]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.mapButtons}>
        <Pressable style={styles.roundButton} onPress={recenter}>
          <Ionicons name="locate" size={18} color={colors.text} />
        </Pressable>
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
  map: {
    flex: 1,
  },
  pinWrapper: {
    alignItems: 'center',
  },
  pinBubble: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  pinBubbleSelected: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 1.15 }],
  },
  pinLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  pinLabelSelected: {
    color: '#fff',
  },
  pinPointer: {
    width: 8,
    height: 8,
    backgroundColor: colors.primary,
    marginTop: -4,
    transform: [{ rotate: '45deg' }],
  },
  pinPointerSelected: {
    backgroundColor: colors.primaryDark,
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
