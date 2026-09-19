import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useSearchFilters } from '../context/SearchFilterContext';
import { Post, Review, SpotCategory } from '../types';
import FilterChip from '../components/FilterChip';
import FeedPostCard from '../components/FeedPostCard';
import CategoryIconButton from '../components/CategoryIconButton';
import SpotDropCard from '../components/SpotDropCard';
import SpotHeroCard from '../components/SpotHeroCard';
import SpotTrendingCard from '../components/SpotTrendingCard';
import StoriesRow from '../components/StoriesRow';
import StoryViewerModal from '../components/StoryViewerModal';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../constants/categories';
import { CURRENT_USER_DISPLAY } from '../constants';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { TabScreenProps } from '../navigation/types';
import { useUserLocation } from '../utils/useUserLocation';
import { isPromoted } from '../utils/promotion';
import { distanceMiles } from '../utils/geo';
import { applySearchFilters, hasActiveFilters } from '../utils/searchFilters';

type Props = TabScreenProps<'Home'>;

type CategoryFilter = 'all' | SpotCategory;
type FeedMode = 'for_you' | 'following' | 'nearby';

const FEED_TABS: { key: FeedMode; label: string }[] = [
  { key: 'for_you', label: 'For you' },
  { key: 'following', label: 'Following' },
  { key: 'nearby', label: 'Nearby' },
];

const HOME_CATEGORIES: SpotCategory[] = ['coffee', 'matcha', 'dessert', 'home_based', 'food_truck'];
const HOME_CATEGORY_LABELS: Record<SpotCategory, string> = {
  ...CATEGORY_LABELS,
  coffee: 'Cafes',
  matcha: 'Matcha',
  dessert: 'Desserts',
  home_based: 'Home',
  food_truck: 'Trucks',
};

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  ...HOME_CATEGORIES.map((key) => ({ key, label: HOME_CATEGORY_LABELS[key] })),
];

