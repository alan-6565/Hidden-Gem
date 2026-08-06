import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { pickMediaFromLibrary, uploadMedia } from '../lib/mediaUpload';
import { VibeTag } from '../types';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddReview'>;

const VIBE_OPTIONS: { key: VibeTag; label: string; emoji: string }[] = [
  { key: 'worth_the_hype', label: 'Worth the Hype', emoji: '🔥' },
  { key: 'hidden_gem', label: 'Hidden Gem', emoji: '💎' },
  { key: 'overpriced', label: 'Good, but overpriced', emoji: '💸' },
  { key: 'skip_it', label: 'Skip it', emoji: '🚫' },
];

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.starRow}>
      <Text style={styles.starLabel}>{label}</Text>
      <View style={styles.starIcons}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onChange(n)}>
            <Text style={[styles.star, n <= value && styles.starActive]}>★</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function AddReviewScreen({ route, navigation }: Props) {
  const { spotId } = route.params;
  const { spots, addReview } = useAppData();
  const { user } = useAuth();
  const spot = spots.find((s) => s.id === spotId);

  const [taste, setTaste] = useState(0);
  const [value, setValue] = useState(0);
  const [vibeRating, setVibeRating] = useState(0);
  const [vibeTag, setVibeTag] = useState<VibeTag | null>(null);
  const [text, setText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const overall = Math.round((taste + value + vibeRating) / 3) || 0;

  const handlePickPhoto = async () => {
    try {
      const media = await pickMediaFromLibrary({ allowVideos: false });
      if (media) setPhotoUri(media.uri);
    } catch (e: any) {
      Alert.alert('Couldn\'t open photos', e?.message ?? 'Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!taste || !value || !vibeRating || !vibeTag) {
      Alert.alert('Almost there', 'Rate taste, value, vibe, and pick a tag before posting.');
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      let photoUrl: string | undefined;
      if (photoUri) {
        photoUrl = await uploadMedia(user.id, {
          uri: photoUri,
          isVideo: false,
          fileExtension: photoUri.split('.').pop()?.toLowerCase() ?? 'jpg',
        });
      }
      await addReview({
        spotId,
        ratingTaste: taste,
        ratingValue: value,
        ratingVibe: vibeRating,
        vibeTag,
        text,
        photo: photoUrl,
      });
      Alert.alert('Posted!', 'Your review has been added.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Something went wrong', e?.message ?? 'Could not post your review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Review {spot?.name ?? 'this spot'}</Text>

      <StarPicker label="Taste" value={taste} onChange={setTaste} />
      <StarPicker label="Value" value={value} onChange={setValue} />
      <StarPicker label="Vibe" value={vibeRating} onChange={setVibeRating} />

      <Text style={styles.overallText}>Overall: {overall ? `${overall}★` : '—'}</Text>

      <Text style={styles.sectionLabel}>How would you tag it?</Text>
      <View style={styles.vibeGrid}>
        {VIBE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.vibeOption, vibeTag === opt.key && styles.vibeOptionActive]}
            onPress={() => setVibeTag(opt.key)}
          >
            <Text style={styles.vibeEmoji}>{opt.emoji}</Text>
            <Text
              style={[
                styles.vibeOptionLabel,
                vibeTag === opt.key && styles.vibeOptionLabelActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Tell people what to order</Text>
      <TextInput
        style={styles.textInput}
        placeholder="What should people know before they go?"
        placeholderTextColor={colors.textMuted}
        multiline
        value={text}
        onChangeText={setText}
      />

      <Text style={styles.sectionLabel}>Add a photo</Text>
      {photoUri ? (
        <View style={styles.photoPreviewWrapper}>
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          <Pressable style={styles.photoRemoveButton} onPress={() => setPhotoUri(null)}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.photoPickButton} onPress={handlePickPhoto}>
          <Ionicons name="camera-outline" size={20} color={colors.textMuted} />
          <Text style={styles.photoPickText}>Choose from library</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>{submitting ? 'Posting...' : 'Post Review'}</Text>
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
  starRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  starLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  starIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    fontSize: 24,
    color: colors.border,
  },
  starActive: {
    color: colors.gold,
  },
  overallText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
    marginVertical: spacing.sm,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  vibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  vibeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  vibeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vibeEmoji: {
    fontSize: 14,
  },
  vibeOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  vibeOptionLabelActive: {
    color: '#fff',
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    color: colors.text,
  },
  photoPickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  photoPickText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  photoPreviewWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
  },
  photoRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
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
