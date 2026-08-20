import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface Props {
  score: number;
  variant?: 'dark' | 'light';
  style?: StyleProp<ViewStyle>;
}

export default function KuppioScoreBadge({ score, variant = 'dark', style }: Props) {
  const light = variant === 'light';
  return (
    <View style={[styles.badge, light && styles.badgeLight, style]}>
      <Text style={[styles.text, light && styles.textLight]}>{Math.round(score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.dark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeLight: {
    backgroundColor: '#E3F2E9',
  },
  text: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  textLight: {
    color: colors.matchaDark,
  },
});
