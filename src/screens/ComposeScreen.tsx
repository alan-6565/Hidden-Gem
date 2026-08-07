import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { PickedMedia, uploadMedia } from '../lib/mediaUpload';
import CameraCapture from '../components/CameraCapture';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Compose'>;

function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#(\w+)/g) ?? [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView style={styles.media} player={player} contentFit="cover" nativeControls={false} />;
}

export default function ComposeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { spots, addPost } = useAppData();
  const { user } = useAuth();

  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [taggedSpotId, setTaggedSpotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mentionQuery = useMemo(() => {
    const lastAt = caption.lastIndexOf('@');
    if (lastAt === -1) return null;
    const after = caption.slice(lastAt + 1);
    if (after.includes('\n') || after.length > 30) return null;
    return after;
  }, [caption]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.trim().toLowerCase();
    return spots
      .filter((s) => query.length === 0 || s.name.toLowerCase().includes(query))
      .slice(0, 5);
  }, [mentionQuery, spots]);

  const taggedSpot = spots.find((s) => s.id === taggedSpotId) ?? null;

  const handleSelectMention = (spotId: string, spotName: string) => {
    const lastAt = caption.lastIndexOf('@');
    const before = lastAt === -1 ? caption : caption.slice(0, lastAt);
    setCaption(`${before}@${spotName} `);
    setTaggedSpotId(spotId);
  };

  const handleSubmit = async () => {
    if (!media || !user) return;
    setSubmitting(true);
    try {
      const mediaUrl = await uploadMedia(user.id, media);
      await addPost({
        spotId: taggedSpotId,
        mediaUrl,
        isVideo: media.isVideo,
        caption,
        exploreTags: extractHashtags(caption),
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Something went wrong', e?.message ?? 'Could not share your post.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!media) {
    return <CameraCapture onCaptured={setMedia} onClose={() => navigation.goBack()} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.editContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.mediaWrapper}>
        {media.isVideo ? <VideoPreview uri={media.uri} /> : <Image source={{ uri: media.uri }} style={styles.media} />}
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
          <Pressable style={styles.topBarButton} onPress={() => setMedia(null)}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Pressable
            style={[styles.postButton, submitting && styles.postButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.postButtonText}>{submitting ? 'Posting…' : 'Share'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + spacing.sm }]}>
        {taggedSpot && (
          <View style={styles.locationPill}>
            <Ionicons name="location" size={13} color={colors.primary} />
            <Text style={styles.locationPillText}>{taggedSpot.name}</Text>
            <Pressable hitSlop={8} onPress={() => setTaggedSpotId(null)}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        )}

        {mentionQuery !== null && mentionSuggestions.length > 0 && (
          <View style={styles.suggestionBox}>
            {mentionSuggestions.map((s) => (
              <Pressable
                key={s.id}
                style={styles.suggestionRow}
                onPress={() => handleSelectMention(s.id, s.name)}
              >
                <Image source={{ uri: s.photos[0] }} style={styles.suggestionThumb} />
                <Text style={styles.suggestionText}>{s.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <TextInput
          style={styles.captionInput}
          placeholder="Write a caption... use @ to tag a spot, # for tags"
          placeholderTextColor={colors.textMuted}
          multiline
          value={caption}
          onChangeText={setCaption}
          autoFocus
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  editContainer: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  mediaWrapper: {
    flex: 1,
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  topBarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  bottomSheet: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.xs,
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  suggestionBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cream,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  captionInput: {
    minHeight: 44,
    maxHeight: 90,
    color: colors.text,
    fontSize: 14,
  },
});
