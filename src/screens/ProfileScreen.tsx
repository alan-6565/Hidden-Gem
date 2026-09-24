import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { fetchFollowerCount } from '../lib/api';
import Avatar from '../components/Avatar';
import SwitchProfileSheet from '../components/SwitchProfileSheet';
import RatingStars from '../components/RatingStars';
import { formatDate } from '../utils/date';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { TabScreenProps } from '../navigation/types';
import { Post, Review } from '../types';

type Props = TabScreenProps<'Profile'>;
type ProfileTab = 'posts' | 'reels' | 'reviews';

const GRID_GAP = 2;

export default function ProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { posts, reviews, spots, followingIds, profile } = useAppData();
  const { user } = useAuth();
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [followerCount, setFollowerCount] = useState(0);
  const [switcherVisible, setSwitcherVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      fetchFollowerCount(user.id).then(setFollowerCount).catch(() => {});
    }, [user]),
  );

  const displayName = profile?.username ?? 'you';

  const myPosts = useMemo(
    () => posts.filter((p) => p.userId === user?.id && !p.isVideo),
    [posts, user],
  );
  const myReels = useMemo(
    () => posts.filter((p) => p.userId === user?.id && p.isVideo),
    [posts, user],
  );
  const myReviews = useMemo(
    () => reviews.filter((r) => r.userId === user?.id),
    [reviews, user],
  );

  const postCount = myPosts.length + myReels.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.headerRow}>
        <Pressable hitSlop={8} onPress={() => navigation.navigate('Saved')}>
          <Ionicons name="bookmark-outline" size={22} color={colors.text} />
        </Pressable>
        <Pressable style={styles.handleButton} onPress={() => setSwitcherVisible(true)}>
          <Text style={styles.handle}>@{displayName}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.text} />
        </Pressable>
        <Pressable hitSlop={8} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <SwitchProfileSheet visible={switcherVisible} onClose={() => setSwitcherVisible(false)} />

      <FlatList<Post | Review>
        data={tab === 'posts' ? myPosts : tab === 'reels' ? myReels : myReviews}
        keyExtractor={(item) => item.id}
        numColumns={tab === 'reviews' ? 1 : 3}
        key={tab}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={tab !== 'reviews' ? styles.gridRow : undefined}
        ListHeaderComponent={
          <>
            <View style={styles.identityBlock}>
              <Avatar uri={profile?.avatarUrl} name={displayName} size={88} />
              <Text style={styles.name}>{displayName}</Text>
              {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
              {!!profile?.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.locationText}>{profile.location}</Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{postCount}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{followerCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{followingIds.length}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>

            <Pressable style={styles.editButton} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.editButtonText}>Edit profile</Text>
            </Pressable>

            <View style={styles.tabsRow}>
              {(['posts', 'reels', 'reviews'] as ProfileTab[]).map((key) => (
                <Pressable key={key} style={styles.tab} onPress={() => setTab(key)}>
                  <Ionicons
                    name={key === 'posts' ? 'grid-outline' : key === 'reels' ? 'play-circle-outline' : 'star-outline'}
                    size={20}
                    color={tab === key ? colors.primary : colors.textMuted}
                  />
                  {tab === key && <View style={styles.tabUnderline} />}
                </Pressable>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {tab === 'posts'
                ? "You haven't posted anything yet."
                : tab === 'reels'
                  ? "You haven't shared a reel yet."
                  : "You haven't written a review yet."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          if (tab === 'reviews') {
            const review = item as (typeof myReviews)[number];
            const spot = spots.find((s) => s.id === review.spotId);
            return (
              <Pressable
                style={styles.reviewCard}
                onPress={() => spot && navigation.navigate('SpotProfile', { spotId: spot.id })}
              >
                <Text style={styles.reviewSpotName} numberOfLines={1}>
                  {spot?.name ?? 'Spot'}
                </Text>
                <RatingStars rating={review.ratingOverall} size={13} />
                <Text style={styles.reviewText} numberOfLines={3}>
                  {review.text}
                </Text>
                <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
              </Pressable>
            );
          }
          const post = item as (typeof myPosts)[number];
          return (
            <Pressable
              style={styles.gridTile}
              onPress={() => navigation.navigate('Tabs', { screen: 'Reels' })}
            >
              {post.isVideo ? (
                <View style={[styles.gridTile, styles.videoPlaceholder]}>
                  <Ionicons name="play" size={22} color="#fff" />
                </View>
              ) : (
                <Image source={{ uri: post.mediaUrl }} style={styles.gridTile} />
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    handleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    handle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    listContent: {
      paddingBottom: spacing.xl,
    },
    identityBlock: {
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      marginTop: spacing.sm,
    },
    name: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginTop: spacing.sm,
    },
    bio: {
      fontSize: 13,
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.xs,
      lineHeight: 18,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: spacing.xs,
    },
    locationText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xl,
      marginTop: spacing.lg,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    editButton: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.sm + 2,
      alignItems: 'center',
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    tabsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
    },
    tabUnderline: {
      height: 2,
      width: 28,
      borderRadius: 1,
      backgroundColor: colors.primary,
      marginTop: spacing.xs,
    },
    gridRow: {
      gap: GRID_GAP,
      paddingHorizontal: GRID_GAP,
    },
    gridTile: {
      flex: 1 / 3,
      aspectRatio: 1,
      marginBottom: GRID_GAP,
      backgroundColor: colors.cream,
    },
    videoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dark,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.xl,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
    reviewCard: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    reviewSpotName: {
      fontWeight: '700',
      color: colors.text,
      fontSize: 14,
      marginBottom: 4,
    },
    reviewText: {
      fontSize: 13,
      color: colors.text,
      marginTop: spacing.xs,
    },
    reviewDate: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
  });
