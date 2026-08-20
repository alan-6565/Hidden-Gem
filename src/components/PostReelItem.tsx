import React, { useEffect, useState } from 'react';
import { Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Post } from '../types';
import { useAppData } from '../context/DataContext';
import CommentsSheet from './CommentsSheet';
import { distanceMiles, formatDistance } from '../utils/geo';
import { colors, radius, spacing } from '../theme';

interface Props {
  post: Post;
  height: number;
  isActive: boolean;
  userCoords: { lat: number; lng: number };
  onOpenSpot: (spotId: string) => void;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${n}`;
}

export default function PostReelItem({ post, height, isActive, userCoords, onOpenSpot }: Props) {
  const { spots, isPostLiked, toggleLike, isPostSaved, toggleSavePost } = useAppData();
  const liked = isPostLiked(post.id);
  const saved = isPostSaved(post.id);
  const spot = spots.find((s) => s.id === post.spotId);
  const [showComments, setShowComments] = useState(false);

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
      </View>

      <View style={styles.bottomContent}>
        <View style={styles.authorRow}>
          <Image source={{ uri: post.authorAvatar }} style={styles.avatar} />
          <Text style={styles.authorName}>{post.authorName}</Text>
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
      </View>

      <CommentsSheet
        postId={post.id}
        visible={showComments}
        onClose={() => setShowComments(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
