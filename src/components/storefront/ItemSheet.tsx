import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MenuItem } from '../../types';
import { SelectedOption, StorefrontTheme } from '../../types/storefront';
import { radius, spacing, ThemeColors } from '../../theme';
import { imageSource } from '../../utils/storefrontImages';
import { formatPrice, headingFont, isSoldOut, onColor } from '../../utils/storefrontTheme';
import { describeOptions } from '../../context/CartContext';

interface Props {
  item: MenuItem | null;
  theme: StorefrontTheme;
  colors: ThemeColors;
  canOrder: boolean;
  onClose: () => void;
  onAdd: (item: MenuItem, options: SelectedOption[], quantity: number) => void;
}

// Required single-choice groups start on their first choice (e.g. the
// smallest size), so most drinks can be added in one tap.
function defaultSelection(item: MenuItem): SelectedOption[] {
  return (item.options ?? [])
    .filter((g) => g.required && !g.multiple && g.choices.length > 0)
    .map((g) => ({ groupId: g.id, choiceId: g.choices[0].id }));
}

export default function ItemSheet({ item, theme, colors, canOrder, onClose, onAdd }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<SelectedOption[]>([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      setSelected(defaultSelection(item));
      setQuantity(1);
    }
  }, [item]);

  const price = useMemo(() => (item ? describeOptions(item, selected).unitPrice : 0), [item, selected]);
  if (!item) return null;

  const soldOut = isSoldOut(item);
  const missing = (item.options ?? []).filter(
    (g) => g.required && !selected.some((s) => s.groupId === g.id),
  );

  const toggle = (groupId: string, choiceId: string, multiple: boolean) => {
    setSelected((prev) => {
      const isOn = prev.some((s) => s.groupId === groupId && s.choiceId === choiceId);
      if (multiple) {
        return isOn
          ? prev.filter((s) => !(s.groupId === groupId && s.choiceId === choiceId))
          : [...prev, { groupId, choiceId }];
      }
      return [...prev.filter((s) => s.groupId !== groupId), { groupId, choiceId }];
    });
  };

  const photo = imageSource(item.photo);
  const buttonText = onColor(colors.primary);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.sm }]}>
        <ScrollView bounces={false} contentContainerStyle={styles.scroll}>
          {photo && <Image source={photo} style={styles.photo} resizeMode="cover" />}
          <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
          <View style={styles.body}>
            <Text style={[styles.name, { color: colors.text, fontFamily: headingFont(theme) }]}>{item.name}</Text>
            <Text style={[styles.basePrice, { color: colors.primary }]}>{formatPrice(item.price)}</Text>
            {item.description ? (
              <Text style={[styles.description, { color: colors.textMuted }]}>{item.description}</Text>
            ) : null}

            {(item.options ?? []).map((group) => (
              <View key={group.id} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                  <Text style={[styles.groupHint, { color: group.required ? colors.primary : colors.textMuted }]}>
                    {group.required ? 'Required' : group.multiple ? 'Optional · pick any' : 'Optional'}
                  </Text>
                </View>
                {group.choices.map((choice) => {
                  const on = selected.some((s) => s.groupId === group.id && s.choiceId === choice.id);
                  return (
                    <Pressable
                      key={choice.id}
                      style={[styles.choice, { borderColor: colors.border }]}
                      onPress={() => toggle(group.id, choice.id, group.multiple)}
                    >
                      <Ionicons
                        name={
                          group.multiple
                            ? on ? 'checkbox' : 'square-outline'
                            : on ? 'radio-button-on' : 'radio-button-off'
                        }
                        size={20}
                        color={on ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.choiceName, { color: colors.text }]}>{choice.name}</Text>
                      {choice.price > 0 && (
                        <Text style={[styles.choicePrice, { color: colors.textMuted }]}>+{formatPrice(choice.price)}</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {soldOut ? (
            <Text style={[styles.unavailable, { color: colors.textMuted }]}>Sold out today — back tomorrow</Text>
          ) : !canOrder ? (
            <Text style={[styles.unavailable, { color: colors.textMuted }]}>Not taking orders right now</Text>
          ) : (
            <>
              <View style={[styles.stepper, { borderColor: colors.border }]}>
                <Pressable hitSlop={8} onPress={() => setQuantity((q) => Math.max(1, q - 1))}>
                  <Ionicons name="remove" size={20} color={colors.text} />
                </Pressable>
                <Text style={[styles.qty, { color: colors.text }]}>{quantity}</Text>
                <Pressable hitSlop={8} onPress={() => setQuantity((q) => Math.min(50, q + 1))}>
                  <Ionicons name="add" size={20} color={colors.text} />
                </Pressable>
              </View>
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.primary }, missing.length > 0 && styles.disabled]}
                disabled={missing.length > 0}
                onPress={() => {
                  onAdd(item, selected, quantity);
                  onClose();
                }}
              >
                <Text style={[styles.addText, { color: buttonText }]}>
                  {missing.length > 0 ? `Choose a ${missing[0].name.toLowerCase()}` : `Add to cart · ${formatPrice(price * quantity)}`}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  scroll: {
    paddingBottom: spacing.md,
  },
  photo: {
    width: '100%',
    height: 220,
  },
  close: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.md,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
  },
  basePrice: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  group: {
    marginTop: spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '800',
  },
  groupHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  choiceName: {
    flex: 1,
    fontSize: 15,
  },
  choicePrice: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  qty: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 16,
    textAlign: 'center',
  },
  addButton: {
    flex: 1,
    height: 50,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 16,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  unavailable: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: spacing.md,
  },
});
