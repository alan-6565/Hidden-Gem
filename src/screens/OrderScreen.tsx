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
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { getPickupSlots, isOpenNow, parsePrepMinutes } from '../utils/hours';
import { cartTotals, useCart } from '../context/CartContext';
import { imageSource } from '../utils/storefrontImages';
import { resolveStorefront, storefrontPalette } from '../utils/storefrontTheme';

const ASAP = 'ASAP';

type Props = NativeStackScreenProps<RootStackParamList, 'Order'>;

export default function OrderScreen({ route, navigation }: Props) {
  const { colors: appColors } = useTheme();
  const { spotId } = route.params;
  const insets = useSafeAreaInsets();
  const { spots, placeOrder } = useAppData();
  const spot = spots.find((s) => s.id === spotId);
  // Checkout keeps the shop's colors, so it still feels like their store.
  const colors = useMemo(
    () => storefrontPalette(resolveStorefront(spot?.storefront), appColors, !!spot?.storefront),
    [spot?.storefront, appColors],
  );
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { linesFor, setQuantity, clearCart } = useCart();
  const lines = linesFor(spotId);

  const [pickupTime, setPickupTime] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // The server re-prices every line from the menu; these prices are what
  // the customer was shown.
  const orderItems: OrderItem[] = useMemo(
    () =>
      lines.map((l) => ({
        menuItemId: l.menuItemId,
        name: l.name,
        price: l.unitPrice,
        quantity: l.quantity,
        options: l.options,
      })),
    [lines],
  );

  // Computed once per visit — a slot list that shifts under your finger
  // while you're choosing is worse than one that's a minute stale.
  const pickup = useMemo(() => {
    if (!spot) return { openNow: false, prepMinutes: null, days: [] as { day: string; slots: string[] }[] };
    const days: { day: string; slots: string[] }[] = [];
    for (const slot of getPickupSlots(spot.hours, spot.prepTime)) {
      const day = slot.label.slice(0, slot.label.lastIndexOf(' ')); // "Today" / "Tomorrow"
      const group = days.find((d) => d.day === day);
      if (group) group.slots.push(slot.label);
      else days.push({ day, slots: [slot.label] });
    }
    return { openNow: isOpenNow(spot.hours), prepMinutes: parsePrepMinutes(spot.prepTime), days };
  }, [spot]);
  const hasPickupOptions = pickup.openNow || pickup.days.length > 0;
  const selectedPickup = pickupTime ?? (pickup.openNow ? ASAP : pickup.days[0]?.slots[0] ?? null);

  const { total } = cartTotals(lines);

  if (!spot) {
    return (
      <View style={styles.container}>
        <Text>Spot not found.</Text>
      </View>
    );
  }

  const handlePlaceOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Add something to order', 'Pick at least one item first.');
      return;
    }
    if (!selectedPickup) {
      Alert.alert('No pickup times available', `${spot.name} isn't open for pickup in the next two days.`);
      return;
    }
    setSubmitting(true);
    try {
      await placeOrder({
        spotId,
        items: orderItems,
        total,
        note: note.trim() || undefined,
        pickupTime: selectedPickup,
      });
      clearCart(spotId);
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
        <Text style={styles.title}>Your order from {spot.name}</Text>
        <Text style={styles.hint}>
          Pay at pickup — this app doesn't collect payment yet, it just sends your order ahead.
        </Text>

        {lines.length === 0 ? (
          <View style={styles.emptyCart}>
            <Ionicons name="bag-handle-outline" size={28} color={colors.textMuted} />
            <Text style={styles.hint}>Your cart is empty.</Text>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.backToMenu}>Back to the menu</Text>
            </Pressable>
          </View>
        ) : (
          lines.map((line) => {
            const photo = imageSource(line.photo);
            return (
              <View key={line.key} style={styles.menuRow}>
                {photo && <Image source={photo} style={styles.menuPhoto} />}
                <View style={styles.menuInfo}>
                  <Text style={styles.menuName}>{line.name}</Text>
                  {line.optionLabels.length > 0 && (
                    <Text style={styles.menuOptions}>{line.optionLabels.join(' · ')}</Text>
                  )}
                  <Text style={styles.menuPrice}>${(line.unitPrice * line.quantity).toFixed(2)}</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable hitSlop={8} onPress={() => setQuantity(spotId, line.key, line.quantity - 1)}>
                    <Ionicons
                      name={line.quantity === 1 ? 'trash-outline' : 'remove-circle-outline'}
                      size={22}
                      color={colors.text}
                    />
                  </Pressable>
                  <Text style={styles.qtyText}>{line.quantity}</Text>
                  <Pressable hitSlop={8} onPress={() => setQuantity(spotId, line.key, line.quantity + 1)}>
                    <Ionicons name="add-circle" size={24} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.sectionLabel}>Pickup time</Text>
        {!hasPickupOptions ? (
          <Text style={styles.noSlotsText}>
            {spot.name} isn't open for pickup in the next two days.
          </Text>
        ) : (
          <>
            {pickup.openNow && (
              <View style={styles.slotRow}>
                <SlotChip
                  label={pickup.prepMinutes ? `ASAP · ~${pickup.prepMinutes} min` : 'ASAP'}
                  selected={selectedPickup === ASAP}
                  onPress={() => setPickupTime(ASAP)}
                  styles={styles}
                />
              </View>
            )}
            {pickup.days.map(({ day, slots }) => (
              <View key={day}>
                <Text style={styles.slotDay}>{day}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotRow}>
                  {slots.map((slot) => (
                    <SlotChip
                      key={slot}
                      label={slot.slice(slot.lastIndexOf(' ') + 1)}
                      selected={selectedPickup === slot}
                      onPress={() => setPickupTime(slot)}
                      styles={styles}
                    />
                  ))}
                </ScrollView>
              </View>
            ))}
          </>
        )}

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
          style={[
            styles.placeButton,
            (submitting || orderItems.length === 0 || !selectedPickup) && styles.placeButtonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={submitting || orderItems.length === 0 || !selectedPickup}
        >
          <Text style={styles.placeButtonText}>{submitting ? 'Placing…' : 'Place order'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SlotChip({
  label,
  selected,
  onPress,
  styles,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable style={[styles.slotChip, selected && styles.slotChipSelected]} onPress={onPress}>
      <Text style={[styles.slotChipText, selected && styles.slotChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
  menuOptions: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyCart: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  backToMenu: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
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
  noSlotsText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  slotDay: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  slotRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  slotChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.card,
  },
  slotChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  slotChipTextSelected: {
    color: '#fff',
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
