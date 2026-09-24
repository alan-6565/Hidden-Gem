import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review, Spot } from '../types';
import Avatar from './Avatar';
import { useAppData } from '../context/DataContext';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface Props {
  spot: Spot;
  /** Reviews for this spot only — the caller is expected to have already filtered by spotId. */
  reviews: Review[];
  onPress: () => void;
}

const DOUBLE_TAP_DELAY = 280;
const CARD_WIDTH = Dimensions.get('window').width - spacing.md * 2;

function getAreaLabel(spot: Spot): string {
  if (spot.isHomeBased && spot.serviceArea) {
    return spot.serviceArea.split(',')[0].trim();
  }
  if (spot.address) {
    const parts = spot.address.split(',').map((p) => p.trim());
    return parts[1] ?? parts[0];
  }
  return '';
}

export default function FeedPostCard({ spot, reviews, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isSaved, toggleSaved, isSpotHyped, toggleSpotHype } = useAppData();
  const saved = isSaved(spot.id);
  const hyped = isSpotHyped(spot.id);
  const areaLabel = getAreaLabel(spot);
  const tagline = spot.description ?? spot.menu.find((m) => m.isPopular)?.name;
  const reviewers = useMemo(() => reviews.slice(0, 3), [reviews]);
  const reviewCount = reviews.length;

  const lastTapRef = useRef(0);
  const pendingTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showBurst, setShowBurst] = useState(false);
  const burstAnim = useRef(new Animated.Value(0)).current;
  const [photoIndex, setPhotoIndex] = useState(0);

  const handlePhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    setPhotoIndex(index);
  };

  useEffect(() => {
    return () => {
      if (pendingTapRef.current) clearTimeout(pendingTapRef.current);
    };
  }, []);

  const playBurst = () => {
    setShowBurst(true);
    burstAnim.setValue(0);
    Animated.sequence([
      Animated.spring(burstAnim, { toValue: 1, useNativeDriver: true, friction: 4 }),
      Animated.timing(burstAnim, { toValue: 0, duration: 300, delay: 250, useNativeDriver: true }),
    ]).start(() => setShowBurst(false));
  };

  const handleCardPress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (pendingTapRef.current) {
        clearTimeout(pendingTapRef.current);
        pendingTapRef.current = null;
      }
      lastTapRef.current = 0;
      if (!hyped) toggleSpotHype(spot.id);
      playBurst();
    } else {
      lastTapRef.current = now;
      pendingTapRef.current = setTimeout(() => {
        pendingTapRef.current = null;
        onPress();
      }, DOUBLE_TAP_DELAY);
    }
  };

  return (
    <Pressable style={styles.card} onPress={handleCardPress}>
      {spot.photos.length > 1 ? (
        <FlatList
          data={spot.photos}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          renderItem={({ item }) => <Image source={{ uri: item }} style={styles.carouselImage} />}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handlePhotoScroll}
          scrollEventThrottle={32}
        />
      ) : (
        <Image source={{ uri: spot.photos[0] }} style={styles.image} />
      )}

      {spot.photos.length > 1 && (
        <View style={styles.dotsRow} pointerEvents="none">
          {spot.photos.map((_, i) => (
            <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
          ))}
        </View>
      )}

      {areaLabel ? (
        <View style={styles.areaPill}>
          <Ionicons name="location" size={12} color="#fff" />
          <Text style={styles.areaPillText} numberOfLines={1}>
            {areaLabel}
          </Text>
        </View>
      ) : null}
      <Pressable
        style={styles.hypeTag}
        hitSlop={8}
        onPress={(e) => {
          e.stopPropagation();
          toggleSpotHype(spot.id);
        }}
      >
        <Ionicons name={hyped ? 'heart' : 'heart-outline'} size={22} color={hyped ? colors.primary : '#fff'} />
        <Text style={styles.hypeTagText}>{spot.worthTheHypeVotes}</Text>
      </Pressable>

      {showBurst && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.burst,
            {
              opacity: burstAnim,
              transform: [
                { scale: burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.3] }) },
              ],
            },
          ]}
        >
          <Ionicons name="heart" size={72} color="#fff" />
        </Animated.View>
      )}

      <View style={styles.scrim} />

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {spot.name}
        </Text>
        {tagline && (
          <Text style={styles.tagline} numberOfLines={2}>
            {tagline}
          </Text>
        )}

        <View style={styles.proofRow}>
          <View style={styles.avatarStack}>
            {reviewers.map((r, i) => (
              <Avatar
                key={r.id}
                uri={r.userAvatar}
                name={r.userName}
                size={22}
                style={[styles.avatar, i > 0 && { marginLeft: -8 }]}
              />
            ))}
          </View>
          <Text style={styles.proofText}>
            {reviewCount > 0 ? `${reviewCount} review${reviewCount === 1 ? '' : 's'}` : 'Be the first to review'}
          </Text>
          <Pressable
            hitSlop={8}
            style={styles.bookmarkButton}
            onPress={(e) => {
              e.stopPropagation();
              toggleSaved(spot.id);
            }}
          >
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: 'transparent',
      borderRadius: radius.md,
      overflow: 'hidden',
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: 320,
      backgroundColor: colors.cream,
    },
    carouselImage: {
      width: CARD_WIDTH,
      height: 320,
      backgroundColor: colors.cream,
    },
    dotsRow: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 120,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 4,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dotActive: {
      backgroundColor: '#fff',
    },
    areaPill: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: '65%',
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    areaPillText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    hypeTag: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    hypeTagText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    burst: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 320,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 110,
      backgroundColor: colors.dark,
      opacity: 0.6,
    },
    body: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: spacing.md,
    },
    name: {
      fontSize: 17,
      fontWeight: '800',
      color: '#fff',
    },
    tagline: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 3,
    },
    proofRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    avatarStack: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: '#fff',
      backgroundColor: colors.cream,
    },
    proofText: {
      flex: 1,
      fontSize: 12,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '600',
      marginLeft: spacing.xs,
    },
    bookmarkButton: {
      padding: 2,
    },
  });
