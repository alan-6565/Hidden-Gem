import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../../theme';

interface Props {
  label: string;
  value: number; // 0–100
  min?: number;
  onChange: (value: number) => void;
  colors: ThemeColors;
}

// A plain-JS slider (no native module, so it works in every build and in
// Expo Go). Drag or tap anywhere on the track.
export default function ValueSlider({ label, value, min = 0, onChange, colors }: Props) {
  const [width, setWidth] = useState(1);
  const widthRef = useRef(1);
  const startRef = useRef(0);

  const clamp = (v: number) => Math.round(Math.max(min, Math.min(100, v)));
  // The responder is created once; always call the latest onChange.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the page from scrolling while dragging the thumb.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const next = clamp((e.nativeEvent.locationX / widthRef.current) * 100);
        startRef.current = next;
        onChangeRef.current(next);
      },
      onPanResponderMove: (_, g) => {
        onChangeRef.current(clamp(startRef.current + (g.dx / widthRef.current) * 100));
      },
    }),
  ).current;

  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.textMuted }]}>{Math.round(value)}%</Text>
      </View>
      <View
        style={styles.hitArea}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width || 1;
          setWidth(widthRef.current);
        }}
        {...responder.panHandlers}
      >
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            { left: (pct / 100) * width - 11, borderColor: colors.primary, backgroundColor: colors.card },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
  },
  hitArea: {
    height: 32,
    justifyContent: 'center',
  },
  track: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: 5,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
  },
});
