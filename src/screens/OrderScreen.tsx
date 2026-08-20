import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import { OrderItem } from '../types';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Order'>;

export default function OrderScreen({ route, navigation }: Props) {
  const { spotId } = route.params;
  const insets = useSafeAreaInsets();
  const { spots, placeOrder } = useAppData();
  const spot = spots.find((s) => s.id === spotId);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pickupTime, setPickupTime] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const orderItems: OrderItem[] = useMemo(() => {
    if (!spot) return [];
    return spot.menu
      .filter((item) => (quantities[item.id] ?? 0) > 0)
      .map((item) => ({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: quantities[item.id],
      }));
  }, [spot, quantities]);

  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!spot) {
    return (
      <View style={styles.container}>
        <Text>Spot not found.</Text>
      </View>
    );
  }

  const increment = (itemId: string) => {
    setQuantities((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
  };

  const decrement = (itemId: string) => {
    setQuantities((prev) => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] ?? 0) - 1) }));
  };

  const handlePlaceOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Add something to order', 'Pick at least one item first.');
      return;
    }
    setSubmitting(true);
    try {
      await placeOrder({
        spotId,
        items: orderItems,
        total,
        note: note.trim() || undefined,
        pickupTime: pickupTime.trim() || undefined,
      });
      Alert.alert(
        'Order placed!',
        `Your order has been sent to ${spot.name}. Pay in person when you pick it up.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert("Couldn't place order", e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Order from {spot.name}</Text>
        <Text style={styles.hint}>
          Pay at pickup — this app doesn't collect payment yet, it just sends your order ahead.
        </Text>

        {spot.menu.map((item) => {
          const qty = quantities[item.id] ?? 0;
          return (
            <View key={item.id} style={styles.menuRow}>
              {item.photo && <Image source={{ uri: item.photo }} style={styles.menuPhoto} />}
              <View style={styles.menuInfo}>
                <Text style={styles.menuName}>{item.name}</Text>
                <Text style={styles.menuPrice}>${item.price.toFixed(2)}</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable hitSlop={8} onPress={() => decrement(item.id)} disabled={qty === 0}>
                  <Ionicons
                    name="remove-circle-outline"
                    size={24}
                    color={qty === 0 ? colors.border : colors.text}
                  />
                </Pressable>
                <Text style={styles.qtyText}>{qty}</Text>
                <Pressable hitSlop={8} onPress={() => increment(item.id)}>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionLabel}>Pickup time</Text>
        <TextInput
          style={styles.textInput}
          value={pickupTime}
          onChangeText={setPickupTime}
          placeholder="e.g. Today 5pm"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.sectionLabel}>Notes for the seller (optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={note}
          onChangeText={setNote}
          placeholder="Any special requests?"
          placeholderTextColor={colors.textMuted}
          multiline
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
        <Pressable
          style={[styles.placeButton, (submitting || orderItems.length === 0) && styles.placeButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={submitting || orderItems.length === 0}
        >
          <Text style={styles.placeButtonText}>{submitting ? 'Placing…' : 'Place order'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuPhoto: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },
  menuInfo: {
    flex: 1,
  },
  menuName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuPrice: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    minWidth: 16,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  totalRow: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  placeButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  placeButtonDisabled: {
    opacity: 0.6,
  },
  placeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
