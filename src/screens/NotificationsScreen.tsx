import React, { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAppData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { AppNotification, NotificationType } from '../types';
import { radius, spacing, ThemeColors } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  follow: 'person-add',
  review_reply: 'chatbubble-ellipses',
  order_status: 'receipt-outline',
  new_order: 'bag-handle',
  verification_approved: 'checkmark-circle',
  verification_rejected: 'close-circle',
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { notifications, unreadNotificationCount, refreshNotifications, markNotificationRead, markAllNotificationsRead } =
    useAppData();

  useFocusEffect(
    useCallback(() => {
      refreshNotifications();
    }, [refreshNotifications]),
  );

  const handlePress = (n: AppNotification) => {
    if (!n.readAt) markNotificationRead(n.id);
    switch (n.type) {
      case 'review_reply':
        if (n.data.spotId) navigation.navigate('SpotProfile', { spotId: n.data.spotId });
        break;
      case 'order_status':
        navigation.navigate('Orders', { mode: 'mine' });
        break;
      case 'new_order':
        navigation.navigate('Orders', { mode: 'business' });
        break;
      case 'verification_approved':
      case 'verification_rejected':
        navigation.navigate('VerificationStatus');
        break;
      case 'follow':
        // No public profile screen to open yet — the notification just gets marked read.
        break;
    }
  };

  return (
    <View style={styles.container}>
      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>Nothing yet — new followers, replies and order updates show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            unreadNotificationCount > 0 ? (
              <Pressable style={styles.markAllRow} onPress={markAllNotificationsRead} hitSlop={8}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, !item.readAt && styles.rowUnread]}
              onPress={() => handlePress(item)}
            >
              <View style={[styles.iconWrap, !item.readAt && styles.iconWrapUnread]}>
                <Ionicons
                  name={ICONS[item.type]}
                  size={18}
                  color={item.readAt ? colors.textMuted : colors.primary}
                />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? (
                  <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                  </Text>
                ) : null}
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.readAt && <View style={styles.unreadDot} />}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { paddingBottom: spacing.xl },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
    markAllRow: { alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    markAllText: { fontSize: 13, fontWeight: '700', color: colors.primary },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowUnread: { backgroundColor: colors.primaryMuted },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapUnread: { backgroundColor: colors.card },
    textCol: { flex: 1 },
    title: { fontSize: 14, fontWeight: '700', color: colors.text },
    body: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    time: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  });
