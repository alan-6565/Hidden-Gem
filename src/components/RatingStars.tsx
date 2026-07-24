import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface Props {
  rating: number;
  size?: number;
}

export default function RatingStars({ rating, size = 14 }: Props) {
  const stars = [1, 2, 3, 4, 5].map((n) => {
    if (rating >= n) return 'star';
    if (rating >= n - 0.5) return 'star-half';
    return 'star-outline';
  });

  return (
    <View style={styles.row}>
      {stars.map((name, i) => (
        <Ionicons key={i} name={name as any} size={size} color={colors.gold} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 1,
  },
});
