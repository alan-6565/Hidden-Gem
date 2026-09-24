import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';

// Shown whenever AuthContext's recoveryMode is true — the app opened via a
// password-reset email link. Takes priority over the normal signed-in app
// even though exchanging that link's code already created a real session.
export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      // No further navigation needed — App.tsx re-renders as soon as
      // recoveryMode clears, and the exchanged link already left a real
      // session in place, so the user lands straight in the app signed in.
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
        <Text style={styles.logo}>Kuppio</Text>
        <Text style={styles.subtitle}>Set a new password</Text>
        <Text style={styles.helper}>Choose a new password for your account.</Text>

        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Saving...' : 'Save new password'}
          </Text>
        </Pressable>

        <Pressable style={styles.cancelRow} onPress={() => signOut()}>
          <Text style={styles.cancelText}>Cancel and sign in another way</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    logo: {
      fontSize: 30,
      fontWeight: '800',
      fontStyle: 'italic',
      color: colors.primary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    helper: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
    cancelRow: {
      marginTop: spacing.lg,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '600',
    },
  });
