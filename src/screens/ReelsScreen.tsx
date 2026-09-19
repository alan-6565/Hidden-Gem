import React, { useMemo, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import PostReelItem from '../components/PostReelItem';
import ExploreReelsGrid from '../components/ExploreReelsGrid';
import { spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { TabScreenProps } from '../navigation/types';
import { useUserLocation } from '../utils/useUserLocation';

type Props = TabScreenProps<'Reels'>;

type Mode = 'for_you' | 'following' | 'explore';

export default function ReelsScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { posts, followingIds } = useAppData();
  const userLocation = useUserLocation();
  const [containerHeight, setContainerHeight] = useState(0);
  const [mode, setMode] = useState<Mode>('for_you');
  const [exploreTag, setExploreTag] = useState<string | null>(route.params?.exploreTag ?? null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onContainerLayout = (e: LayoutChangeEvent) => {
    setContainerHeight(e.nativeEvent.layout.height);
  };

  // Stories share the posts table but expire after 24h — they belong in the
  // Stories row, not the permanent Reels feed.
  const feedPosts = useMemo(() => {
    let result = posts.filter((p) => !p.isStory);
    if (mode === 'following') {
      result = result.filter((p) => p.userId && followingIds.includes(p.userId));
    }
    if (exploreTag) {
      result = result.filter((p) => p.exploreTags.includes(exploreTag));
    }
    return result;
  }, [posts, mode, followingIds, exploreTag]);

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const goToSpot = (spotId: string) => navigation.navigate('SpotProfile', { spotId });
  const goToAddReview = (spotId: string) => navigation.navigate('AddReview', { spotId });

  // Dark chrome only while a video/photo feed is actually on screen; the
  // Explore grid and empty states are light, so they need the light tab bar.
  const isDarkBackground = mode !== 'explore' && feedPosts.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.dark }]} onLayout={onContainerLayout}>
      {isDarkBackground && (
        <View style={[styles.titleRow, { top: insets.top + spacing.xs }]}>
          <Text style={styles.titleText}>Reels</Text>
          <Pressable
            style={styles.cameraButton}
            onPress={() => navigation.navigate('Compose')}
            hitSlop={8}
          >
            <Ionicons name="camera-outline" size={22} color="#fff" />
          </Pressable>
        </View>
      )}
      <View
        style={[
          styles.topTabs,
          { top: insets.top + spacing.sm + (isDarkBackground ? 34 : 0) },
          !isDarkBackground && [
            styles.topTabsLight,
            { top: 0, paddingTop: insets.top + spacing.sm, backgroundColor: colors.background },
          ],
        ]}
      >
        <Pressable
          onPress={() => {
            setMode('for_you');
            setExploreTag(null);
          }}
        >
          <Text
            style={[
              styles.topTabText,
              !isDarkBackground && { color: colors.textMuted },
              mode === 'for_you' && { color: isDarkBackground ? '#fff' : colors.primary },
            ]}
          >
            For you
          </Text>
        </Pressable>
        <Pressable onPress={() => setMode('following')}>
          <Text
            style={[
              styles.topTabText,
              !isDarkBackground && { color: colors.textMuted },
              mode === 'following' && { color: isDarkBackground ? '#fff' : colors.primary },
            ]}
          >
            Following
          </Text>
        </Pressable>
        <Pressable onPress={() => setMode('explore')}>
          <Text
            style={[
              styles.topTabText,
              !isDarkBackground && { color: colors.textMuted },
              mode === 'explore' && { color: isDarkBackground ? '#fff' : colors.primary },
            ]}
          >
            Explore
          </Text>
        </Pressable>
      </View>

      {mode === 'explore' ? (
        <ExploreReelsGrid
          onSelectTag={(tag) => {
            setExploreTag(tag);
            setMode('for_you');
          }}
        />
      ) : feedPosts.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
          <Ionicons name="people-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {mode === 'following'
              ? 'Follow people from posts to see them here.'
              : 'No reels here yet.'}
          </Text>
        </View>
      ) : containerHeight > 0 ? (
        <FlatList
          key={`${mode}:${exploreTag ?? ''}`}
          data={feedPosts}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={containerHeight}
          getItemLayout={(_, index) => ({
            length: containerHeight,
            offset: containerHeight * index,
            index,
          })}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item, index }) => (
            <PostReelItem
              post={item}
              height={containerHeight}
              isActive={index === activeIndex}
              userCoords={userLocation.coords}
              onOpenSpot={goToSpot}
              onAddReview={goToAddReview}
            />
          )}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  titleRow: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 11,
  },
  titleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  cameraButton: {
    padding: 4,
  },
  topTabs: {
    position: 'absolute',
    top: spacing.xl + spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    zIndex: 10,
  },
  topTabsLight: {
    position: 'relative',
    top: 0,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topTabText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
