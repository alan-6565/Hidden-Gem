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
import StoriesRow from '../components/StoriesRow';
import StoryViewerModal from '../components/StoryViewerModal';
import { CATEGORY_LABELS } from '../constants/categories';
import { CURRENT_USER_DISPLAY } from '../constants';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { TabScreenProps } from '../navigation/types';
import { useUserLocation } from '../utils/useUserLocation';
import { isPromoted } from '../utils/promotion';
import { distanceMiles } from '../utils/geo';

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
  const { spots, posts, stories, reviews, followingIds } = useAppData();
  const { user } = useAuth();
  const { filters } = useSearchFilters();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [feedMode, setFeedMode] = useState<FeedMode>('for_you');
  const [viewingStories, setViewingStories] = useState<Post[] | null>(null);
  const userLocation = useUserLocation();
  const locationLabel = userLocation.isRealLocation && userLocation.placeName
    ? userLocation.placeName
    : 'San Francisco';

  const sortedByTrending = useMemo(() => {
    if (feedMode === 'nearby') {
      const distanceById = new Map(
        spots.map((s) => [s.id, distanceMiles(userLocation.coords, { lat: s.lat, lng: s.lng })]),
      );
      return [...spots].sort((a, b) => distanceById.get(a.id)! - distanceById.get(b.id)!);
    }
    return [...spots].sort((a, b) => {
      const promoDiff = Number(isPromoted(b)) - Number(isPromoted(a));
      if (promoDiff !== 0) return promoDiff;
      return b.teaScore - a.teaScore;
    });
  }, [spots, feedMode, userLocation.coords]);

  const followingSpots = useMemo(() => {
    const followedSpotIds = new Set(
      posts
        .filter((p) => p.userId && followingIds.includes(p.userId) && p.spotId)
        .map((p) => p.spotId as string),
    );
    return spots.filter((s) => followedSpotIds.has(s.id));
  }, [posts, followingIds, spots]);

  const baseSpots = feedMode === 'following' ? followingSpots : sortedByTrending;

  const trendingSpots = useMemo(() => {
    if (activeCategory === 'all') return baseSpots;
    return baseSpots.filter((s) => s.category === activeCategory);
  }, [baseSpots, activeCategory]);

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
                <FilterChip
                  label={item.label}
                  active={activeCategory === item.key}
                  onPress={() => setActiveCategory(item.key)}
                />
              )}
            />

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
            {feedMode === 'following'
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
    feedEmptyText: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
    },
  });
