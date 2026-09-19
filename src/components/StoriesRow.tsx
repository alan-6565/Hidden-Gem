import React, { useMemo } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import { colors, spacing } from '../theme';

interface StoryGroup {
  userId: string;
  authorName: string;
  authorAvatar: string;
  stories: Post[];
}

interface Props {
  stories: Post[];
  currentUserId: string | null;
  currentUserAvatar: string;
  onAddStory: () => void;
  onOpenGroup: (group: StoryGroup) => void;
}

export default function StoriesRow({ stories, currentUserId, currentUserAvatar, onAddStory, onOpenGroup }: Props) {
  const groups = useMemo<StoryGroup[]>(() => {
    const byUser = new Map<string, StoryGroup>();
    for (const story of stories) {
      if (!story.userId || story.userId === currentUserId) continue;
      const existing = byUser.get(story.userId);
      if (existing) {
        existing.stories.push(story);
      } else {
        byUser.set(story.userId, {
          userId: story.userId,
          authorName: story.authorName,
          authorAvatar: story.authorAvatar,
          stories: [story],
        });
      }
    }
    return [...byUser.values()];
  }, [stories, currentUserId]);

  return (
    <FlatList
      data={groups}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.userId}
      contentContainerStyle={styles.row}
      ListHeaderComponent={
        <Pressable style={styles.item} onPress={onAddStory}>
          <View style={[styles.ring, { borderColor: colors.border }]}>
            <Image source={{ uri: currentUserAvatar }} style={styles.avatar} />
            <View style={[styles.addBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Ionicons name="add" size={12} color="#fff" />
            </View>
          </View>
          <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
            Your story
          </Text>
        </Pressable>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.item} onPress={() => onOpenGroup(item)}>
          <View style={[styles.ring, styles.ringActive, { borderColor: colors.primary }]}>
            <Image source={{ uri: item.authorAvatar }} style={styles.avatar} />
          </View>
          <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
            {item.authorName}
          </Text>
        </Pressable>
      )}
    />
  );
}

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  item: {
    alignItems: 'center',
    width: AVATAR_SIZE + 12,
    marginRight: spacing.sm,
  },
  ring: {
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringActive: {
    borderWidth: 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  addBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
