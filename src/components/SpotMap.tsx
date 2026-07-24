import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Spot } from '../types';
import { projectSpotsToMapCoords } from '../utils/geo';
import { colors, radius } from '../theme';
import MapPin from './MapPin';

interface Props {
  spots: Spot[];
  selectedSpotId: string | null;
  onSelectSpot: (spotId: string) => void;
}

export default function SpotMap({ spots, selectedSpotId, onSelectSpot }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const points = projectSpotsToMapCoords(spots, size.width, size.height);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.street1} />
      <View style={styles.street2} />
      <View style={styles.street3} />
      <View style={styles.park1} />
      <View style={styles.park2} />

      {points.map(({ spot, x, y }) => (
        <MapPin
          key={spot.id}
          label={spot.priceRange}
          selected={spot.id === selectedSpotId}
          x={x}
          y={y}
          onPress={() => onSelectSpot(spot.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1E9DC',
    overflow: 'hidden',
    position: 'relative',
  },
  street1: {
    position: 'absolute',
    top: '20%',
    left: -20,
    right: -20,
    height: 6,
    backgroundColor: '#E6DBC8',
    transform: [{ rotate: '-4deg' }],
  },
  street2: {
    position: 'absolute',
    top: '55%',
    left: -20,
    right: -20,
    height: 6,
    backgroundColor: '#E6DBC8',
    transform: [{ rotate: '2deg' }],
  },
  street3: {
    position: 'absolute',
    left: '35%',
    top: -20,
    bottom: -20,
    width: 6,
    backgroundColor: '#E6DBC8',
    transform: [{ rotate: '6deg' }],
  },
  park1: {
    position: 'absolute',
    top: '10%',
    right: '8%',
    width: 90,
    height: 70,
    borderRadius: radius.lg,
    backgroundColor: colors.matcha,
    opacity: 0.35,
  },
  park2: {
    position: 'absolute',
    bottom: '12%',
    left: '10%',
    width: 70,
    height: 55,
    borderRadius: radius.lg,
    backgroundColor: colors.matcha,
    opacity: 0.3,
  },
});
