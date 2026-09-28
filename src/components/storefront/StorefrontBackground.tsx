import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StorefrontBackground as Background } from '../../types/storefront';
import { imageSource } from '../../utils/storefrontImages';

interface Props {
  background: Background;
  // Height to cover. Defaults to the window (for a background that stays
  // put while scrolling); pass the scroll content's height otherwise.
  height?: number;
}

// Aspect ratio (height / width) of a bundled or remote image.
function useAspect(src: string | null) {
  const [aspect, setAspect] = useState(1);
  useEffect(() => {
    const source = imageSource(src);
    if (!source) return;
    if (typeof source === 'number') {
      const { width, height } = Image.resolveAssetSource(source);
      if (width) setAspect(height / width);
      return;
    }
    const uri = (source as { uri?: string }).uri;
    if (uri) Image.getSize(uri, (w, h) => w && setAspect(h / w), () => {});
  }, [src]);
  return aspect;
}

// The decorative layer behind a storefront. Menu cards always sit on top of
// it as solid (or nearly solid) cards, so a loud pattern never makes prices
// hard to read.
export default function StorefrontBackground({ background, height }: Props) {
  const { width, height: windowHeight } = useWindowDimensions();
  const aspect = useAspect(background.image);
  const source = imageSource(background.image);
  if (!source) return null;

  const coverHeight = height ?? windowHeight;
  const opacity = Math.max(0, Math.min(100, background.strength)) / 100;

  if (background.fit === 'fill') {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: coverHeight }]}>
        <Image source={source} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity }]} />
      </View>
    );
  }

  if (background.fit === 'fixed') {
    const w = (width * Math.max(10, background.size)) / 100;
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: coverHeight, alignItems: 'center' }]}>
        <Image source={source} style={{ width: w, height: w * aspect, opacity }} />
      </View>
    );
  }

  // Tile: repeat the image in a grid, each tile `size`% of the screen wide.
  const tileWidth = Math.max(40, (width * Math.max(10, background.size)) / 100);
  const tileHeight = tileWidth * aspect;
  const cols = Math.ceil(width / tileWidth);
  const rows = Math.ceil(coverHeight / tileHeight);
  return (
    // Exactly `cols` tiles wide (may overhang the right edge) so every row
    // lines up instead of wrapping early.
    <View pointerEvents="none" style={[styles.tiles, { width: cols * tileWidth, height: coverHeight, opacity }]}>
      {Array.from({ length: rows * cols }, (_, i) => (
        <Image key={i} source={source} style={{ width: tileWidth, height: tileHeight }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
});
