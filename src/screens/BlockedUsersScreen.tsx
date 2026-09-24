import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppData } from '../context/DataContext';
import { fetchProfilesByIds } from '../lib/api';
import Avatar from '../components/Avatar';
import { Profile } from '../types';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme';

// There was previously no way to see or undo a block once made — blocking
// only ever happened one-off from a review/post/comment's report menu. This
// is that missing "manage" screen.
export default function BlockedUsersScreen() {
  const { colors } = useTheme();
  const { blockedUserIds, unblockUser } = useAppData();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (blockedUserIds.length === 0) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    try {
      setProfiles(await fetchProfilesByIds(blockedUserIds));
    } catch {
      // Leave the list as-is; the row still shows by id-derived initial.
    } finally {
      setLoading(false);
    }
  }, [blockedUserIds]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleUnblock = (userId: string, name: string) => {
    Alert.alert(`Unblock ${name}?`, "You'll see their posts, reviews and comments again.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          setUnblockingId(userId);
          try {
            await unblockUser(userId);
          } catch (e: any) {
            Alert.alert("Couldn't unblock", e?.message ?? 'Please try again.');
          } finally {
            setUnblockingId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={blockedUserIds}
        keyExtractor={(id) => id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={[styles.center, styles.emptyState]}>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
              You haven't blocked anyone.
            </Text>
          </View>
        }
        renderItem={({ item: userId }) => {
          const p = profiles.find((pr) => pr.userId === userId);
          const name = p?.username ?? 'Unknown user';
          return (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Avatar uri={p?.avatarUrl} name={name} size={40} />
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                @{name}
              </Text>
              <Pressable
                style={[styles.unblockButton, { borderColor: colors.border }]}
                onPress={() => handleUnblock(userId, name)}
                disabled={unblockingId === userId}
              >
                <Text style={[styles.unblockText, { color: colors.primary }]}>
                  {unblockingId === userId ? '...' : 'Unblock'}
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { flexGrow: 1, padding: spacing.md },
  emptyState: { flex: 1, paddingTop: spacing.xl * 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  name: { flex: 1, fontSize: 14, fontWeight: '700' },
  unblockButton: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  unblockText: { fontSize: 12, fontWeight: '700' },
});
