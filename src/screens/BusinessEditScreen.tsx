import React, { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { pickMediaFromLibrary, uploadMedia } from '../lib/mediaUpload';
import { MenuItem, OpenHours, PriceRange } from '../types';
import { isPromoted } from '../utils/promotion';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessEdit'>;

const DAYS: OpenHours['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PRICE_OPTIONS: PriceRange[] = ['$', '$$', '$$$'];
const BOOST_DAYS = 7;

interface DayState {
  enabled: boolean;
  open: string;
  close: string;
}

export default function BusinessEditScreen({ route, navigation }: Props) {
  const { spotId } = route.params;
  const insets = useSafeAreaInsets();
  const { spots, updateSpot } = useAppData();
  const { user } = useAuth();
  const spot = spots.find((s) => s.id === spotId);

  const [description, setDescription] = useState(spot?.description ?? '');
  const [priceRange, setPriceRange] = useState<PriceRange>(spot?.priceRange ?? '$');
  const [photos, setPhotos] = useState<string[]>(spot?.photos ?? []);
  const [menu, setMenu] = useState<MenuItem[]>(spot?.menu ?? []);
  const [hoursByDay, setHoursByDay] = useState<Record<string, DayState>>(() => {
    const initial: Record<string, DayState> = {};
    for (const day of DAYS) {
      const existing = spot?.hours.find((h) => h.day === day);
      initial[day] = existing
        ? { enabled: true, open: existing.open, close: existing.close }
        : { enabled: false, open: '9:00', close: '17:00' };
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [boosting, setBoosting] = useState(false);

  if (!spot) {
    return (
      <View style={styles.container}>
        <Text>Spot not found.</Text>
      </View>
    );
  }

  if (spot.ownerUserId !== user?.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.notOwnerText}>You don't manage this business.</Text>
      </View>
    );
  }

  const promoted = isPromoted(spot);

  const handleBoost = () => {
    Alert.alert(
      'Boost this business?',
      `Promoted spots get priority placement in Home and Map for ${BOOST_DAYS} days. Payments aren't wired up yet, so this won't actually charge you — it just marks the business as promoted so you can see how it looks.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Boost it',
          onPress: async () => {
            setBoosting(true);
            try {
              const until = new Date();
              until.setDate(until.getDate() + BOOST_DAYS);
              await updateSpot(spotId, { promotedUntil: until.toISOString() });
            } catch (e: any) {
              Alert.alert("Couldn't boost this business", e?.message ?? 'Please try again.');
            } finally {
              setBoosting(false);
            }
          },
        },
      ],
    );
  };

  const toggleDay = (day: string) => {
    setHoursByDay((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const setDayTime = (day: string, field: 'open' | 'close', value: string) => {
    setHoursByDay((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const addMenuItem = () => {
    setMenu((prev) => [...prev, { id: `m-${Date.now()}`, name: '', price: 0 }]);
  };

  const updateMenuItem = (id: string, patch: Partial<MenuItem>) => {
    setMenu((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeMenuItem = (id: string) => {
    setMenu((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddPhoto = async () => {
    if (!user) return;
    setAddingPhoto(true);
    try {
      const picked = await pickMediaFromLibrary({ allowVideos: false });
      if (!picked) return;
      const url = await uploadMedia(user.id, picked);
      setPhotos((prev) => [...prev, url]);
    } catch (e: any) {
      Alert.alert("Couldn't add photo", e?.message ?? 'Please try again.');
    } finally {
      setAddingPhoto(false);
    }
  };

  const removePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const hours: OpenHours[] = DAYS.filter((day) => hoursByDay[day].enabled).map((day) => ({
        day,
        open: hoursByDay[day].open,
        close: hoursByDay[day].close,
      }));
      const cleanedMenu = menu.filter((item) => item.name.trim().length > 0);
      await updateSpot(spotId, {
        description,
        priceRange,
        hours,
        menu: cleanedMenu,
        photos,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Couldn't save changes", e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={styles.title}>Manage {spot.name}</Text>

      <View style={styles.promoCard}>
        <View style={styles.promoIconWrap}>
          <Ionicons name="rocket" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.promoTitle}>
            {promoted ? 'Currently promoted' : 'Get more visibility'}
          </Text>
          <Text style={styles.promoSubtitle}>
            {promoted && spot.promotedUntil
              ? `Boosted until ${new Date(spot.promotedUntil).toLocaleDateString()}`
              : `Priority placement in Home and Map for ${BOOST_DAYS} days`}
          </Text>
        </View>
        {!promoted && (
          <Pressable style={styles.promoButton} onPress={handleBoost} disabled={boosting}>
            <Text style={styles.promoButtonText}>{boosting ? '…' : 'Boost'}</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.sectionLabel}>Photos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
        {photos.map((uri) => (
          <View key={uri} style={styles.photoWrapper}>
            <Image source={{ uri }} style={styles.photo} />
            <Pressable style={styles.photoRemove} onPress={() => removePhoto(uri)}>
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        <Pressable style={styles.addPhotoTile} onPress={handleAddPhoto} disabled={addingPhoto}>
          <Ionicons name="add" size={22} color={colors.textMuted} />
          <Text style={styles.addPhotoText}>{addingPhoto ? 'Adding…' : 'Add'}</Text>
        </Pressable>
      </ScrollView>

      <Text style={styles.sectionLabel}>Description</Text>
      <TextInput
        style={styles.textArea}
        value={description}
        onChangeText={setDescription}
        placeholder="Tell people what makes this spot worth visiting..."
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Text style={styles.sectionLabel}>Price range</Text>
      <View style={styles.pillRow}>
        {PRICE_OPTIONS.map((option) => (
          <Pressable
            key={option}
            style={[styles.pill, priceRange === option && styles.pillActive]}
            onPress={() => setPriceRange(option)}
          >
            <Text style={[styles.pillText, priceRange === option && styles.pillTextActive]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Hours</Text>
      {DAYS.map((day) => (
        <View key={day} style={styles.hoursRow}>
          <Pressable style={styles.dayToggle} onPress={() => toggleDay(day)}>
            <Ionicons
              name={hoursByDay[day].enabled ? 'checkbox' : 'square-outline'}
              size={18}
              color={hoursByDay[day].enabled ? colors.primary : colors.textMuted}
            />
            <Text style={styles.dayLabel}>{day}</Text>
          </Pressable>
          {hoursByDay[day].enabled ? (
            <View style={styles.timeInputs}>
              <TextInput
                style={styles.timeInput}
                value={hoursByDay[day].open}
                onChangeText={(v) => setDayTime(day, 'open', v)}
                placeholder="9:00"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.timeSeparator}>–</Text>
              <TextInput
                style={styles.timeInput}
                value={hoursByDay[day].close}
                onChangeText={(v) => setDayTime(day, 'close', v)}
                placeholder="17:00"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ) : (
            <Text style={styles.closedText}>Closed</Text>
          )}
        </View>
      ))}

      <View style={styles.menuHeaderRow}>
        <Text style={styles.sectionLabel}>Menu</Text>
        <Pressable onPress={addMenuItem}>
          <Text style={styles.addMenuText}>+ Add item</Text>
        </Pressable>
      </View>
      {menu.map((item) => (
        <View key={item.id} style={styles.menuRow}>
          <TextInput
            style={styles.menuNameInput}
            value={item.name}
            onChangeText={(v) => updateMenuItem(item.id, { name: v })}
            placeholder="Item name"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.menuPriceInput}
            value={item.price ? String(item.price) : ''}
            onChangeText={(v) => updateMenuItem(item.id, { price: Number(v) || 0 })}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <Pressable hitSlop={8} onPress={() => removeMenuItem(item.id)}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      <Pressable
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save changes'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  notOwnerText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  promoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  promoSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  promoButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  promoButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  photoRow: {
    flexDirection: 'row',
  },
  photoWrapper: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoTile: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addPhotoText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    color: colors.text,
    fontSize: 14,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  pillTextActive: {
    color: '#fff',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: 90,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeInput: {
    width: 60,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
  },
  timeSeparator: {
    color: colors.textMuted,
  },
  closedText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  menuHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addMenuText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  menuNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    fontSize: 13,
    color: colors.text,
  },
  menuPriceInput: {
    width: 70,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    fontSize: 13,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
