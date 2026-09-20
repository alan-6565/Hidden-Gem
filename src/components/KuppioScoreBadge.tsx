import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface Props {
  score: number;
  variant?: 'dark' | 'light';
  style?: StyleProp<ViewStyle>;
}

export default function KuppioScoreBadge({ score, variant = 'dark', style }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const light = variant === 'light';
  return (
    <View style={[styles.badge, light && styles.badgeLight, style]}>
      <Text style={[styles.text, light && styles.textLight]}>
        {score > 0 ? Math.round(score) : 'New'}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  badge: {
    backgroundColor: colors.dark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeLight: {
    backgroundColor: colors.successMuted,
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
