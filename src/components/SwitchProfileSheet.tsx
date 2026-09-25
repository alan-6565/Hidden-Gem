import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// The "tap your name" account switcher — Personal plus every business you
// own, with entry points into claiming a new one and checking on pending
// applications. Selecting a business opens its Business Hub rather than
// changing any app-wide state, so the rest of the app (Home, Map, Reels)
// stays exactly as it was.
export default function SwitchProfileSheet({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { spots, profile } = useAppData();
  const { user } = useAuth();

  const myBusinesses = useMemo(
    () => spots.filter((s) => s.ownerUserId === user?.id),
    [spots, user],
  );

  const go = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Switch profile</Text>

          <Text style={styles.sectionLabel}>PERSONAL</Text>
          <Pressable style={styles.row} onPress={onClose}>
            <Avatar uri={profile?.avatarUrl} name={profile?.username} size={40} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{profile?.username ?? 'you'}</Text>
              <Text style={styles.rowSubtitle}>Personal account</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          </Pressable>

          {myBusinesses.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>BUSINESSES</Text>
              {myBusinesses.map((spot) => (
                <Pressable
                  key={spot.id}
                  style={styles.row}
                  onPress={() => go(() => navigation.navigate('BusinessHub', { spotId: spot.id }))}
                >
                  <Avatar uri={spot.photos[0]} name={spot.name} size={40} />
                  <View style={styles.rowText}>
                    <View style={styles.rowTitleLine}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {spot.name}
                      </Text>
                      <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.rowSubtitle}>Business account</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </>
          )}

          <View style={styles.divider} />

          <Pressable
            style={styles.actionRow}
            onPress={() => go(() => navigation.navigate('Tabs', { screen: 'Map', params: { startAddingBusiness: true } }))}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.text} />
            <Text style={styles.actionText}>Add or claim a business</Text>
          </Pressable>
          <Pressable
            style={styles.actionRow}
            onPress={() => go(() => navigation.navigate('VerificationStatus'))}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.text} />
            <Text style={styles.actionText}>Manage applications</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.overlay,
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginTop: spacing.sm,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.textMuted,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    rowText: {
      flex: 1,
    },
    rowTitleLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
    rowSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
  });
