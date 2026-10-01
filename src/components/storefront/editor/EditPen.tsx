import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// The pencil badge edit mode puts on anything editable. Always drawn in
// Kuppio pink on white so it reads over any shop's colors or photos.
export default function EditPen({
  onPress,
  style,
  label,
}: {
  onPress: () => void;
  style?: ViewStyle;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.pen, style]}
    >
      <Ionicons name="pencil" size={13} color="#EE4C6A" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pen: {
    position: 'absolute',
    zIndex: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EE4C6A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
