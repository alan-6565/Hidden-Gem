import React, { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/DataContext';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePost'>;

type PostKind = 'reel' | 'review';

export default function CreatePostScreen({ navigation }: Props) {
  const { spots } = useAppData();
  const [kind, setKind] = useState<PostKind>('reel');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What are you posting?</Text>

      <View style={styles.kindToggle}>
        <Pressable
          style={[styles.kindOption, kind === 'reel' && styles.kindOptionActive]}
          onPress={() => setKind('reel')}
        >
          <Ionicons
            name="play-circle-outline"
            size={16}
            color={kind === 'reel' ? '#fff' : colors.textMuted}
          />
          <Text style={[styles.kindText, kind === 'reel' && styles.kindTextActive]}>
            Share a Reel
          </Text>
        </Pressable>
        <Pressable
          style={[styles.kindOption, kind === 'review' && styles.kindOptionActive]}
          onPress={() => setKind('review')}
        >
          <Ionicons
            name="star-outline"
            size={16}
            color={kind === 'review' ? '#fff' : colors.textMuted}
          />
          <Text style={[styles.kindText, kind === 'review' && styles.kindTextActive]}>
            Write a Review
          </Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>Pick a spot to {kind === 'reel' ? 'share a reel' : 'review'} for.</Text>

      <FlatList
        data={spots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              kind === 'reel'
                ? navigation.replace('NewPost', { spotId: item.id })
                : navigation.replace('AddReview', { spotId: item.id })
            }
          >
            <Image source={{ uri: item.photos[0] }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.location}>
                {item.isHomeBased ? item.serviceArea : item.address}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  kindToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  kindOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
  },
  kindOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  kindText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  kindTextActive: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },
  name: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
  location: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
