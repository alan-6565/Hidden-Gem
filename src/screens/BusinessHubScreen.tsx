import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

type Spot = ReturnType<typeof useAppData>['spots'][number];

// How much of a "filled out" business profile this spot has — used to give
// an owner something concrete to act on, not a vanity number.
function profileCompletion(spot: Spot): number {
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

// What's actually required before a first-time Publish — a subset of full
// profile completion. Phone/socials are nice-to-have, not blockers.
function missingPublishRequirements(spot: Spot): string[] {
  const missing: string[] = [];
  if (spot.photos.length === 0) missing.push('At least one photo');
  if (!spot.description || spot.description.trim().length === 0) missing.push('A description');
  if (spot.hours.length === 0) missing.push('Your hours');
  if (spot.menu.length === 0) missing.push('At least one menu item');
  return missing;
}

export default function BusinessHubScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { spotId } = route.params;
  const { spots, posts, reviews, updateSpot } = useAppData();
  const spot = spots.find((s) => s.id === spotId);
  const [followerCount, setFollowerCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const [publishing, setPublishing] = useState(false);

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
  const missing = missingPublishRequirements(spot);
  const canPublish = missing.length === 0;

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await updateSpot(spotId, { published: true });
    } catch (e: any) {
      Alert.alert("Couldn't publish", e?.message ?? 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handlePause = () => {
    Alert.alert(
      'Pause your page?',
      `${spot.name} will disappear from Discover, Map, and search until you publish it again. Existing reviews, orders, and content are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause page',
          style: 'destructive',
          onPress: async () => {
            setPublishing(true);
            try {
              await updateSpot(spotId, { published: false });
            } catch (e: any) {
              Alert.alert("Couldn't pause", e?.message ?? 'Please try again.');
            } finally {
              setPublishing(false);
            }
          },
        },
      ],
    );
  };

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
          <View style={styles.statusPillRow}>
            <View style={[styles.statusPill, spot.published ? styles.statusPillLive : styles.statusPillDraft]}>
              <Text style={[styles.statusPillText, spot.published ? styles.statusPillTextLive : styles.statusPillTextDraft]}>
                {spot.published ? 'Live' : 'Draft'}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('SpotProfile', { spotId })}>
            <Text style={styles.viewPublicLink}>
              {spot.published ? 'View public profile →' : 'Preview page (only you can see it) →'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.publishCard}>
        {spot.published ? (
          <>
            <View style={styles.publishRow}>
              <Ionicons name="globe-outline" size={18} color={colors.success} />
              <Text style={styles.publishText}>Your page is live and searchable on Discover and Map.</Text>
            </View>
            <Pressable style={styles.pauseButton} onPress={handlePause} disabled={publishing}>
              <Text style={styles.pauseButtonText}>{publishing ? 'Pausing…' : 'Pause page'}</Text>
            </Pressable>
          </>
        ) : canPublish ? (
          <>
            <View style={styles.publishRow}>
              <Ionicons name="eye-off-outline" size={18} color={colors.textMuted} />
              <Text style={styles.publishText}>
                Your page is a draft — only you can see it. Publish to make it searchable.
              </Text>
            </View>
            <Pressable style={styles.publishButton} onPress={handlePublish} disabled={publishing}>
              <Text style={styles.publishButtonText}>{publishing ? 'Publishing…' : 'Publish'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.publishRow}>
              <Ionicons name="eye-off-outline" size={18} color={colors.textMuted} />
              <Text style={styles.publishText}>
                Your page is a draft. Finish these before you can publish it:
              </Text>
            </View>
            {missing.map((item) => (
              <View key={item} style={styles.missingRow}>
                <Ionicons name="ellipse-outline" size={6} color={colors.textMuted} />
                <Text style={styles.missingText}>{item}</Text>
              </View>
            ))}
          </>
        )}
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
    statusPillRow: {
      flexDirection: 'row',
      marginTop: 4,
    },
    statusPill: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    statusPillLive: {
      backgroundColor: colors.successMuted,
    },
    statusPillDraft: {
      backgroundColor: colors.border,
    },
    statusPillText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    statusPillTextLive: {
      color: colors.success,
    },
    statusPillTextDraft: {
      color: colors.textMuted,
    },
    publishCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    publishRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    publishText: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    missingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginLeft: spacing.lg + 4,
    },
    missingText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    publishButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.sm + 2,
      alignItems: 'center',
    },
    publishButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
    pauseButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.sm + 2,
      alignItems: 'center',
    },
    pauseButtonText: {
      color: colors.textMuted,
      fontWeight: '700',
      fontSize: 14,
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
