import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus } from '../types';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>;

type Mode = 'mine' | 'business';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  ready: 'Ready for pickup',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const getStatusColors = (colors: ThemeColors): Record<OrderStatus, string> => ({
  pending: colors.gold,
  accepted: colors.primary,
  ready: colors.success,
  completed: colors.textMuted,
  declined: colors.textMuted,
  cancelled: colors.textMuted,
});

const CURRENT_STATUSES: OrderStatus[] = ['pending', 'accepted', 'ready'];
const IN_PROGRESS_STATUSES: OrderStatus[] = ['accepted', 'ready'];
const HISTORY_STATUSES: OrderStatus[] = ['completed', 'declined', 'cancelled'];

export default function OrdersScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const STATUS_COLORS = useMemo(() => getStatusColors(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { orders, spots, setOrderStatus, refresh } = useAppData();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>(route.params?.mode ?? 'mine');

  // Orders are only loaded once at app launch otherwise — a business would
  // only see a new order after restarting the app.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const ownedSpotIds = useMemo(
    () => spots.filter((s) => s.ownerUserId === user?.id).map((s) => s.id),
    [spots, user],
  );
  const hasBusiness = ownedSpotIds.length > 0;

  const myOrders = useMemo(
    () => orders.filter((o) => o.customerUserId === user?.id),
    [orders, user],
  );
  const businessOrders = useMemo(
    () => orders.filter((o) => ownedSpotIds.includes(o.spotId)),
    [orders, ownedSpotIds],
  );

  const list = mode === 'business' ? businessOrders : myOrders;

  // A business is triaging (a pending order needs a decision now, distinct
  // from one already accepted), while a customer is just waiting — so the
  // business view gets a 3-way split and the customer view a simpler 2-way.
  const sections = useMemo(() => {
    if (mode === 'business') {
      const needsAction = list.filter((o) => o.status === 'pending');
      const inProgress = list.filter((o) => IN_PROGRESS_STATUSES.includes(o.status));
      const history = list.filter((o) => HISTORY_STATUSES.includes(o.status));
      return [
        ...(needsAction.length > 0 ? [{ title: 'Needs action', data: needsAction }] : []),
        ...(inProgress.length > 0 ? [{ title: 'In progress', data: inProgress }] : []),
        ...(history.length > 0 ? [{ title: 'History', data: history }] : []),
      ];
    }
    const current = list.filter((o) => CURRENT_STATUSES.includes(o.status));
    const past = list.filter((o) => HISTORY_STATUSES.includes(o.status));
    return [
      ...(current.length > 0 ? [{ title: 'Current', data: current }] : []),
      ...(past.length > 0 ? [{ title: 'Past', data: past }] : []),
    ];
  }, [list, mode]);

  const handleStatusChange = (order: Order, status: OrderStatus) => {
    setOrderStatus(order.id, status).catch((e: any) =>
      Alert.alert("Couldn't update order", e?.message ?? 'Please try again.'),
    );
  };

  const handleCancel = (order: Order) => {
    Alert.alert('Cancel this order?', undefined, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: () => handleStatusChange(order, 'cancelled') },
    ]);
  };

  return (
    <View style={styles.container}>
      {hasBusiness && (
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleTab, mode === 'mine' && styles.toggleTabActive]}
            onPress={() => setMode('mine')}
          >
            <Text style={[styles.toggleText, mode === 'mine' && styles.toggleTextActive]}>
              My Orders
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleTab, mode === 'business' && styles.toggleTabActive]}
            onPress={() => setMode('business')}
          >
            <Text style={[styles.toggleText, mode === 'business' && styles.toggleTextActive]}>
              Business Orders
            </Text>
          </Pressable>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xl }]}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {mode === 'business' ? 'No orders yet.' : "You haven't placed any orders yet."}
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const spot = spots.find((s) => s.id === item.spotId);
          return (
            <View style={styles.card}>
              <Pressable onPress={() => spot && navigation.navigate('SpotProfile', { spotId: spot.id })}>
                <Text style={styles.spotName}>{spot?.name ?? 'Spot'}</Text>
              </Pressable>
              <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[item.status] }]}>
                <Text style={styles.statusPillText}>{STATUS_LABELS[item.status]}</Text>
              </View>

              {item.items.map((line) => (
                <Text key={line.menuItemId} style={styles.itemLine}>
                  {line.quantity}× {line.name}
                </Text>
              ))}
              <Text style={styles.total}>Total: ${item.total.toFixed(2)}</Text>
              {item.pickupTime && <Text style={styles.meta}>Pickup: {item.pickupTime}</Text>}
              {item.note && <Text style={styles.meta}>Note: {item.note}</Text>}

              {mode === 'business' && item.status === 'pending' && (
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.declineButton}
                    onPress={() => handleStatusChange(item, 'declined')}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </Pressable>
                  <Pressable
                    style={styles.acceptButton}
                    onPress={() => handleStatusChange(item, 'accepted')}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </Pressable>
                </View>
              )}
              {mode === 'business' && item.status === 'accepted' && (
                <Pressable style={styles.acceptButton} onPress={() => handleStatusChange(item, 'ready')}>
                  <Text style={styles.acceptButtonText}>Mark ready for pickup</Text>
                </Pressable>
              )}
              {mode === 'business' && item.status === 'ready' && (
                <Pressable style={styles.acceptButton} onPress={() => handleStatusChange(item, 'completed')}>
                  <Text style={styles.acceptButtonText}>Mark completed</Text>
                </Pressable>
              )}
              {mode === 'mine' && item.status === 'pending' && (
                <Pressable style={styles.declineButton} onPress={() => handleCancel(item)}>
                  <Text style={styles.declineButtonText}>Cancel order</Text>
                </Pressable>
              )}
            </View>
          );
        }}
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
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  toggleTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  toggleTextActive: {
    color: '#fff',
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    backgroundColor: colors.background,
    paddingBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  spotName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  itemLine: {
    fontSize: 13,
    color: colors.text,
  },
  total: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  declineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  declineButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
});
