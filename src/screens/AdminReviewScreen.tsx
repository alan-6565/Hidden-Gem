import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchPendingVerifications,
  getVerificationDocUrl,
  reviewVerification,
} from '../lib/api';
import { BusinessVerification } from '../types';
import { colors, radius, spacing } from '../theme';

interface RowPhotos {
  idPhotoUrl: string | null;
  businessPhotoUrl: string | null;
}

export default function AdminReviewScreen() {
  const [items, setItems] = useState<BusinessVerification[]>([]);
  const [photos, setPhotos] = useState<Record<string, RowPhotos>>({});
  const [loading, setLoading] = useState(true);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const pending = await fetchPendingVerifications();
      setItems(pending);
      const photoEntries = await Promise.all(
        pending.map(async (v) => {
          const [idPhotoUrl, businessPhotoUrl] = await Promise.all([
            getVerificationDocUrl(v.idPhotoPath).catch(() => null),
            getVerificationDocUrl(v.businessPhotoPath).catch(() => null),
          ]);
          return [v.id, { idPhotoUrl, businessPhotoUrl }] as const;
        }),
      );
      setPhotos(Object.fromEntries(photoEntries));
    } catch (e: any) {
      Alert.alert("Couldn't load applications", e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (item: BusinessVerification) => {
    setActingOnId(item.id);
    try {
      await reviewVerification(item.id, 'approved');
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't approve", e?.message ?? 'Please try again.');
    } finally {
      setActingOnId(null);
    }
  };

  const reject = async (item: BusinessVerification, note?: string) => {
    setActingOnId(item.id);
    try {
      await reviewVerification(item.id, 'rejected', note);
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't reject", e?.message ?? 'Please try again.');
    } finally {
      setActingOnId(null);
    }
  };

  const handleReject = (item: BusinessVerification) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Reject application',
        'Optional note for the applicant',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: (note?: string) => reject(item, note || undefined),
          },
        ],
        'plain-text',
      );
    } else {
      Alert.alert('Reject application', 'Are you sure you want to reject this application?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => reject(item) },
      ]);
    }
  };

  const renderItem = ({ item }: { item: BusinessVerification }) => {
    const rowPhotos = photos[item.id];
    const acting = actingOnId === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.businessName}
          </Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {item.claimType === 'claim_existing' ? 'Claim' : 'New'}
            </Text>
          </View>
        </View>

        <Text style={styles.metaLine}>{item.contactEmail}</Text>
        {item.contactPhone && <Text style={styles.metaLine}>{item.contactPhone}</Text>}
        {item.googleMapsUrl && (
          <Pressable onPress={() => Linking.openURL(item.googleMapsUrl!)}>
            <Text style={styles.link}>{item.googleMapsUrl}</Text>
          </Pressable>
        )}

        <View style={styles.photoRow}>
          <View style={styles.photoTile}>
            <Text style={styles.photoLabel}>ID photo</Text>
            {rowPhotos?.idPhotoUrl ? (
              <Image source={{ uri: rowPhotos.idPhotoUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <ActivityIndicator color={colors.textMuted} />
              </View>
            )}
          </View>
          <View style={styles.photoTile}>
            <Text style={styles.photoLabel}>Business photo</Text>
            {rowPhotos?.businessPhotoUrl ? (
              <Image source={{ uri: rowPhotos.businessPhotoUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <ActivityIndicator color={colors.textMuted} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item)}
            disabled={acting}
          >
            <Ionicons name="close" size={16} color={colors.primaryDark} />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
            disabled={acting}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.approveButtonText}>{acting ? 'Working…' : 'Approve'}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="checkmark-done-circle-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>No pending applications.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  list: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  typeBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  metaLine: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  link: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  photoTile: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  photo: {
    width: '100%',
    height: 110,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
  },
  rejectButton: {
    backgroundColor: colors.primaryMuted,
  },
  rejectButtonText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
