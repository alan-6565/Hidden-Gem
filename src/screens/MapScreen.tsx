import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import { useAppData } from '../context/DataContext';
import { SpotCategory } from '../types';
import SpotPreviewCard from '../components/SpotPreviewCard';
import FilterChip from '../components/FilterChip';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/categories';
import { colors, radius, spacing } from '../theme';
import { TabScreenProps } from '../navigation/types';
import { isOpenNow } from '../utils/hours';
import { MOCK_USER_LOCATION } from '../utils/geo';
import { useUserLocation } from '../utils/useUserLocation';
import { useSearchFilters } from '../context/SearchFilterContext';
import { applySearchFilters, DEFAULT_SEARCH_FILTERS } from '../utils/searchFilters';

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
  const { spots, reviews } = useAppData();
  const { filters } = useSearchFilters();
  const mapRef = useRef<MapView>(null);
  const [category, setCategory] = useState<SpotCategory | 'all'>('all');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [addingBusiness, setAddingBusiness] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region>(INITIAL_REGION);
  const userLocation = useUserLocation();
  // Custom Marker children with icon glyphs can render blank on iOS if a
  // view-snapshot (tracksViewChanges=false) is taken before the icon font
  // paints. Keep tracking on briefly after mount so pins actually show up,
  // then switch off for the usual performance win.
  const [pinsReady, setPinsReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPinsReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredSpots = useMemo(() => {
    const chipFiltered = spots.filter((s) => {
      if (category !== 'all' && s.category !== category) return false;
      if (openNowOnly && !isOpenNow(s.hours)) return false;
      return true;
    });
    return applySearchFilters(
      chipFiltered,
      filters,
      reviews,
      userLocation.isRealLocation ? userLocation.coords : null,
    );
  }, [spots, category, openNowOnly, filters, reviews, userLocation.isRealLocation, userLocation.coords]);

  const selectedSpot = spots.find((s) => s.id === selectedSpotId) ?? null;

  useEffect(() => {
    if (userLocation.isRealLocation) {
      mapRef.current?.animateToRegion(
        { latitude: userLocation.coords.lat, longitude: userLocation.coords.lng, ...REGION_DELTA },
        400,
      );
    }
  }, [userLocation.isRealLocation, userLocation.coords]);

  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.categories.length > 0 ||
    filters.openNow ||
    filters.outdoorSeating ||
    filters.petFriendly ||
    filters.goodForStudying ||
    filters.maxDistanceMiles < DEFAULT_SEARCH_FILTERS.maxDistanceMiles ||
    filters.sortBy !== 'top_match';

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

  const startAddingBusiness = () => {
    setSelectedSpotId(null);
    setAddingBusiness(true);
  };

  const confirmBusinessLocation = () => {
    setAddingBusiness(false);
    navigation.navigate('CreateBusiness', {
      lat: currentRegion.latitude,
      lng: currentRegion.longitude,
    });
  };

  return (
    <View style={styles.container}>
      {!addingBusiness && (
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            style={styles.searchBar}
            onPress={() => navigation.navigate('SearchFilters')}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              {filters.query.trim() || 'Search cafes, brunch spots...'}
            </Text>
            {hasActiveFilters && <View style={styles.filterActiveDot} />}
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
      )}

      {addingBusiness && (
        <View style={[styles.placementHint, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.placementHintText}>Move the map to place your pin</Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onPress={() => setSelectedSpotId(null)}
        onRegionChangeComplete={setCurrentRegion}
        showsUserLocation={userLocation.isRealLocation}
        showsMyLocationButton={false}
      >
        {!addingBusiness &&
          filteredSpots.map((spot) => {
            const selected = spot.id === selectedSpotId;
            const pinColor = CATEGORY_COLORS[spot.category];
            return (
              <Marker
                key={spot.id}
                coordinate={{ latitude: spot.lat, longitude: spot.lng }}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedSpotId(spot.id);
                }}
                anchor={{ x: 0.5, y: 1 }}
                tracksViewChanges={!pinsReady}
              >
                <View style={styles.pinWrapper}>
                  <View
                    style={[
                      styles.pinBubble,
                      { backgroundColor: pinColor },
                      selected && styles.pinBubbleSelected,
                    ]}
                  >
                    <Ionicons name={CATEGORY_ICONS[spot.category]} size={16} color="#fff" />
                  </View>
                  <View style={[styles.pinPointer, { backgroundColor: pinColor }]} />
                </View>
              </Marker>
            );
          })}
      </MapView>

      {addingBusiness && (
        <View pointerEvents="none" style={styles.centerPinWrapper}>
          <Ionicons name="location" size={44} color={colors.primary} />
        </View>
      )}

      {!addingBusiness && (
        <View style={styles.mapButtons}>
          <Pressable style={styles.roundButton} onPress={startAddingBusiness}>
            <Ionicons name="storefront-outline" size={18} color={colors.text} />
          </Pressable>
          <Pressable style={styles.roundButton} onPress={recenter}>
            <Ionicons name="locate" size={18} color={colors.text} />
          </Pressable>
        </View>
      )}

      {!addingBusiness && selectedSpot && (
        <View style={styles.previewWrapper}>
          <SpotPreviewCard
            spot={selectedSpot}
            onPress={() =>
              navigation.navigate('SpotProfile', { spotId: selectedSpot.id })
            }
          />
        </View>
      )}

      {addingBusiness && (
        <View style={[styles.placementBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable style={styles.placementCancel} onPress={() => setAddingBusiness(false)}>
            <Text style={styles.placementCancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.placementConfirm} onPress={confirmBusinessLocation}>
            <Text style={styles.placementConfirmText}>Use this location</Text>
          </Pressable>
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
    flex: 1,
    color: colors.textMuted,
    fontSize: 14,
  },
  filterActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  pinPointer: {
    width: 8,
    height: 8,
    marginTop: -4,
    transform: [{ rotate: '45deg' }],
  },
  mapButtons: {
    position: 'absolute',
    right: spacing.md,
    bottom: 140,
    gap: spacing.sm,
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
  placementHint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  placementHintText: {
    backgroundColor: colors.card,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  centerPinWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -22,
    marginTop: -44,
  },
  placementBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  placementCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placementCancelText: {
    color: colors.text,
    fontWeight: '700',
  },
  placementConfirm: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  placementConfirmText: {
    color: '#fff',
    fontWeight: '700',
  },
});
