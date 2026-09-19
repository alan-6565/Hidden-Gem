import React, { useMemo } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';

export interface StoryUser {
  id: string;
  name: string;
  avatar: string;
}

interface Props {
  users: StoryUser[];
  yourAvatar: string;
  onPressYours: () => void;
}

export default function StoryAvatarRow({ users, yourAvatar, onPressYours }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <FlatList
      data={users}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.row}
      ListHeaderComponent={
        <Pressable style={styles.item} onPress={onPressYours}>
          <View style={styles.ringMuted}>
            <Image source={{ uri: yourAvatar }} style={styles.avatar} />
            <View style={styles.addBadge}>
              <Ionicons name="add" size={12} color="#fff" />
            </View>
          </View>
          <Text style={styles.label} numberOfLines={1}>
            Your story
          </Text>
        </Pressable>
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
          <View style={styles.ring}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      )}
    />
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    item: {
      alignItems: 'center',
      width: 64,
      marginRight: spacing.sm,
    },
    ring: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
    },
    ringMuted: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
    },
    avatar: {
      width: '100%',
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: colors.cream,
    },
    addBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    label: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
  });
