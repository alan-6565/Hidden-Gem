import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Post } from '../types';
import { spacing } from '../theme';

const STORY_DURATION_MS = 5000;

interface Props {
  stories: Post[];
  visible: boolean;
  onClose: () => void;
}

function StoryVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.play();
  });
  return <VideoView style={StyleSheet.absoluteFill} player={player} contentFit="cover" nativeControls={false} />;
}

export default function StoryViewerModal({ stories, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setIndex(0);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION_MS,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (!finished) return;
      if (index < stories.length - 1) {
        setIndex((i) => i + 1);
      } else {
        onClose();
      }
    });
    return () => anim.stop();
  }, [visible, index, stories.length]);

  if (!visible || stories.length === 0) return null;
  const story = stories[index];

  const advance = (direction: 1 | -1) => {
    const next = index + direction;
    if (next < 0) return;
    if (next >= stories.length) {
      onClose();
      return;
    }
    setIndex(next);
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {story.isVideo ? <StoryVideo uri={story.mediaUrl} /> : <Image source={{ uri: story.mediaUrl }} style={StyleSheet.absoluteFill} />}
        <View style={styles.overlayTop} />

        <View style={[styles.progressRow, { top: insets.top + spacing.xs }]}>
          {stories.map((s, i) => (
            <View key={s.id} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < index
                        ? '100%'
                        : i === index
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={[styles.header, { top: insets.top + spacing.md }]}>
          <Image source={{ uri: story.authorAvatar }} style={styles.avatar} />
          <Text style={styles.authorName}>{story.authorName}</Text>
          <Pressable hitSlop={12} style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>

        {story.caption ? (
          <View style={[styles.captionBox, { bottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.caption}>{story.caption}</Text>
          </View>
        ) : null}

        <Pressable style={styles.tapLeft} onPress={() => advance(-1)} />
        <Pressable style={styles.tapRight} onPress={() => advance(1)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  progressRow: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  authorName: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  closeButton: {
    padding: 4,
  },
  captionBox: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
  },
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '30%',
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '70%',
  },
});
