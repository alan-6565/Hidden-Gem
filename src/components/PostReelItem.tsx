import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Post } from '../types';
import Avatar from './Avatar';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import CommentsSheet from './CommentsSheet';
import ReportMenuButton from './ReportMenuButton';
import { distanceMiles, formatDistance } from '../utils/geo';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface Props {
  post: Post;
  height: number;
  isActive: boolean;
  userCoords: { lat: number; lng: number };
  onOpenSpot: (spotId: string) => void;
  onAddReview: (spotId: string) => void;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${n}`;
}

export default function PostReelItem({ post, height, isActive, userCoords, onOpenSpot, onAddReview }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { spots, isPostLiked, toggleLike, isPostSaved, toggleSavePost, isFollowing, toggleFollow, deletePost } =
    useAppData();
  const { user } = useAuth();
  const liked = isPostLiked(post.id);
  const saved = isPostSaved(post.id);
  const spot = spots.find((s) => s.id === post.spotId);
  const [showComments, setShowComments] = useState(false);
  const following = post.userId ? isFollowing(post.userId) : false;
  const isOwnPost = !!post.userId && post.userId === user?.id;
  const popularMenuItem = spot?.menu.find((m) => m.isPopular) ?? spot?.menu[0];

  const handlePlanVisit = () => {
    if (!spot) return;
    const url = `https://maps.apple.com/?daddr=${spot.lat},${spot.lng}&dirflg=d`;
    Linking.openURL(url).catch(() => {});
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.caption ? `${post.caption}\n\n` : ''}Check out ${post.authorName} on Kuppio!`,
      });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  };

  const player = useVideoPlayer(post.isVideo ? post.mediaUrl : null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (!post.isVideo) return;
    if (isActive && !showComments) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, showComments, player, post.isVideo]);

  return (
    <View style={[styles.container, { height }]}>
      {post.isVideo ? (
        <VideoView
          style={styles.media}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <Image source={{ uri: post.mediaUrl }} style={styles.media} />
      )}

      <View style={styles.overlayTop} />
      <View style={styles.overlayBottom} />

      {post.authorType === 'owner' && (
        <View style={styles.ownerBadge}>
          <Ionicons name="storefront" size={12} color="#fff" />
          <Text style={styles.ownerBadgeText}>Owner</Text>
        </View>
      )}

      <View style={styles.actionRail}>
        <Pressable style={styles.actionButton} onPress={() => toggleLike(post.id)}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={30}
            color={liked ? colors.primary : '#fff'}
          />
          <Text style={styles.actionCount}>{formatCount(post.likeCount)}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble-outline" size={27} color="#fff" />
          <Text style={styles.actionCount}>{formatCount(post.commentCount)}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="arrow-redo-outline" size={28} color="#fff" />
          <Text style={styles.actionCount}>{formatCount(post.shareCount)}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => toggleSavePost(post.id)}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={saved ? colors.primary : '#fff'}
          />
        </Pressable>
        <ReportMenuButton
          targetType="post"
          targetId={post.id}
          authorUserId={post.userId}
          authorName={post.authorName}
          color="#fff"
          size={22}
          onDelete={isOwnPost ? () => deletePost(post.id) : undefined}
        />
      </View>

      <View style={styles.bottomContent}>
        <View style={styles.authorRow}>
          <Avatar uri={post.authorAvatar} name={post.authorName} size={32} style={styles.avatar} />
          <Text style={styles.authorName}>{post.authorName}</Text>
          {!isOwnPost && post.userId && (
            <Pressable
              style={[styles.followButton, following && styles.followButtonActive]}
              onPress={() => toggleFollow(post.userId as string)}
            >
              <Text style={styles.followButtonText}>{following ? 'Following' : 'Follow'}</Text>
            </Pressable>
          )}
        </View>

        {spot && (
          <Pressable style={styles.locationBadge} onPress={() => onOpenSpot(spot.id)}>
            <Ionicons name="location" size={12} color="#fff" />
            <Text style={styles.locationText}>
              {spot.name} · {formatDistance(distanceMiles(userCoords, { lat: spot.lat, lng: spot.lng }))}
              {spot.isHomeBased ? ' · Home-based' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#fff" />
          </Pressable>
        )}

        <Text style={styles.caption}>{post.caption}</Text>

        {post.soundLabel && (
          <View style={styles.soundRow}>
            <Ionicons name="musical-notes" size={12} color="#fff" />
            <Text style={styles.soundText}>{post.soundLabel}</Text>
          </View>
        )}

        {popularMenuItem && (
          <View style={styles.menuItemCard}>
            <Text style={styles.menuItemText} numberOfLines={1}>
              ☕ {popularMenuItem.name}
            </Text>
            <Text style={styles.menuItemPrice}>${popularMenuItem.price.toFixed(2)}</Text>
          </View>
        )}

        {spot && (
          <Pressable style={styles.hypeBar} onPress={() => onAddReview(spot.id)}>
            <Text style={styles.hypeBarText}>Worth the hype?</Text>
          </Pressable>
        )}

        {spot && (
          <View style={styles.ctaRow}>
            <Pressable style={styles.saveButton} onPress={() => toggleSavePost(post.id)}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color="#fff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
            <Pressable style={styles.planButton} onPress={handlePlanVisit}>
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.planButtonText}>Plan a visit</Text>
            </Pressable>
          </View>
        )}
      </View>

      <CommentsSheet
        postId={post.id}
        visible={showComments}
        onClose={() => setShowComments(false)}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.dark,
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: colors.overlay,
    opacity: 0.4,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: colors.dark,
    opacity: 0.55,
  },
  ownerBadge: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  ownerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  actionRail: {
    position: 'absolute',
    right: spacing.sm,
    bottom: 120,
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButton: {
    alignItems: 'center',
    gap: 2,
  },
  actionCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomContent: {
    position: 'absolute',
    left: spacing.md,
    right: 80,
    bottom: spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
  },
  authorName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  followButton: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  followButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  menuItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  menuItemPrice: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  hypeBar: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: radius.pill,
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  hypeBarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 2,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  planButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 2,
  },
  planButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  locationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  caption: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  soundText: {
    color: '#fff',
    fontSize: 11,
  },
});
