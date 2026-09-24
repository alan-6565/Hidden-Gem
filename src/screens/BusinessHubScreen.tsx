import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAppData } from '../context/DataContext';
import { fetchSpotFollowerCount, fetchSpotSaveCount } from '../lib/api';
import { getDisplayRating, getReviewCount } from '../utils/rating';
import Avatar from '../components/Avatar';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessHub'>;

// How much of a "filled out" business profile this spot has — used to give
// an owner something concrete to act on, not a vanity number.
function profileCompletion(spot: ReturnType<typeof useAppData>['spots'][number]): number {
  const checks = [
    spot.photos.length > 0,
    !!spot.description && spot.description.trim().length > 0,
    spot.hours.length > 0,
    spot.menu.length > 0,
    !!spot.phone,
    !!spot.instagramUrl || !!spot.tiktokUrl,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function BusinessHubScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { spotId } = route.params;
  const { spots, posts, reviews } = useAppData();
  const spot = spots.find((s) => s.id === spotId);
  const [followerCount, setFollowerCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchSpotFollowerCount(spotId).then(setFollowerCount).catch(() => {});
      fetchSpotSaveCount(spotId).then(setSaveCount).catch(() => {});
    }, [spotId]),
  );

  const ownPosts = useMemo(
    () => posts.filter((p) => p.spotId === spotId && p.authorType === 'owner'),
    [posts, spotId],
  );
  const spotReviews = useMemo(() => reviews.filter((r) => r.spotId === spotId), [reviews, spotId]);

  if (!spot) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFoundText}>Business not found.</Text>
      </View>
    );
  }

  const rating = getDisplayRating(spot, reviews);
  const reviewCount = getReviewCount(spot, reviews);
  const completion = profileCompletion(spot);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar uri={spot.photos[0]} name={spot.name} size={64} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {spot.name}
            </Text>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          </View>
          <Pressable onPress={() => navigation.navigate('SpotProfile', { spotId })}>
            <Text style={styles.viewPublicLink}>View public profile →</Text>
          </Pressable>
        </View>
      </View>

      {completion < 100 && (
        <View style={styles.completionCard}>
          <View style={styles.completionHeaderRow}>
            <Text style={styles.completionTitle}>Profile completion</Text>
            <Text style={styles.completionPercent}>{completion}%</Text>
          </View>
          <View style={styles.completionTrack}>
            <View style={[styles.completionFill, { width: `${completion}%` }]} />
          </View>
          <Text style={styles.completionHint}>
            {!spot.photos.length
              ? 'Add photos to help people recognize your spot.'
              : !spot.description
                ? 'Add a description of what makes your spot worth visiting.'
                : !spot.hours.length
                  ? 'Add your hours so people know when you\'re open.'
                  : !spot.menu.length
                    ? 'Add menu items so people know what to order.'
                    : !spot.phone
                      ? 'Add a phone number for the Call button.'
                      : 'Add Instagram or TikTok to link your socials.'}
          </Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{followerCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{saveCount}</Text>
          <Text style={styles.statLabel}>Saves</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{reviewCount === 0 ? '–' : rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{spotReviews.length}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>MANAGE</Text>
      <View style={styles.card}>
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('Compose', { spotId })}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.text} />
          <Text style={styles.rowText}>Create post or Reel</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.row} onPress={() => navigation.navigate('BusinessEdit', { spotId })}>
          <Ionicons name="create-outline" size={20} color={colors.text} />
          <Text style={styles.rowText}>Edit business</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('Orders', { mode: 'business' })}
        >
          <Ionicons name="bag-handle-outline" size={20} color={colors.text} />
          <Text style={styles.rowText}>Orders</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.contentHeaderRow}>
        <Text style={styles.sectionLabel}>CONTENT</Text>
        {ownPosts.length > 0 && (
          <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Reels' })}>
            <Text style={styles.seeAllLink}>See all</Text>
          </Pressable>
        )}
      </View>
      {ownPosts.length === 0 ? (
        <Pressable
          style={styles.emptyContentCard}
          onPress={() => navigation.navigate('Compose', { spotId })}
        >
          <Ionicons name="videocam-outline" size={22} color={colors.textMuted} />
          <Text style={styles.emptyContentText}>
            You haven't posted as {spot.name} yet. Tap to create your first post or Reel.
          </Text>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {ownPosts.slice(0, 10).map((post) => (
            <Pressable
              key={post.id}
              style={styles.contentTile}
              onPress={() => navigation.navigate('Tabs', { screen: 'Reels' })}
            >
              {post.isVideo ? (
                <View style={[styles.contentTile, styles.videoPlaceholder]}>
                  <Ionicons name="play" size={20} color="#fff" />
                </View>
              ) : (
                <Image source={{ uri: post.mediaUrl }} style={styles.contentTile} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    notFoundText: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    headerText: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    name: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.text,
      flexShrink: 1,
    },
    viewPublicLink: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
      marginTop: 2,
    },
    completionCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    completionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    completionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    completionPercent: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
    },
    completionTrack: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    completionFill: {
      height: 6,
      backgroundColor: colors.primary,
    },
    completionHint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
      marginLeft: spacing.xs,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
    },
    rowText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: spacing.md + 20 + spacing.sm,
    },
    contentHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    seeAllLink: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      marginRight: spacing.xs,
    },
    emptyContentCard: {
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.lg,
    },
    emptyContentText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
    contentTile: {
      width: 100,
      height: 100,
      borderRadius: radius.sm,
      marginRight: spacing.sm,
      backgroundColor: colors.cream,
    },
    videoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dark,
    },
  });
