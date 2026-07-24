import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

const THUMB_SIZE = 20;

export default function DistanceSlider({ value, min = 1, max = 10, onChange }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const updateFromX = (x: number) => {
    if (trackWidth === 0) return;
    const ratio = Math.min(1, Math.max(0, x / trackWidth));
    const next = Math.round(min + ratio * (max - min));
    onChange(next);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => updateFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => updateFromX(e.nativeEvent.locationX),
    }),
  ).current;

  const ratio = (value - min) / (max - min);
  const thumbLeft = trackWidth * ratio - THUMB_SIZE / 2;

  return (
    <View>
      <View style={styles.track} onLayout={onLayout} {...panResponder.panHandlers}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        <View style={[styles.thumb, { left: Math.max(0, thumbLeft) }]} />
      </View>
      <Text style={styles.valueLabel}>{value} mi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    justifyContent: 'center',
  },
  fill: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    position: 'absolute',
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  valueLabel: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'right',
  },
});
