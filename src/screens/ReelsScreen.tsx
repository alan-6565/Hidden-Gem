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
import { posts } from '../data/posts';
import PostReelItem from '../components/PostReelItem';
import ExploreReelsGrid from '../components/ExploreReelsGrid';
import { colors, spacing } from '../theme';
import { TabScreenProps } from '../navigation/types';

type Props = TabScreenProps<'Reels'>;

type Mode = 'for_you' | 'following' | 'explore';

export default function ReelsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [containerHeight, setContainerHeight] = useState(0);
  const [mode, setMode] = useState<Mode>('for_you');
  const [exploreTag, setExploreTag] = useState<string | null>(route.params?.exploreTag ?? null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onContainerLayout = (e: LayoutChangeEvent) => {
    setContainerHeight(e.nativeEvent.layout.height);
  };

  const feedPosts = useMemo(() => {
    if (!exploreTag) return posts;
    return posts.filter((p) => p.exploreTags.includes(exploreTag));
  }, [exploreTag]);

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const goToSpot = (spotId: string) => navigation.navigate('SpotProfile', { spotId });

  const isDarkBackground = mode === 'for_you';

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View
        style={[
          styles.topTabs,
          { top: insets.top + spacing.sm },
          !isDarkBackground && [
            styles.topTabsLight,
            { top: 0, paddingTop: insets.top + spacing.sm },
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
              !isDarkBackground && styles.topTabTextDark,
              mode === 'for_you' && (isDarkBackground ? styles.topTabTextActive : styles.topTabTextActiveDark),
            ]}
          >
            For you
          </Text>
        </Pressable>
        <Pressable onPress={() => setMode('following')}>
          <Text
            style={[
              styles.topTabText,
              !isDarkBackground && styles.topTabTextDark,
              mode === 'following' && (isDarkBackground ? styles.topTabTextActive : styles.topTabTextActiveDark),
            ]}
          >
            Following
          </Text>
        </Pressable>
        <Pressable onPress={() => setMode('explore')}>
          <Text
            style={[
              styles.topTabText,
              !isDarkBackground && styles.topTabTextDark,
              mode === 'explore' && (isDarkBackground ? styles.topTabTextActive : styles.topTabTextActiveDark),
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
      ) : mode === 'following' ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Follow spots and creators to see their posts here.
          </Text>
        </View>
      ) : containerHeight > 0 ? (
        <FlatList
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
              onOpenSpot={goToSpot}
            />
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
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
    backgroundColor: colors.background,
  },
  topTabText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    fontSize: 14,
  },
  topTabTextActive: {
    color: '#fff',
  },
  topTabTextDark: {
    color: colors.textMuted,
  },
  topTabTextActiveDark: {
    color: colors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
