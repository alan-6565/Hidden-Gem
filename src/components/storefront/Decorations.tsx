import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Decoration, DecorationPlacement, StorefrontTheme } from '../../types/storefront';
import { imageSource } from '../../utils/storefrontImages';
import { accentFont, withAlpha } from '../../utils/storefrontTheme';

const CORNERS: Partial<Record<DecorationPlacement, ViewStyle>> = {
  'hero-top-left': { top: 8, left: 12 },
  'hero-top-right': { top: 8, right: 12 },
  'hero-bottom-left': { bottom: 8, left: 12 },
  'hero-bottom-right': { bottom: 8, right: 12 },
};

function DecorationView({ decoration, theme }: { decoration: Decoration; theme: StorefrontTheme }) {
  const size = decoration.size ?? 22;
  if (decoration.kind === 'icon') {
    return (
      <Ionicons
        name={decoration.icon as keyof typeof Ionicons.glyphMap}
        size={size}
        color={decoration.color ?? theme.colors.primary}
      />
    );
  }
  if (decoration.kind === 'image') {
    const source = imageSource(decoration.image);
    return source ? <Image source={source} style={{ width: size, height: size }} resizeMode="contain" /> : null;
  }
  const text = (
    <Text
      style={{
        fontFamily: accentFont(theme) ?? 'DancingScript_700Bold',
        fontSize: size,
        lineHeight: size * 1.05,
        color: decoration.color ?? theme.colors.primary,
        textAlign: 'right',
        transform: [{ rotate: '-8deg' }],
        // Soft outline in the page color so script stays readable on busy
        // patterns and photos.
        textShadowColor: theme.background ? theme.colors.background : 'rgba(0,0,0,0.35)',
        textShadowRadius: theme.background ? 6 : 4,
      }}
    >
      {decoration.text}
    </Text>
  );
  // On a busy pattern, script needs a soft backdrop to stay readable.
  return theme.background ? (
    <View style={[styles.textBackdrop, { backgroundColor: withAlpha(theme.colors.background, 0.85) }]}>{text}</View>
  ) : (
    text
  );
}

// Absolutely positioned decorations for the hero's corners. Rendered inside
// a positioned parent; never intercepts touches.
export function CornerDecorations({ theme }: { theme: StorefrontTheme }) {
  const corner = theme.decorations.filter((d) => d.placement in CORNERS);
  if (corner.length === 0) return null;
  return (
    <>
      {corner.map((d, i) => (
        <View key={i} pointerEvents="none" style={[styles.corner, CORNERS[d.placement]]}>
          <DecorationView decoration={d} theme={theme} />
        </View>
      ))}
    </>
  );
}

// Wraps a title with the decorations placed at its sides, mirrored — the
// little flowers around "Chismesito Café" and "Trending Now".
export function DecoratedTitle({
  theme,
  placement,
  children,
}: {
  theme: StorefrontTheme;
  placement: 'title-sides' | 'section-title-sides';
  children: React.ReactNode;
}) {
  const side = theme.decorations.find((d) => d.placement === placement);
  if (!side) return <>{children}</>;
  return (
    <View style={styles.sides}>
      <DecorationView decoration={side} theme={theme} />
      <View style={styles.sidesCenter}>{children}</View>
      <DecorationView decoration={side} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  textBackdrop: {
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  corner: {
    position: 'absolute',
    maxWidth: '45%',
  },
  sides: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sidesCenter: {
    flexShrink: 1,
  },
});
