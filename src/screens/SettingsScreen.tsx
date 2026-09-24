import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { checkIsAdmin } from '../lib/api';
import { PRIVACY_URL, TERMS_URL } from '../constants/legal';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SUPPORT_EMAIL = 'jahiralancrisostomogarcia@gmail.com';

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export default function SettingsScreen({ navigation }: Props) {
  const { colors, preference, setPreference } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { deleteAccount } = useAppData();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkIsAdmin(user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [user]);

  const Row = ({ icon, label, onPress, destructive, disabled }: RowProps) => (
    <Pressable style={styles.row} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon} size={20} color={destructive ? colors.danger : colors.text} />
      <Text style={[styles.rowText, destructive && { color: colors.danger }]}>{label}</Text>
      {!destructive && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  );

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      "This permanently deletes your reviews, posts, comments, and saved items. Any business you manage will be unclaimed, not deleted. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              await signOut();
            } catch (e: any) {
              Alert.alert("Couldn't delete account", e?.message ?? 'Please try again.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.card}>
        <Row icon="person-outline" label="Edit profile" onPress={() => navigation.navigate('EditProfile')} />
        <View style={styles.divider} />
        <Row icon="lock-closed-outline" label="Blocked users" onPress={() => navigation.navigate('BlockedUsers')} />
      </View>

      <Text style={styles.sectionLabel}>PREFERENCES</Text>
      <View style={styles.card}>
        <View style={styles.appearanceRow}>
          <Ionicons name="sunny-outline" size={20} color={colors.text} />
          <Text style={styles.rowText}>Appearance</Text>
        </View>
        <View style={styles.appearancePills}>
          {(['system', 'light', 'dark'] as const).map((option) => (
            <Pressable
              key={option}
              style={[styles.appearancePill, preference === option && styles.appearancePillActive]}
              onPress={() => setPreference(option)}
            >
              <Text
                style={[styles.appearancePillText, preference === option && styles.appearancePillTextActive]}
              >
                {option === 'system' ? 'System' : option === 'light' ? 'Light' : 'Dark'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.sectionLabel}>ACTIVITY</Text>
      <View style={styles.card}>
        <Row icon="bag-handle-outline" label="Orders" onPress={() => navigation.navigate('Orders')} />
        {isAdmin && (
          <>
            <View style={styles.divider} />
            <Row
              icon="shield-checkmark-outline"
              label="Review applications"
              onPress={() => navigation.navigate('AdminReview')}
            />
          </>
        )}
      </View>

      <Text style={styles.sectionLabel}>SUPPORT</Text>
      <View style={styles.card}>
        <Row
          icon="help-circle-outline"
          label="Help & support"
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
        <View style={styles.divider} />
        <Row icon="document-outline" label="Terms of Service" onPress={() => Linking.openURL(TERMS_URL)} />
        <View style={styles.divider} />
        <Row icon="shield-outline" label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
      </View>

      <Pressable style={styles.signOutButton} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>ACCOUNT MANAGEMENT</Text>
      <View style={styles.card}>
        <Row
          icon="trash-outline"
          label={deleting ? 'Deleting…' : 'Delete account'}
          onPress={handleDeleteAccount}
          destructive
          disabled={deleting}
        />
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
      marginLeft: spacing.xs,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
    },
    rowText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: spacing.md + 20 + spacing.sm,
    },
    appearanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm + 4,
    },
    appearancePills: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
    },
    appearancePill: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    appearancePillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    appearancePillText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    appearancePillTextActive: {
      color: '#fff',
    },
    signOutButton: {
      marginTop: spacing.lg,
      alignItems: 'center',
      paddingVertical: spacing.sm + 4,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    signOutText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
  });
