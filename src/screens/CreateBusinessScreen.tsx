import React, { useState } from 'react';
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
import { pickMediaFromLibrary, uploadMedia, uploadVerificationDoc } from '../lib/mediaUpload';
import { MenuItem, OpenHours, PriceRange, SpotCategory } from '../types';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateBusiness'>;

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

interface DayState {
  enabled: boolean;
  open: string;
  close: string;
}

export default function CreateBusinessScreen({ route, navigation }: Props) {
  const { lat, lng } = route.params;
  const insets = useSafeAreaInsets();
  const { submitVerification } = useAppData();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<SpotCategory>('coffee');
  const [isHomeBased, setIsHomeBased] = useState(false);
  const [address, setAddress] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [description, setDescription] = useState('');
  const [priceRange, setPriceRange] = useState<PriceRange>('$');
  const [photos, setPhotos] = useState<string[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [idPhotoPath, setIdPhotoPath] = useState<string | null>(null);
  const [businessPhotoPath, setBusinessPhotoPath] = useState<string | null>(null);
  const [uploadingIdPhoto, setUploadingIdPhoto] = useState(false);
  const [uploadingBusinessPhoto, setUploadingBusinessPhoto] = useState(false);
  const [hoursByDay, setHoursByDay] = useState<Record<string, DayState>>(() => {
    const initial: Record<string, DayState> = {};
    for (const day of DAYS) {
      initial[day] = { enabled: false, open: '9:00', close: '17:00' };
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);

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

  const handlePickIdPhoto = async () => {
    if (!user) return;
    setUploadingIdPhoto(true);
    try {
      const picked = await pickMediaFromLibrary({ allowVideos: false });
      if (!picked) return;
      const path = await uploadVerificationDoc(user.id, picked);
      setIdPhotoPath(path);
    } catch (e: any) {
      Alert.alert("Couldn't add photo", e?.message ?? 'Please try again.');
    } finally {
      setUploadingIdPhoto(false);
    }
  };

  const handlePickBusinessPhoto = async () => {
    if (!user) return;
    setUploadingBusinessPhoto(true);
    try {
      const picked = await pickMediaFromLibrary({ allowVideos: false });
      if (!picked) return;
      const path = await uploadVerificationDoc(user.id, picked);
      setBusinessPhotoPath(path);
    } catch (e: any) {
      Alert.alert("Couldn't add photo", e?.message ?? 'Please try again.');
    } finally {
      setUploadingBusinessPhoto(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Add a name', 'Give your business a name before submitting it.');
      return;
    }
    if (!contactEmail.trim()) {
      Alert.alert('Add a contact email', "We'll use this to reach you about your application.");
      return;
    }
    if (!idPhotoPath || !businessPhotoPath) {
      Alert.alert(
        'Add verification photos',
        'A photo ID and a photo of your business (storefront, workspace, or product) are required for review.',
      );
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
      await submitVerification({
        claimType: 'create_new',
        businessName: name.trim(),
        category,
        isHomeBased,
        lat,
        lng,
        address: isHomeBased ? undefined : address.trim() || undefined,
        serviceArea: isHomeBased ? serviceArea.trim() || undefined : undefined,
        priceRange,
        description: description.trim() || undefined,
        photos,
        hours,
        menu: cleanedMenu,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        googleMapsUrl: googleMapsUrl.trim() || undefined,
        idPhotoPath,
        businessPhotoPath,
      });
      navigation.replace('VerificationStatus');
    } catch (e: any) {
      Alert.alert("Couldn't submit for review", e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={styles.title}>Add your business</Text>
      <Text style={styles.subtitle}>
        This pin will be placed at the location you picked on the map. We review new
        businesses before they go live — you'll hear back once it's approved.
      </Text>

      <Text style={styles.sectionLabel}>Name</Text>
      <TextInput
        style={styles.textInput}
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
              <Ionicons name={opt.icon} size={20} color={active ? colors.primary : colors.textMuted} />
              <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.homeBasedRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionLabelInline}>Home-based / no storefront</Text>
          <Text style={styles.homeBasedHint}>
            Hides your exact address — shows a general service area instead.
          </Text>
        </View>
        <Switch
          value={isHomeBased}
          onValueChange={setIsHomeBased}
          trackColor={{ true: colors.primary }}
        />
      </View>

      {isHomeBased ? (
        <>
          <Text style={styles.sectionLabel}>Service area</Text>
          <TextInput
            style={styles.textInput}
            value={serviceArea}
            onChangeText={setServiceArea}
            placeholder="e.g. Oakland, Fruitvale area"
            placeholderTextColor={colors.textMuted}
          />
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Address</Text>
          <TextInput
            style={styles.textInput}
            value={address}
            onChangeText={setAddress}
            placeholder="Street address"
            placeholderTextColor={colors.textMuted}
          />
        </>
      )}

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

      <Text style={styles.sectionLabel}>Verification</Text>
      <Text style={styles.verificationHint}>
        A photo ID and a photo of your business are required so we can confirm you're the
        owner. These are kept private and only visible to you and our review team.
      </Text>

      <Text style={styles.sectionLabelInline}>Contact email</Text>
      <TextInput
        style={[styles.textInput, { marginTop: spacing.sm }]}
        value={contactEmail}
        onChangeText={setContactEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={[styles.sectionLabelInline, { marginTop: spacing.md }]}>
        Contact phone (optional)
      </Text>
      <TextInput
        style={[styles.textInput, { marginTop: spacing.sm }]}
        value={contactPhone}
        onChangeText={setContactPhone}
        placeholder="(555) 555-5555"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
      />

      <Text style={[styles.sectionLabelInline, { marginTop: spacing.md }]}>
        Google Maps listing (optional)
      </Text>
      <TextInput
        style={[styles.textInput, { marginTop: spacing.sm }]}
        value={googleMapsUrl}
        onChangeText={setGoogleMapsUrl}
        placeholder="Paste your Google Maps link, if you have one"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      <View style={styles.verificationPhotoRow}>
        <Pressable
          style={styles.verificationPhotoTile}
          onPress={handlePickIdPhoto}
          disabled={uploadingIdPhoto}
        >
          {idPhotoPath ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          ) : (
            <Ionicons name="card-outline" size={22} color={colors.textMuted} />
          )}
          <Text style={styles.verificationPhotoText}>
            {uploadingIdPhoto ? 'Uploading…' : idPhotoPath ? 'ID photo added' : 'Add photo ID'}
          </Text>
        </Pressable>
        <Pressable
          style={styles.verificationPhotoTile}
          onPress={handlePickBusinessPhoto}
          disabled={uploadingBusinessPhoto}
        >
          {businessPhotoPath ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          ) : (
            <Ionicons name="storefront-outline" size={22} color={colors.textMuted} />
          )}
          <Text style={styles.verificationPhotoText}>
            {uploadingBusinessPhoto
              ? 'Uploading…'
              : businessPhotoPath
                ? 'Business photo added'
                : 'Add business photo'}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleCreate}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Submitting…' : 'Submit for review'}</Text>
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
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLabelInline: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
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
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: colors.primary,
  },
  homeBasedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  homeBasedHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
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
  verificationHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  verificationPhotoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  verificationPhotoTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  verificationPhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
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
