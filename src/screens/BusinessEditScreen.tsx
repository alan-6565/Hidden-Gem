import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import TimePickerField from '../components/TimePickerField';
import { MenuItem, OpenHours, PriceRange, SpotCategory } from '../types';
import { isPromoted } from '../utils/promotion';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessEdit'>;

const DAYS: OpenHours['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PRICE_OPTIONS: PriceRange[] = ['$', '$$', '$$$'];

const CATEGORY_OPTIONS: { key: SpotCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'coffee', label: 'Cafe', icon: 'cafe' },
  { key: 'matcha', label: 'Matcha & Tea', icon: 'leaf' },
  { key: 'dessert', label: 'Dessert', icon: 'ice-cream' },
  { key: 'brunch', label: 'Brunch', icon: 'egg' },
  { key: 'home_based', label: 'Home-Based', icon: 'home' },
  { key: 'pop_up', label: 'Pop-Up', icon: 'flash' },
  { key: 'food_truck', label: 'Food Truck', icon: 'car' },
];

const AMENITY_OPTIONS: { tag: string; label: string }[] = [
  { tag: 'outdoor seating', label: 'Outdoor seating' },
  { tag: 'pet friendly', label: 'Pet friendly' },
  { tag: 'study-friendly', label: 'Good for studying' },
];

interface DayState {
  enabled: boolean;
  open: string;
  close: string;
}

