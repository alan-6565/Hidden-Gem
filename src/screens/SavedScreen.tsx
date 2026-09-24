import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppData } from '../context/DataContext';
import { CATEGORY_LABELS } from '../constants/categories';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Saved'>;

type SavedTab = 'places' | 'reels' | 'collections';

export default function SavedScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { spots, posts, collections, savedSpotIds, savedPostIds, toggleSaved, toggleSavePost, addCollection } =
    useAppData();
  const [tab, setTab] = useState<SavedTab>('places');
  const [query, setQuery] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  const q = query.trim().toLowerCase();

  const savedSpots = useMemo(
    () =>
      spots
        .filter((s) => savedSpotIds.includes(s.id))
        .filter((s) => !q || s.name.toLowerCase().includes(q)),
    [spots, savedSpotIds, q],
  );

  const savedReels = useMemo(
    () =>
      posts
        .filter((p) => savedPostIds.includes(p.id))
        .filter((p) => !q || p.caption.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q)),
    [posts, savedPostIds, q],
  );

  const filteredCollections = useMemo(
    () => collections.filter((c) => !q || c.name.toLowerCase().includes(q)),
    [collections, q],
  );

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

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search saved items"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.tabs}>
        {(['places', 'reels', 'collections'] as SavedTab[]).map((key) => (
          <Pressable key={key} style={styles.tab} onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {key === 'places' ? 'Places' : key === 'reels' ? 'Reels' : 'Collections'}
            </Text>
            {tab === key && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      {tab === 'places' && (
        <FlatList
          data={savedSpots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {q ? 'No saved places match your search.' : 'Nothing saved yet — go explore Home or the Map.'}
            </Text>
          }
          renderItem={({ item: spot }) => (
            <Pressable
              style={styles.placeRow}
              onPress={() => navigation.navigate('SpotProfile', { spotId: spot.id })}
            >
              <Image source={{ uri: spot.photos[0] }} style={styles.placeThumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.placeName} numberOfLines={1}>
                  {spot.name}
                </Text>
                <Text style={styles.placeMeta} numberOfLines={1}>
                  {CATEGORY_LABELS[spot.category]} ·{' '}
                  {(spot.isHomeBased ? spot.serviceArea : spot.address)?.split(',')[0]}
                </Text>
              </View>
              <Pressable hitSlop={8} onPress={() => toggleSaved(spot.id)}>
                <Ionicons name="heart" size={20} color={colors.primary} />
              </Pressable>
            </Pressable>
          )}
        />
      )}

      {tab === 'reels' && (
        <FlatList
          data={savedReels}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {q ? 'No saved reels match your search.' : "Reels you save show up here — tap the bookmark icon on one."}
            </Text>
          }
          renderItem={({ item: post }) => (
            <Pressable
              style={styles.reelTile}
              onPress={() => navigation.navigate('Tabs', { screen: 'Reels' })}
            >
              {post.isVideo ? (
                <View style={[styles.reelTile, styles.reelVideoPlaceholder]}>
                  <Ionicons name="play" size={22} color="#fff" />
                </View>
              ) : (
                <Image source={{ uri: post.mediaUrl }} style={styles.reelTile} />
              )}
              <Pressable
                style={styles.reelUnsave}
                hitSlop={8}
                onPress={() => toggleSavePost(post.id)}
              >
                <Ionicons name="bookmark" size={14} color="#fff" />
              </Pressable>
            </Pressable>
          )}
        />
      )}

      {tab === 'collections' && (
        <FlatList
          data={filteredCollections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.newCollectionSection}>
              <Pressable
                style={styles.newCollectionButton}
                onPress={() => setShowNewCollection((v) => !v)}
              >
                <Ionicons
                  name={showNewCollection ? 'close' : 'add-circle-outline'}
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.newCollectionButtonText}>
                  {showNewCollection ? 'Cancel' : 'New collection'}
                </Text>
              </Pressable>
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
                    style={[styles.createButton, !newCollectionName.trim() && styles.createButtonDisabled]}
                    onPress={handleCreateCollection}
                    disabled={creatingCollection || !newCollectionName.trim()}
                  >
                    <Text style={styles.createButtonText}>
                      {creatingCollection ? 'Creating...' : 'Create'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !showNewCollection ? (
              <Text style={styles.emptyText}>
                {q ? 'No collections match your search.' : 'No collections yet — tap "New collection" to start one.'}
              </Text>
            ) : null
          }
          renderItem={({ item: col }) => (
            <View style={styles.collectionCard}>
              <Text style={styles.collectionName}>{col.name}</Text>
              {!!col.description && <Text style={styles.collectionDesc}>{col.description}</Text>}
              <Text style={styles.collectionCount}>{col.spotIds.length} spots</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      marginRight: spacing.lg,
      paddingBottom: spacing.sm,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.text,
    },
    tabUnderline: {
      height: 2,
      borderRadius: 1,
      marginTop: spacing.xs,
      backgroundColor: colors.primary,
    },
    listContent: {
      padding: spacing.md,
      flexGrow: 1,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
    placeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    placeThumb: {
      width: 52,
      height: 52,
      borderRadius: radius.sm,
      backgroundColor: colors.cream,
    },
    placeName: {
      fontWeight: '700',
      color: colors.text,
      fontSize: 14,
    },
    placeMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    reelTile: {
      flex: 1 / 3,
      aspectRatio: 9 / 16,
      margin: 1,
      backgroundColor: colors.cream,
      borderRadius: radius.sm,
    },
    reelVideoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dark,
    },
    reelUnsave: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    newCollectionSection: {
      marginBottom: spacing.md,
    },
    newCollectionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
    },
    newCollectionButtonText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 14,
    },
    newCollectionForm: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginTop: spacing.sm,
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
    createButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    createButtonDisabled: { opacity: 0.5 },
    createButtonText: {
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
  });
