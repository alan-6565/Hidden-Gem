import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { pickMediaFromLibrary, uploadVerificationDoc } from '../lib/mediaUpload';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ClaimBusiness'>;

export default function ClaimBusinessScreen({ route, navigation }: Props) {
  const { spotId } = route.params;
  const insets = useSafeAreaInsets();
  const { spots, submitVerification } = useAppData();
  const { user } = useAuth();
  const spot = spots.find((s) => s.id === spotId);

  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [idPhotoPath, setIdPhotoPath] = useState<string | null>(null);
  const [businessPhotoPath, setBusinessPhotoPath] = useState<string | null>(null);
  const [uploadingIdPhoto, setUploadingIdPhoto] = useState(false);
  const [uploadingBusinessPhoto, setUploadingBusinessPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!spot) {
    return (
      <View style={styles.container}>
        <Text>Spot not found.</Text>
      </View>
    );
  }

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

  const handleSubmit = async () => {
    if (!contactEmail.trim()) {
      Alert.alert('Add a contact email', "We'll use this to reach you about your claim.");
      return;
    }
    if (!idPhotoPath || !businessPhotoPath) {
      Alert.alert(
        'Add verification photos',
        'A photo ID and a photo of you at this business are required for review.',
      );
      return;
    }
    setSaving(true);
    try {
      await submitVerification({
        claimType: 'claim_existing',
        existingSpotId: spot.id,
        businessName: spot.name,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        googleMapsUrl: googleMapsUrl.trim() || undefined,
        idPhotoPath,
        businessPhotoPath,
      });
      navigation.replace('VerificationStatus');
    } catch (e: any) {
      Alert.alert("Couldn't submit claim", e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={styles.title}>Claim {spot.name}</Text>
      <Text style={styles.subtitle}>
        We review every claim before handing over the listing — this keeps other people from
        tampering with your business page. You'll hear back once it's approved.
      </Text>

      <Text style={styles.sectionLabel}>Contact email</Text>
      <TextInput
        style={styles.textInput}
        value={contactEmail}
        onChangeText={setContactEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.sectionLabel}>Contact phone (optional)</Text>
      <TextInput
        style={styles.textInput}
        value={contactPhone}
        onChangeText={setContactPhone}
        placeholder="(555) 555-5555"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
      />

      <Text style={styles.sectionLabel}>Google Maps listing (optional)</Text>
      <TextInput
        style={styles.textInput}
        value={googleMapsUrl}
        onChangeText={setGoogleMapsUrl}
        placeholder="Paste your Google Maps link, if you have one"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      <Text style={styles.sectionLabel}>Verification</Text>
      <Text style={styles.verificationHint}>
        A photo ID and a photo of you at this business are required so we can confirm you're
        the owner. These are kept private and only visible to you and our review team.
      </Text>
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
        onPress={handleSubmit}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Submitting…' : 'Submit claim for review'}</Text>
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
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
  verificationHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -4,
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
