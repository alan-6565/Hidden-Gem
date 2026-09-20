import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { checkIsAdmin } from '../lib/api';
import Avatar from '../components/Avatar';
import { SpotCategory } from '../types';
import FilterChip from '../components/FilterChip';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { TabScreenProps } from '../navigation/types';

type Props = TabScreenProps<'Profile'>;

const SAVED_FILTERS: { key: SpotCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'coffee', label: 'Cafes' },
  { key: 'brunch', label: 'Brunch' },
  { key: 'dessert', label: 'Desserts' },
  { key: 'matcha', label: 'Drinks' },
];

const CATEGORY_LABELS: Record<SpotCategory, string> = {
  coffee: 'Cafe',
  matcha: 'Matcha & Tea',
  dessert: 'Dessert',
  brunch: 'Brunch',
  home_based: 'Home-Based',
  pop_up: 'Pop-Up',
  food_truck: 'Food Truck',
};

export default function ProfileScreen({ navigation }: Props) {
  const { colors, preference, setPreference } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { spots, collections, savedSpotIds, toggleSaved, deleteAccount, addCollection, profile } = useAppData();
  const { user, signOut } = useAuth();
  const [filter, setFilter] = useState<SpotCategory | 'all'>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) return;
    setCreatingCollection(true);
    try {
      await addCollection(name, newCollectionDesc.trim());
      setNewCollectionName('');
      setNewCollectionDesc('');
      setShowNewCollection(false);
    } catch (e: any) {
      Alert.alert("Couldn't create collection", e?.message ?? 'Please try again.');
    } finally {
      setCreatingCollection(false);
    }
  };
  // Never the email prefix — that used to be shown publicly on everything this user posted.
  const displayName = profile?.username ?? 'You';

  useEffect(() => {
    if (!user) return;
    checkIsAdmin(user.id)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [user]);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your reviews, posts, comments, and saved items. Any business you manage will be unclaimed, not deleted. This can\'t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              await signOut();
            } catch (e: any) {
              Alert.alert("Couldn't delete account", e?.message ?? 'Please try again.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const savedSpots = spots
    .filter((s) => savedSpotIds.includes(s.id))
    .filter((s) => filter === 'all' || s.category === filter);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
    >
      <View style={styles.profileHeader}>
        <Avatar uri={profile?.avatarUrl} name={displayName} size={72} style={styles.avatar} />
        <Text style={styles.name}>@{displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Pressable style={styles.signOutButton} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.signOutText}>Edit profile</Text>
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Pressable onPress={handleDeleteAccount} disabled={deleting} hitSlop={8}>
          <Text style={styles.deleteAccountText}>
            {deleting ? 'Deleting…' : 'Delete account'}
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.ordersRow} onPress={() => navigation.navigate('Orders')}>
        <Ionicons name="bag-handle-outline" size={20} color={colors.text} />
        <Text style={styles.ordersRowText}>Orders</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.ordersRow} onPress={() => navigation.navigate('VerificationStatus')}>
        <Ionicons name="document-text-outline" size={20} color={colors.text} />
        <Text style={styles.ordersRowText}>My business applications</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      {isAdmin && (
        <Pressable style={styles.ordersRow} onPress={() => navigation.navigate('AdminReview')}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.text} />
          <Text style={styles.ordersRowText}>Review applications</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Appearance</Text>
      <View style={styles.appearanceRow}>
        {(['system', 'light', 'dark'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.appearancePill, preference === option && styles.appearancePillActive]}
            onPress={() => setPreference(option)}
          >
            <Text
              style={[
                styles.appearancePillText,
                preference === option && styles.appearancePillTextActive,
              ]}
            >
              {option === 'system' ? 'System' : option === 'light' ? 'Light' : 'Dark'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>Your Collections</Text>
        <Pressable hitSlop={8} onPress={() => setShowNewCollection((v) => !v)}>
          <Ionicons
            name={showNewCollection ? 'close' : 'add-circle-outline'}
            size={22}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {showNewCollection && (
        <View style={styles.newCollectionForm}>
          <TextInput
            style={styles.newCollectionInput}
            placeholder="Collection name"
            placeholderTextColor={colors.textMuted}
            value={newCollectionName}
            onChangeText={setNewCollectionName}
          />
          <TextInput
            style={styles.newCollectionInput}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textMuted}
            value={newCollectionDesc}
            onChangeText={setNewCollectionDesc}
          />
          <Pressable
            style={[styles.createCollectionButton, !newCollectionName.trim() && styles.buttonDisabled]}
            onPress={handleCreateCollection}
            disabled={creatingCollection || !newCollectionName.trim()}
          >
            <Text style={styles.createCollectionButtonText}>
              {creatingCollection ? 'Creating...' : 'Create'}
            </Text>
          </Pressable>
        </View>
      )}

      {collections.length === 0 && !showNewCollection && (
        <Text style={styles.textMuted}>No collections yet — tap + to create one.</Text>
      )}
      {collections.map((col) => (
        <View key={col.id} style={styles.collectionCard}>
          <Text style={styles.collectionName}>{col.name}</Text>
          <Text style={styles.collectionDesc}>{col.description}</Text>
          <Text style={styles.collectionCount}>{col.spotIds.length} spots</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Saved</Text>
      <FlatList
        data={SAVED_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <FilterChip
            label={item.label}
            active={filter === item.key}
            onPress={() => setFilter(item.key)}
          />
        )}
      />

      {savedSpots.length === 0 && (
        <Text style={styles.textMuted}>Nothing saved yet — go explore Home or the Map.</Text>
      )}
      {savedSpots.map((spot) => (
        <Pressable
          key={spot.id}
          style={styles.savedRow}
          onPress={() => navigation.navigate('SpotProfile', { spotId: spot.id })}
        >
          <Image source={{ uri: spot.photos[0] }} style={styles.savedThumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.savedName}>{spot.name}</Text>
            <Text style={styles.savedMeta}>
              {CATEGORY_LABELS[spot.category]} ·{' '}
              {(spot.isHomeBased ? spot.serviceArea : spot.address)?.split(',')[0]}
            </Text>
          </View>
          <Pressable hitSlop={8} onPress={() => toggleSaved(spot.id)}>
            <Ionicons name="heart" size={20} color={colors.primary} />
          </Pressable>
        </Pressable>
      ))}
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
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  email: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  signOutButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteAccountText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  ordersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  ordersRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  appearanceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  appearancePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appearancePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  appearancePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  appearancePillTextActive: {
    color: '#fff',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  sectionTitleInline: {
    marginTop: 0,
    marginBottom: 0,
  },
  newCollectionForm: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  newCollectionInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 13,
    color: colors.text,
  },
  createCollectionButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createCollectionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  collectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  collectionName: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  collectionDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  collectionCount: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  filterRow: {
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  textMuted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  savedThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },
  savedName: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
  savedMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
