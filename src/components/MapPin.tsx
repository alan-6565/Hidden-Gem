import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  label: string;
  selected: boolean;
  x: number;
  y: number;
  onPress: () => void;
}

export default function MapPin({ label, selected, x, y, onPress }: Props) {
  return (
    <Pressable
      style={[styles.wrapper, { left: x - 18, top: y - 40 }]}
      onPress={onPress}
      hitSlop={8}
    >
      <View style={[styles.bubble, selected && styles.bubbleSelected]}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      </View>
      <View style={[styles.pointer, selected && styles.pointerSelected]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  bubble: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  bubbleSelected: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 1.15 }],
  },
  label: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  labelSelected: {
    color: '#fff',
  },
  pointer: {
    width: 8,
    height: 8,
    backgroundColor: colors.primary,
    marginTop: -4,
    transform: [{ rotate: '45deg' }],
  },
  pointerSelected: {
    backgroundColor: colors.primaryDark,
  },
});