const EMPTY_REVIEWS: Review[] = [];

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { spots, posts, stories, reviews, savedSpotIds, followingIds } = useAppData();
  const { user } = useAuth();
  const { filters, resetFilters } = useSearchFilters();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [feedMode, setFeedMode] = useState<FeedMode>('for_you');
  const [viewingStories, setViewingStories] = useState<Post[] | null>(null);
  const userLocation = useUserLocation();
  const locationLabel = userLocation.isRealLocation && userLocation.placeName
    ? userLocation.placeName
    : 'San Francisco';

  const byScore = useMemo(
    () =>
      [...spots].sort((a, b) => {
        const promoDiff = Number(isPromoted(b)) - Number(isPromoted(a));
        if (promoDiff !== 0) return promoDiff;
        return b.teaScore - a.teaScore;
      }),
    [spots],
  );

  const byDistance = useMemo(() => {
    if (feedMode !== 'nearby') return [];
    const distanceById = new Map(
      spots.map((s) => [s.id, distanceMiles(userLocation.coords, { lat: s.lat, lng: s.lng })]),
    );
    return [...spots].sort((a, b) => distanceById.get(a.id)! - distanceById.get(b.id)!);
  }, [spots, feedMode, userLocation.coords]);

  const followingSpots = useMemo(() => {
    const followedSpotIds = new Set(
      posts
        .filter((p) => p.userId && followingIds.includes(p.userId) && p.spotId)
        .map((p) => p.spotId as string),
    );
    return spots.filter((s) => followedSpotIds.has(s.id));
  }, [posts, followingIds, spots]);

  const baseSpots =
    feedMode === 'following' ? followingSpots : feedMode === 'nearby' ? byDistance : byScore;

  // Filters set in the Search & Filters screen apply to this feed too — the
  // Map used to be the only place they showed up.
  const filtersActive = hasActiveFilters(filters);
  const filteredSpots = useMemo(
    () =>
      filtersActive
        ? applySearchFilters(
            baseSpots,
            filters,
            reviews,
            userLocation.isRealLocation ? userLocation.coords : null,
          )
        : baseSpots,
    [filtersActive, baseSpots, filters, reviews, userLocation.isRealLocation, userLocation.coords],
  );

  const trendingSpots = useMemo(() => {
    if (activeCategory === 'all') return filteredSpots;
    return filteredSpots.filter((s) => s.category === activeCategory);
  }, [filteredSpots, activeCategory]);

  // Nearby-tab discovery sections (Happening Today, Hidden Gems, Trending,
  // Saved). Hidden while a search/filter is active so results stay in front.
  const showNearbySections = feedMode === 'nearby' && !filtersActive;

  const iconCategories = useMemo(
    () => [
      { key: 'all' as CategoryFilter, label: 'All', icon: 'grid-outline' as const, color: colors.primary },
      ...HOME_CATEGORIES.map((key) => ({
        key,
        label: HOME_CATEGORY_LABELS[key],
        icon: CATEGORY_ICONS[key],
        color: CATEGORY_COLORS[key],
      })),
    ],
    [colors.primary],
  );

  const happeningTodaySpots = useMemo(() => byScore.slice(0, 8), [byScore]);

  const hiddenGemSpot = useMemo(() => {
    if (spots.length === 0) return null;
    return [...spots].sort((a, b) => b.hiddenGemVotes - a.hiddenGemVotes)[0];
  }, [spots]);

  const nearbyTrendingSpots = useMemo(
    () => (activeCategory === 'all' ? byScore : byScore.filter((s) => s.category === activeCategory)),
    [byScore, activeCategory],
  );

  const savedSpots = useMemo(
    () => spots.filter((s) => savedSpotIds.includes(s.id)),
    [spots, savedSpotIds],
  );

  const reviewsBySpot = useMemo(() => {
    const map = new Map<string, Review[]>();
    for (const review of reviews) {
      const bucket = map.get(review.spotId);
      if (bucket) bucket.push(review);
      else map.set(review.spotId, [review]);
    }
    return map;
  }, [reviews]);

  const goToSpot = (spotId: string) => navigation.navigate('SpotProfile', { spotId });

  return (
    <View style={styles.container}>
      <FlatList
        data={trendingSpots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
              <View>
                <Text style={styles.logo}>Kuppio</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.locationText}>{locationLabel}</Text>
                  <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
                </View>
              </View>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
            </View>

            <StoriesRow
              stories={stories}
              currentUserId={user?.id ?? null}
              currentUserAvatar={CURRENT_USER_DISPLAY.avatar}
              onAddStory={() => navigation.navigate('Compose', { isStory: true })}
              onOpenGroup={(group) => setViewingStories(group.stories)}
            />

            {showNearbySections && (
              <Text style={styles.headline}>
                What's good{'\n'}near you right now?
              </Text>
            )}

            <Pressable style={styles.searchBar} onPress={() => navigation.navigate('SearchFilters')}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <Text style={styles.searchPlaceholder} numberOfLines={1}>
                {filters.query.trim() || 'Search for cafes, foods, people...'}
              </Text>
              <Ionicons name="options-outline" size={18} color={colors.primary} />
            </Pressable>

            {filtersActive && (
              <View style={styles.resultsRow}>
                <Text style={styles.resultsText}>
                  {trendingSpots.length} {trendingSpots.length === 1 ? 'result' : 'results'}
                </Text>
                <Pressable onPress={resetFilters} hitSlop={8}>
                  <Text style={styles.clearFiltersText}>Clear filters</Text>
                </Pressable>
              </View>
            )}

            {showNearbySections ? (
              <FlatList
                data={iconCategories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.key}
                contentContainerStyle={styles.categoryRow}
                renderItem={({ item }) => (
                  <CategoryIconButton
                    label={item.label}
                    icon={item.icon}
                    color={item.color}
                    active={activeCategory === item.key}
                    onPress={() => setActiveCategory(item.key)}
                  />
                )}
              />
            ) : (
              <FlatList
                data={CATEGORIES}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.key}
                contentContainerStyle={styles.categoryRow}
                renderItem={({ item }) => (
                  <FilterChip
                    label={item.label}
                    active={activeCategory === item.key}
                    onPress={() => setActiveCategory(item.key)}
                  />
                )}
              />
            )}

            <View style={styles.feedTabs}>
              {FEED_TABS.map((tab) => (
                <Pressable key={tab.key} style={styles.feedTab} onPress={() => setFeedMode(tab.key)}>
                  <Text style={[styles.feedTabText, feedMode === tab.key && styles.feedTabTextActive]}>
                    {tab.label}
                  </Text>
                  <View
                    style={[styles.feedTabUnderline, feedMode === tab.key && styles.feedTabUnderlineActive]}
                  />
                </Pressable>
              ))}
            </View>

            {showNearbySections && (
              <>
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>🔥 Happening Today</Text>
                    <Pressable onPress={() => navigation.navigate('Map')}>
                      <Text style={styles.seeAll}>See all</Text>
                    </Pressable>
                  </View>
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
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>💎 Hidden Gems Near You</Text>
                      <Pressable onPress={() => navigation.navigate('Map')}>
                        <Text style={styles.seeAll}>See all</Text>
                      </Pressable>
                    </View>
                    <SpotHeroCard spot={hiddenGemSpot} onPress={() => goToSpot(hiddenGemSpot.id)} />
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Trending near you 🔥</Text>
                  {nearbyTrendingSpots.length === 0 ? (
                    <Text style={styles.emptyText}>Nothing in this category yet.</Text>
                  ) : (
                    <FlatList
                      data={nearbyTrendingSpots}
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

                <Text style={[styles.sectionTitle, styles.closestTitle]}>Closest to you</Text>
              </>
            )}
          </>
        }
        renderItem={({ item }) => (
          <FeedPostCard
            spot={item}
            reviews={reviewsBySpot.get(item.id) ?? EMPTY_REVIEWS}
            onPress={() => goToSpot(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, styles.feedEmptyText]}>
            {filtersActive
              ? 'No spots match those filters.'
              : feedMode === 'following'
                ? 'Follow people from Reels to see their spots here.'
                : 'Nothing in this category yet.'}
          </Text>
        }
      />

      <StoryViewerModal
        stories={viewingStories ?? []}
        visible={viewingStories != null}
        onClose={() => setViewingStories(null)}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    feedTabs: {
      flexDirection: 'row',
      gap: spacing.lg,
      paddingHorizontal: spacing.md,
      marginTop: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    feedTab: {
      alignItems: 'center',
      paddingBottom: spacing.sm,
    },
    feedTabText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
    },
    feedTabTextActive: {
      color: colors.primary,
    },
    feedTabUnderline: {
      marginTop: 6,
      height: 2,
      width: 20,
      borderRadius: 1,
      backgroundColor: 'transparent',
    },
    feedTabUnderlineActive: {
      backgroundColor: colors.primary,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 2,
    },
    locationText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginRight: 2,
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
    resultsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    resultsText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    clearFiltersText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    headline: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
      lineHeight: 30,
    },
    section: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    seeAll: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    closestTitle: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    feedEmptyText: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
    },
  });
