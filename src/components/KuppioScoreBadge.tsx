import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface Props {
  score: number;
  style?: StyleProp<ViewStyle>;
}

export default function KuppioScoreBadge({ score, style }: Props) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>{Math.round(score)}</Text>
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
  text: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});
