import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchOpenReportGroups, resolveReport } from '../lib/api';
import { useAppData } from '../context/DataContext';
import { ReportAction, ReportGroup, ReportTargetType } from '../types';
import { formatDate } from '../utils/date';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminReports'>;

const TYPE_LABELS: Record<ReportTargetType, string> = {
  post: 'Post',
  review: 'Review',
  comment: 'Comment',
  user: 'User',
  spot: 'Listing',
};

// What "Remove" does for each kind of target — a user can't be removed
// from here, only marked as handled.
const REMOVE_LABELS: Partial<Record<ReportTargetType, string>> = {
  post: 'Delete post',
  review: 'Delete review',
  comment: 'Delete comment',
  spot: 'Remove listing',
};

function groupKey(group: ReportGroup): string {
  return `${group.targetType}:${group.targetId}`;
}

function summarizeReasons(group: ReportGroup): string {
  const counts = new Map<string, number>();
  for (const report of group.reports) counts.set(report.reason, (counts.get(report.reason) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => (count > 1 ? `${reason} ×${count}` : reason))
    .join(' · ');
}

export default function AdminReportsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingOnKey, setActingOnKey] = useState<string | null>(null);
  const { refresh } = useAppData();

  const load = useCallback(async () => {
    try {
      setGroups(await fetchOpenReportGroups());
    } catch (e: any) {
      Alert.alert("Couldn't load reports", e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const act = async (group: ReportGroup, action: ReportAction) => {
    const key = groupKey(group);
    setActingOnKey(key);
    try {
      // Closes every open report on this target, not just this one.
      await resolveReport(group.reports[0].id, action);
      setGroups((prev) => prev.filter((g) => groupKey(g) !== key));
      // Deleted content is still in this device's feeds until a reload.
      if (action === 'remove') refresh();
    } catch (e: any) {
      Alert.alert("Couldn't update report", e?.message ?? 'Please try again.');
    } finally {
      setActingOnKey(null);
    }
  };

  const confirmRemove = (group: ReportGroup) => {
    const label = REMOVE_LABELS[group.targetType];
    if (!label) return;
    Alert.alert(
      `${label}?`,
      group.targetType === 'spot'
        ? 'The listing will disappear from the app for everyone, including its owner.'
        : 'This deletes it for everyone and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: label, style: 'destructive', onPress: () => act(group, 'remove') },
      ],
    );
  };

  const renderItem = ({ item }: { item: ReportGroup }) => {
    const acting = actingOnKey === groupKey(item);
    const preview = item.preview;
    const removeLabel = REMOVE_LABELS[item.targetType];
    const latest = item.reports[0];
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{TYPE_LABELS[item.targetType]}</Text>
          </View>
          <Text style={styles.countText}>
            {item.reports.length} {item.reports.length === 1 ? 'report' : 'reports'} · {formatDate(latest.createdAt)}
          </Text>
        </View>

        <Text style={styles.reasons}>{summarizeReasons(item)}</Text>

        {preview ? (
          <View style={styles.previewRow}>
            {preview.mediaUrl &&
              (preview.isVideo ? (
                <View style={[styles.thumb, styles.videoThumb]}>
                  <Ionicons name="videocam" size={22} color={colors.textMuted} />
                </View>
              ) : (
                <Image source={{ uri: preview.mediaUrl }} style={styles.thumb} />
              ))}
            <View style={styles.previewText}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {preview.title}
              </Text>
              {preview.body ? (
                <Text style={styles.previewBody} numberOfLines={4}>
                  {preview.body}
                </Text>
              ) : null}
              {preview.spotId && item.targetType !== 'spot' ? (
                <Pressable onPress={() => navigation.navigate('SpotProfile', { spotId: preview.spotId! })}>
                  <Text style={styles.link}>View listing →</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          <Text style={styles.goneText}>This content has already been deleted.</Text>
        )}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => act(item, 'dismiss')}
            disabled={acting}
          >
            <Text style={styles.secondaryButtonText}>Dismiss</Text>
          </Pressable>
          {preview && removeLabel ? (
            <Pressable
              style={[styles.actionButton, styles.removeButton]}
              onPress={() => confirmRemove(item)}
              disabled={acting}
            >
              <Ionicons name="trash-outline" size={15} color="#fff" />
              <Text style={styles.removeButtonText}>{acting ? 'Working…' : removeLabel}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.actionButton, styles.resolveButton]}
              onPress={() => act(item, 'resolve')}
              disabled={acting}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.removeButtonText}>{acting ? 'Working…' : 'Mark handled'}</Text>
            </Pressable>
          )}
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
      <FlatList
        data={groups}
        keyExtractor={groupKey}
        contentContainerStyle={groups.length === 0 ? styles.emptyList : styles.list}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="checkmark-done-circle-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No open reports.</Text>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    emptyList: {
      flexGrow: 1,
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
      gap: spacing.sm,
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
    countText: {
      flex: 1,
      fontSize: 12,
      color: colors.textMuted,
    },
    reasons: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginTop: spacing.sm,
    },
    previewRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
      padding: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.background,
    },
    thumb: {
      width: 72,
      height: 72,
      borderRadius: radius.sm,
      backgroundColor: colors.cream,
    },
    videoThumb: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewText: {
      flex: 1,
    },
    previewTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    previewBody: {
      fontSize: 13,
      color: colors.text,
      marginTop: 2,
    },
    link: {
      fontSize: 13,
      color: colors.primary,
      marginTop: 4,
    },
    goneText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginTop: spacing.sm,
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
    secondaryButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    removeButton: {
      backgroundColor: colors.danger,
    },
    resolveButton: {
      backgroundColor: colors.success,
    },
    removeButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
  });
