import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from '../components/Avatar';
import { USERNAME_PATTERN } from '../lib/api';
import { pickMediaFromLibrary, uploadMedia } from '../lib/mediaUpload';
import { radius, spacing, ThemeColors } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useAppData();
  const { user } = useAuth();

  const [username, setUsername] = useState(profile?.username ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl ?? null);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cleanUsername = username.trim().toLowerCase();
  const usernameValid = USERNAME_PATTERN.test(cleanUsername);
  const changed =
    cleanUsername !== (profile?.username ?? '') ||
    avatarUrl !== (profile?.avatarUrl ?? null) ||
    bio.trim() !== (profile?.bio ?? '') ||
    location.trim() !== (profile?.location ?? '');

  const handleChangePhoto = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const picked = await pickMediaFromLibrary({ allowVideos: false });
      if (!picked) return;
      setAvatarUrl(await uploadMedia(user.id, picked));
    } catch (e: any) {
      Alert.alert("Couldn't add photo", e?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!usernameValid) {
      Alert.alert(
        'Check your username',
        'Use 3–20 characters: lowercase letters, numbers, "." and "_".',
      );
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        username: cleanUsername !== profile?.username ? cleanUsername : undefined,
        avatarUrl: avatarUrl !== (profile?.avatarUrl ?? null) ? avatarUrl : undefined,
        bio: bio.trim() !== (profile?.bio ?? '') ? bio.trim() || null : undefined,
        location: location.trim() !== (profile?.location ?? '') ? location.trim() || null : undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Couldn't save your profile", e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.notReady}>
          Your profile isn't set up yet. Restart the app and try again.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarBlock}>
          <Avatar uri={avatarUrl} name={cleanUsername || profile.username} size={96} />
          <View style={styles.avatarActions}>
            <Pressable onPress={handleChangePhoto} disabled={uploading} hitSlop={8}>
              {uploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.linkText}>{avatarUrl ? 'Change photo' : 'Add a photo'}</Text>
              )}
            </Pressable>
            {avatarUrl && !uploading && (
              <Pressable onPress={() => setAvatarUrl(null)} hitSlop={8}>
                <Text style={styles.linkMuted}>Remove</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.label}>Username</Text>
        <View style={[styles.inputRow, !usernameValid && cleanUsername.length > 0 && styles.inputInvalid]}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            placeholder="yourname"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <Text style={styles.hint}>
          This is the name shown on your reviews, posts and comments — not your email. 3–20
          characters: lowercase letters, numbers, "." and "_".
        </Text>

        <Text style={[styles.label, styles.labelSpaced]}>Bio</Text>
        <TextInput
          style={[styles.textField, styles.bioField]}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={150}
          placeholder="Finding hidden gems around the Bay Area"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>{bio.length}/150</Text>

        <Text style={[styles.label, styles.labelSpaced]}>Location</Text>
        <TextInput
          style={styles.textField}
          value={location}
          onChangeText={setLocation}
          maxLength={60}
          placeholder="Richmond, CA"
          placeholderTextColor={colors.textMuted}
        />

        <Pressable
          style={[styles.saveButton, (!changed || !usernameValid || saving) && styles.saveDisabled]}
          onPress={handleSave}
          disabled={!changed || !usernameValid || saving}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md },
    notReady: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
    avatarBlock: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
    avatarActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, height: 24, alignItems: 'center' },
    linkText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    linkMuted: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
    label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
    labelSpaced: { marginTop: spacing.lg },
    textField: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.text,
    },
    bioField: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
    },
    inputInvalid: { borderColor: colors.danger },
    atSign: { color: colors.textMuted, fontSize: 15, marginRight: 2 },
    input: { flex: 1, paddingVertical: spacing.md, fontSize: 15, color: colors.text },
    hint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 17 },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    saveDisabled: { opacity: 0.5 },
    saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
