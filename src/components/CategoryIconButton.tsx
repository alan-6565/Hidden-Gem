import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface Props {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  avatarUrl?: string;
  color?: string;
  active?: boolean;
  onPress: () => void;
}

export default function CategoryIconButton({ label, icon, avatarUrl, color, active, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={[styles.circle, active && styles.circleActive]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : icon ? (
          <Ionicons name={icon} size={22} color={active ? '#fff' : color ?? colors.primary} />
        ) : null}
      </View>
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      width: 68,
    },
    circle: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    circleActive: {
      backgroundColor: colors.primary,
    },
    avatar: {
      width: 56,
      height: 56,
    },
    label: {
      marginTop: spacing.xs,
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    labelActive: {
      color: colors.primary,
    },
  });
