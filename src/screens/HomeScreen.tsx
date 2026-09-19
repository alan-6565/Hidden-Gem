import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useSearchFilters } from '../context/SearchFilterContext';
import { Post, SpotCategory } from '../types';
import CategoryIconButton from '../components/CategoryIconButton';
import SpotTrendingCard from '../components/SpotTrendingCard';
import SpotDropCard from '../components/SpotDropCard';
import SpotHeroCard from '../components/SpotHeroCard';
import FeedSpotCard from '../components/FeedSpotCard';
import StoriesRow from '../components/StoriesRow';
import StoryViewerModal from '../components/StoryViewerModal';
import { CURRENT_USER_DISPLAY } from '../constants';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../constants/categories';
import { colors, radius, spacing } from '../theme';
import { TabScreenProps } from '../navigation/types';
import { useUserLocation } from '../utils/useUserLocation';
import { isPromoted } from '../utils/promotion';
import { applySearchFilters, hasActiveFilters } from '../utils/searchFilters';

type Props = TabScreenProps<'Home'>;

type CategoryFilter = 'all' | SpotCategory;
type HomeTab = 'for_you' | 'following' | 'nearby';

const HOME_CATEGORIES: SpotCategory[] = ['coffee', 'matcha', 'dessert', 'home_based', 'food_truck'];
const HOME_CATEGORY_LABELS: Record<SpotCategory, string> = {
  ...CATEGORY_LABELS,
  coffee: 'Cafes',
  matcha: 'Matcha',
  dessert: 'Desserts',
  home_based: 'Home',
  food_truck: 'Trucks',
};

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { spots, reviews, posts, stories, savedSpotIds, followingIds } = useAppData();
  const { user } = useAuth();
  const { filters, resetFilters } = useSearchFilters();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [tab, setTab] = useState<HomeTab>('for_you');
  const [viewingStories, setViewingStories] = useState<Post[] | null>(null);
  const userLocation = useUserLocation();
  const locationLabel = userLocation.isRealLocation && userLocation.placeName
    ? userLocation.placeName
    : 'San Francisco';

  const CATEGORIES = useMemo(
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

  const followingSpots = useMemo(() => {
    const followedSpotIds = new Set(
      posts
        .filter((p) => p.userId && followingIds.includes(p.userId) && p.spotId)
        .map((p) => p.spotId as string),
    );
    return spots.filter((s) => followedSpotIds.has(s.id));
  }, [posts, followingIds, spots]);

  const filtersActive = hasActiveFilters(filters);
  const searchResults = useMemo(
    () =>
      filtersActive
        ? applySearchFilters(
            spots,
            filters,
            reviews,
            userLocation.isRealLocation ? userLocation.coords : null,
          )
        : [],
    [filtersActive, spots, filters, reviews, userLocation.isRealLocation, userLocation.coords],
  );

  const goToSpot = (spotId: string) => navigation.navigate('SpotProfile', { spotId });

  const renderStoryHeader = () => (
    <>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={[styles.logo, { color: colors.primary }]}>Kuppio</Text>
        <Ionicons name="notifications-outline" size={22} color={colors.text} />
      </View>
      <StoriesRow
        stories={stories}
        currentUserId={user?.id ?? null}
        currentUserAvatar={CURRENT_USER_DISPLAY.avatar}
        onAddStory={() => navigation.navigate('Compose', { isStory: true })}
        onOpenGroup={(group) => setViewingStories(group.stories)}
      />
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(['for_you', 'following', 'nearby'] as HomeTab[]).map((key) => (
          <Pressable key={key} style={styles.tabItem} onPress={() => setTab(key)}>
            <Text
              style={[
                styles.tabLabel,
                { color: colors.textMuted },
                tab === key && { color: colors.text },
              ]}
            >
              {key === 'for_you' ? 'For you' : key === 'following' ? 'Following' : 'Nearby'}
            </Text>
            {tab === key && <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />}
          </Pressable>
        ))}
      </View>
    </>
  );

  const renderNearbyIntro = () => (
    <>
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.locationText, { color: colors.textMuted }]}>{locationLabel}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </View>

      <Text style={[styles.headline, { color: colors.text }]}>
        What's good{'\n'}near you right now?
      </Text>

      <Pressable
        style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('SearchFilters')}
      >
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]} numberOfLines={1}>
          {filters.query.trim() || 'Search for cafes, foods, people...'}
        </Text>
        <Ionicons name="options-outline" size={18} color={colors.primary} />
      </Pressable>
    </>
  );

  if (tab === 'nearby' && filtersActive) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              {renderStoryHeader()}
              {renderNearbyIntro()}
              <View style={styles.resultsHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
                </Text>
                <Pressable onPress={resetFilters} hitSlop={8}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>Clear filters</Text>
                </Pressable>
              </View>
            </>
          }
          renderItem={({ item }) => <FeedSpotCard spot={item} onPress={() => goToSpot(item.id)} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                No spots match those filters.
              </Text>
            </View>
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

  if (tab === 'nearby') {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {renderStoryHeader()}
        {renderNearbyIntro()}

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
              color={item.color}
              active={activeCategory === item.key}
              onPress={() => setActiveCategory(item.key)}
            />
          )}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 Happening Today</Text>
            <Pressable onPress={() => navigation.navigate('Map')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          {happeningTodaySpots.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nothing happening yet.</Text>
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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>💎 Hidden Gems Near You</Text>
              <Pressable onPress={() => navigation.navigate('Map')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </Pressable>
            </View>
            <SpotHeroCard spot={hiddenGemSpot} onPress={() => goToSpot(hiddenGemSpot.id)} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending near you 🔥</Text>
          {trendingSpots.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nothing in this category yet.
            </Text>
          ) : (
            <FlatList
              data={trendingSpots}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <SpotTrendingCard spot={item} onPress={() => goToSpot(item.id)} />}
            />
          )}
        </View>

        {savedSpots.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Because you saved this place</Text>
            <FlatList
              data={savedSpots}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <SpotTrendingCard spot={item} onPress={() => goToSpot(item.id)} />}
            />
          </View>
        )}

        <StoryViewerModal
          stories={viewingStories ?? []}
          visible={viewingStories != null}
          onClose={() => setViewingStories(null)}
        />
      </ScrollView>
    );
  }

  const feedSpots = tab === 'for_you' ? sortedByTrending : followingSpots;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={feedSpots}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderStoryHeader}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => <FeedSpotCard spot={item} onPress={() => goToSpot(item.id)} />}
        ListEmptyComponent={
          tab === 'following' ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                Follow people from Reels to see their spots here.
              </Text>
            </View>
          ) : null
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    marginTop: spacing.xs,
  },
  tabItem: {
    marginRight: spacing.lg,
    paddingBottom: spacing.sm,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabUnderline: {
    height: 2,
    borderRadius: 1,
    marginTop: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 2,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    lineHeight: 30,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  searchPlaceholder: {
    flex: 1,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
