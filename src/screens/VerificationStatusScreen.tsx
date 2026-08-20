import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/DataContext';
import { BusinessVerification, VerificationStatus } from '../types';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VerificationStatus'>;

const STATUS_META: Record<VerificationStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Pending review', color: colors.gold, bg: '#FCEFD4', icon: 'time-outline' },
  approved: { label: 'Approved', color: colors.success, bg: '#E3F2E9', icon: 'checkmark-circle' },
  rejected: { label: 'Not approved', color: colors.primaryDark, bg: colors.primaryMuted, icon: 'close-circle' },
};

export default function VerificationStatusScreen({ navigation }: Props) {
  const { myVerifications } = useAppData();

  const renderItem = ({ item }: { item: BusinessVerification }) => {
    const meta = STATUS_META[item.status];
    const canOpenSpot = item.status === 'approved' && item.existingSpotId;
    return (
      <Pressable
        style={styles.card}
        disabled={!canOpenSpot}
        onPress={() => {
          if (canOpenSpot) navigation.navigate('SpotProfile', { spotId: item.existingSpotId! });
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.businessName} numberOfLines={1}>
            {item.businessName}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={styles.claimType}>
          {item.claimType === 'claim_existing' ? 'Claiming existing listing' : 'New business'}
        </Text>
        <Text style={styles.date}>Submitted {new Date(item.createdAt).toLocaleDateString()}</Text>
        {item.status === 'rejected' && item.reviewerNote && (
          <Text style={styles.reviewerNote}>{item.reviewerNote}</Text>
        )}
        {canOpenSpot && (
          <Text style={styles.openHint}>Tap to view your business page →</Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {myVerifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            You haven't submitted any business applications yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={myVerifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  businessName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  claimType: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  reviewerNote: {
    fontSize: 12,
    color: colors.text,
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  openHint: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.sm,
  },
});
