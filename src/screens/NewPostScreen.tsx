import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { pickMediaFromLibrary, PickedMedia, uploadMedia } from '../lib/mediaUpload';
import { EXPLORE_TAGS } from '../components/ExploreReelsGrid';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NewPost'>;

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView style={styles.mediaPreview} player={player} contentFit="cover" nativeControls={false} />;
}

export default function NewPostScreen({ route, navigation }: Props) {
  const { spotId } = route.params;
  const { spots, addPost } = useAppData();
  const { user } = useAuth();
  const spot = spots.find((s) => s.id === spotId);

  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (key: string) => {
    setSelectedTags((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
    );
  };

  const handlePickMedia = async () => {
    try {
      const picked = await pickMediaFromLibrary({ allowVideos: true });
      if (picked) setMedia(picked);
    } catch (e: any) {
      Alert.alert("Couldn't open photos", e?.message ?? 'Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!media) {
      Alert.alert('Add a photo or video', 'Pick something to share before posting.');
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      const mediaUrl = await uploadMedia(user.id, media);
      await addPost({
        spotId,
        mediaUrl,
        isVideo: media.isVideo,
        caption,
        exploreTags: selectedTags,
      });
      Alert.alert('Posted!', 'Your reel has been shared.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Something went wrong', e?.message ?? 'Could not share your post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Share a reel {spot ? `for ${spot.name}` : ''}</Text>

      {media ? (
        <View style={styles.mediaPreviewWrapper}>
          {media.isVideo ? (
            <VideoPreview uri={media.uri} />
          ) : (
            <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
          )}
          <Pressable style={styles.mediaRemoveButton} onPress={() => setMedia(null)}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.mediaPickButton} onPress={handlePickMedia}>
          <Ionicons name="videocam-outline" size={26} color={colors.textMuted} />
          <Text style={styles.mediaPickText}>Choose a photo or video</Text>
        </Pressable>
      )}

      <Text style={styles.sectionLabel}>Caption</Text>
      <TextInput
        style={styles.textInput}
        placeholder="What's the vibe?"
        placeholderTextColor={colors.textMuted}
        multiline
        value={caption}
        onChangeText={setCaption}
      />

      <Text style={styles.sectionLabel}>Tag it (optional)</Text>
      <View style={styles.tagGrid}>
        {EXPLORE_TAGS.map((tag) => {
          const active = selectedTags.includes(tag.key);
          return (
            <Pressable
              key={tag.key}
              style={[styles.tagChip, active && styles.tagChipActive]}
              onPress={() => toggleTag(tag.key)}
            >
              <Ionicons name={tag.icon} size={14} color={active ? '#fff' : colors.textMuted} />
              <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>
                {tag.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>{submitting ? 'Posting...' : 'Share Reel'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  mediaPickButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
  },
  mediaPickText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  mediaPreviewWrapper: {
    position: 'relative',
    alignSelf: 'center',
  },
  mediaPreview: {
    width: 220,
    height: 320,
    borderRadius: radius.md,
    backgroundColor: colors.dark,
  },
  mediaRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 70,
    textAlignVertical: 'top',
    color: colors.text,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tagChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tagChipTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
