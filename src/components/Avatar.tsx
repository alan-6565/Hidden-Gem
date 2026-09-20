import React from 'react';
import { Image, ImageStyle, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  uri?: string | null;
  /** Used for the initial shown when there's no photo. */
  name?: string | null;
  size: number;
  style?: StyleProp<ImageStyle>;
}

// A profile photo, or — for the many users who haven't added one — a circle
// with their initial, so a missing avatar never renders as a blank hole.
export default function Avatar({ uri, name, size, style }: Props) {
  const { colors } = useTheme();
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[style, box]} />;
  }

  const initial = (name ?? '').replace(/^[^a-zA-Z0-9]+/, '').charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[
        style as StyleProp<ViewStyle>,
        box,
        { backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: Math.max(10, size * 0.42) }}>
        {initial}
      </Text>
    </View>
  );
}
