import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing, ThemeColors } from '../theme';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const ROW_HEIGHT = 44;

// Every quarter-hour, "0:00" through "23:45" — 96 options. Values are stored
// and returned in the same plain 24h "H:MM" format the rest of the app
// already reads (isOpenNow / getStatusLabel in utils/hours.ts), so nothing
// downstream has to change.
const OPTIONS: string[] = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${h}:${String(m).padStart(2, '0')}`;
});

// Accepts the same loose formats utils/hours.ts's toMinutes() does ("9:00",
// "9am", "9:30 PM", ...) so a value someone typed before this picker existed
// still displays sensibly instead of falling back to the raw string.
function to12Hour(raw: string): string {
  const match = raw.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return raw;
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3];
  if (period) {
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
  }
  const displayPeriod = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${displayPeriod}`;
}

function closestOptionIndex(raw: string): number {
  const target = to12Hour(raw);
  const exact = OPTIONS.findIndex((opt) => to12Hour(opt) === target);
  return exact === -1 ? 0 : exact;
}

export default function TimePickerField({ value, onChange, label }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const listRef = useRef<FlatList<string>>(null);

  const selectedIndex = closestOptionIndex(value);

  const handleOpen = () => {
    setOpen(true);
    // Jump near the current value instead of always opening at 12:00 AM.
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: Math.max(0, selectedIndex - 3), animated: false });
    });
  };

  return (
    <>
      <Pressable
        style={styles.field}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${to12Hour(value)}` : to12Hour(value)}
      >
        <Text style={styles.fieldText}>{to12Hour(value)}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label ?? 'Select a time'}</Text>
              <Pressable hitSlop={8} onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <FlatList
              ref={listRef}
              data={OPTIONS}
              keyExtractor={(item) => item}
              getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
              initialScrollIndex={Math.max(0, selectedIndex - 3)}
              onScrollToIndexFailed={() => {}}
              style={styles.list}
              renderItem={({ item, index }) => (
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.rowText, index === selectedIndex && styles.rowTextActive]}>
                    {to12Hour(item)}
                  </Text>
                  {index === selectedIndex && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    field: {
      minWidth: 92,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      backgroundColor: colors.card,
    },
    fieldText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      maxHeight: '65%',
      paddingBottom: spacing.lg,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: spacing.sm,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    sheetTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    list: {
      paddingHorizontal: spacing.md,
    },
    row: {
      height: ROW_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowText: {
      fontSize: 15,
      color: colors.text,
    },
    rowTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
  });
