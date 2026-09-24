import React, { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import { AppNotification, NotificationType } from '../types';
import { formatDate } from '../utils/date';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const NOTIFICATION_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  new_follower: 'person-add',
  review_reply: 'chatbubble-ellipses',
  order_status: 'receipt-outline',
  new_order: 'bag-handle',
};

export default function NotificationsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { notifications, unreadNotificationCount, refresh, markNotificationRead, markAllNotificationsRead } =
    useAppData();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handlePress = (item: AppNotification) => {
    if (!item.isRead) markNotificationRead(item.id);
    if (item.type === 'review_reply' && item.spotId) {
      navigation.navigate('SpotProfile', { spotId: item.spotId });
    } else if (item.type === 'order_status') {
      navigation.navigate('Orders', { mode: 'mine' });
    } else if (item.type === 'new_order') {
      navigation.navigate('Orders', { mode: 'business' });
    }
  };

  return (
    <View style={styles.container}>
      {unreadNotificationCount > 0 && (
        <Pressable style={styles.markAllRow} onPress={() => markAllNotificationsRead()}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </Pressable>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xl }]}
        ListEmptyComponent={<Text style={styles.emptyText}>Nothing yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.isRead && styles.cardUnread]}
            onPress={() => handlePress(item)}
          >
            <View style={[styles.iconWrap, !item.isRead && styles.iconWrapUnread]}>
              <Ionicons
                name={NOTIFICATION_ICONS[item.type]}
                size={18}
                color={item.isRead ? colors.textMuted : colors.primary}
              />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </Pressable>
        )}
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
  markAllRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  markAllText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardUnread: {
    borderColor: colors.primary,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  iconWrapUnread: {
    backgroundColor: colors.card,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
});
