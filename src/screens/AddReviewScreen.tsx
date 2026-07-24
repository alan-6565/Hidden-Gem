import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { spots } from '../data/spots';
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
  const spot = spots.find((s) => s.id === spotId);

  const [taste, setTaste] = useState(0);
  const [value, setValue] = useState(0);
  const [vibeRating, setVibeRating] = useState(0);
  const [vibeTag, setVibeTag] = useState<VibeTag | null>(null);
  const [text, setText] = useState('');

  const overall = Math.round((taste + value + vibeRating) / 3) || 0;

  const handleSubmit = () => {
    if (!taste || !value || !vibeRating || !vibeTag) {
      Alert.alert('Almost there', 'Rate taste, value, vibe, and pick a tag before posting.');
      return;
    }
    // v1: reviews are mock data only, no backend yet.
    Alert.alert('Posted!', 'Your review has been added.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
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

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Post Review</Text>
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
    backgroundColor: colors.matcha,
    borderColor: colors.matcha,
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
  submitButton: {
    backgroundColor: colors.matcha,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
