import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spot } from '../types';
import { useAppData } from '../context/DataContext';
import { distanceMiles, formatDistance } from '../utils/geo';
import { colors, radius, spacing } from '../theme';

interface Props {
  spot: Spot;
  userCoords: { lat: number; lng: number };
  onPress: () => void;
}

export default function SpotDropCard({ spot, userCoords, onPress }: Props) {
  const { isSaved, toggleSaved } = useAppData();
  const saved = isSaved(spot.id);
  const subtitle = spot.menu.find((m) => m.isPopular)?.name ?? spot.menu[0]?.name;
  const distance = formatDistance(distanceMiles(userCoords, { lat: spot.lat, lng: spot.lng }));

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: spot.photos[0] }} style={styles.image} />
      <Pressable
        style={styles.saveButton}
        hitSlop={8}
        onPress={(e) => {
          e.stopPropagation();
          toggleSaved(spot.id);
        }}
      >
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={16}
          color={saved ? colors.primary : '#fff'}
        />
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {spot.name}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        <Text style={styles.distance}>{distance}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  image: {
    width: '100%',
    height: 100,
    backgroundColor: colors.cream,
  },
  saveButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.sm,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  distance: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 3,
  },
});