export default function BusinessEditScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { spotId } = route.params;
  const insets = useSafeAreaInsets();
  const { spots, updateSpot } = useAppData();
  const { user } = useAuth();
  const spot = spots.find((s) => s.id === spotId);

  const [name, setName] = useState(spot?.name ?? '');
  const [category, setCategory] = useState<SpotCategory>(spot?.category ?? 'coffee');
  const [isHomeBased, setIsHomeBased] = useState(spot?.isHomeBased ?? false);
  const [address, setAddress] = useState(spot?.address ?? '');
  const [serviceArea, setServiceArea] = useState(spot?.serviceArea ?? '');
  const [phone, setPhone] = useState(spot?.phone ?? '');
  const [instagramUrl, setInstagramUrl] = useState(spot?.instagramUrl ?? '');
  const [tiktokUrl, setTiktokUrl] = useState(spot?.tiktokUrl ?? '');
  const [acceptingOrders, setAcceptingOrders] = useState(spot?.acceptingOrders ?? true);
  const [prepTime, setPrepTime] = useState(spot?.prepTime ?? '');
  const [description, setDescription] = useState(spot?.description ?? '');
  const [priceRange, setPriceRange] = useState<PriceRange>(spot?.priceRange ?? '$');
  const [photos, setPhotos] = useState<string[]>(spot?.photos ?? []);
  const [menu, setMenu] = useState<MenuItem[]>(spot?.menu ?? []);
  const [tags, setTags] = useState<string[]>(spot?.tags ?? []);
  const [uploadingItemPhotoId, setUploadingItemPhotoId] = useState<string | null>(null);
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

  const handleAddItemPhoto = async (id: string) => {
    if (!user) return;
    setUploadingItemPhotoId(id);
    try {
      const picked = await pickMediaFromLibrary({ allowVideos: false });
      if (!picked) return;
      const url = await uploadMedia(user.id, picked);
      updateMenuItem(id, { photo: url });
    } catch (e: any) {
      Alert.alert("Couldn't add photo", e?.message ?? 'Please try again.');
    } finally {
      setUploadingItemPhotoId(null);
    }
  };

  const toggleAmenity = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
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
    if (!name.trim()) {
      Alert.alert('Business name required', 'Enter a name before saving.');
      return;
    }
    setSaving(true);
    try {
      const hours: OpenHours[] = DAYS.filter((day) => hoursByDay[day].enabled).map((day) => ({
        day,
        open: hoursByDay[day].open,
        close: hoursByDay[day].close,
      }));
      const cleanedMenu = menu.filter((item) => item.name.trim().length > 0);
      await updateSpot(spotId, {
        name: name.trim(),
        category,
        isHomeBased,
        address: isHomeBased ? null : address.trim() || null,
        serviceArea: isHomeBased ? serviceArea.trim() || null : null,
        phone: phone.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        tiktokUrl: tiktokUrl.trim() || null,
        acceptingOrders,
        prepTime: prepTime.trim() || null,
        description,
        priceRange,
        hours,
        menu: cleanedMenu,
        photos,
        tags,
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

      <Text style={styles.sectionLabel}>Business name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Business name"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORY_OPTIONS.map((opt) => {
          const active = category === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[styles.categoryTile, active && styles.categoryTileActive]}
              onPress={() => setCategory(opt.key)}
            >
              <Ionicons name={opt.icon} size={18} color={active ? '#fff' : colors.text} />
              <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.homeBasedRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionLabel}>Home-based</Text>
          <Text style={styles.homeBasedHint}>
            Hides your exact address — shows a general service area instead.
          </Text>
        </View>
        <Switch value={isHomeBased} onValueChange={setIsHomeBased} />
      </View>
      {isHomeBased ? (
        <TextInput
          style={styles.input}
          value={serviceArea}
          onChangeText={setServiceArea}
          placeholder="Service area (e.g. Oakland, Fruitvale area)"
          placeholderTextColor={colors.textMuted}
        />
      ) : (
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Street address"
          placeholderTextColor={colors.textMuted}
        />
      )}

      <Text style={styles.sectionLabel}>Phone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="For the Call button on your spot page"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
      />

      <Text style={styles.sectionLabel}>Instagram</Text>
      <TextInput
        style={styles.input}
        value={instagramUrl}
        onChangeText={setInstagramUrl}
        placeholder="https://instagram.com/yourbusiness"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Text style={styles.sectionLabel}>TikTok</Text>
      <TextInput
        style={styles.input}
        value={tiktokUrl}
        onChangeText={setTiktokUrl}
        placeholder="https://tiktok.com/@yourbusiness"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <View style={styles.promoCard}>
        <View style={styles.promoIconWrap}>
          <Ionicons name="rocket" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.promoTitle}>
            {promoted ? 'Currently promoted' : 'Featured placement — coming soon'}
          </Text>
          <Text style={styles.promoSubtitle}>
            {promoted && spot.promotedUntil
              ? `Promoted until ${new Date(spot.promotedUntil).toLocaleDateString()}`
              : 'Paid, limited spots at the top of Home and Map will open up here.'}
          </Text>
        </View>
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

      <Text style={styles.sectionLabel}>Amenities</Text>
      <View style={styles.pillRow}>
        {AMENITY_OPTIONS.map((option) => {
          const active = tags.includes(option.tag);
          return (
            <Pressable
              key={option.tag}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => toggleAmenity(option.tag)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
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
              <TimePickerField
                label={`${day} opens`}
                value={hoursByDay[day].open}
                onChange={(v) => setDayTime(day, 'open', v)}
              />
              <Text style={styles.timeSeparator}>–</Text>
              <TimePickerField
                label={`${day} closes`}
                value={hoursByDay[day].close}
                onChange={(v) => setDayTime(day, 'close', v)}
              />
            </View>
          ) : (
            <Text style={styles.closedText}>Closed</Text>
          )}
        </View>
      ))}

      <View style={styles.homeBasedRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionLabel}>Accepting orders</Text>
          <Text style={styles.homeBasedHint}>
            Turn off to pause new "Order ahead" requests without hiding your menu.
          </Text>
        </View>
        <Switch value={acceptingOrders} onValueChange={setAcceptingOrders} />
      </View>

      <Text style={styles.sectionLabel}>Prep time</Text>
      <TextInput
        style={styles.input}
        value={prepTime}
        onChangeText={setPrepTime}
        placeholder="e.g. 15-20 min"
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.menuHeaderRow}>
        <Text style={styles.sectionLabel}>Menu</Text>
        <Pressable onPress={addMenuItem}>
          <Text style={styles.addMenuText}>+ Add item</Text>
        </Pressable>
      </View>
      {menu.map((item) => (
        <View key={item.id} style={styles.menuCard}>
          <View style={styles.menuRow}>
            <Pressable
              onPress={() => handleAddItemPhoto(item.id)}
              disabled={uploadingItemPhotoId === item.id}
            >
              {item.photo ? (
                <Image source={{ uri: item.photo }} style={styles.menuItemPhoto} />
              ) : (
                <View style={styles.menuItemPhotoPlaceholder}>
                  <Ionicons
                    name={uploadingItemPhotoId === item.id ? 'hourglass-outline' : 'camera-outline'}
                    size={16}
                    color={colors.textMuted}
                  />
                </View>
              )}
            </Pressable>
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
          <View style={styles.menuTogglesRow}>
            <Pressable
              style={[styles.miniPill, item.isPopular && styles.miniPillActive]}
              onPress={() => updateMenuItem(item.id, { isPopular: !item.isPopular })}
            >
              <Text style={[styles.miniPillText, item.isPopular && styles.miniPillTextActive]}>
                Popular
              </Text>
            </Pressable>
            <Pressable
              style={[styles.miniPill, item.soldOut && styles.miniPillActive]}
              onPress={() => updateMenuItem(item.id, { soldOut: !item.soldOut })}
            >
              <Text style={[styles.miniPillText, item.soldOut && styles.miniPillTextActive]}>
                Sold out
              </Text>
            </Pressable>
          </View>
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryTile: {
    width: 84,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryTileActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#fff',
  },
  homeBasedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  homeBasedHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  menuCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuItemPhoto: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },
  menuItemPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTogglesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  miniPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  miniPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  miniPillTextActive: {
    color: '#fff',
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
