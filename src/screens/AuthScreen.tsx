import React, { useState } from 'react';
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
import { colors, radius, spacing } from '../theme';

type Mode = 'sign_in' | 'sign_up';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmailNotice, setCheckEmailNotice] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter an email and password.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'sign_in') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        setCheckEmailNotice(true);
      }
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
        <Text style={styles.subtitle}>
          {mode === 'sign_in' ? 'Welcome back' : 'Create your account'}
        </Text>

        {checkEmailNotice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Check your email to confirm your account, then sign in.
            </Text>
            <Pressable
              style={styles.switchButton}
              onPress={() => {
                setCheckEmailNotice(false);
                setMode('sign_in');
              }}
            >
              <Text style={styles.switchButtonText}>Back to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting
                  ? 'Please wait...'
                  : mode === 'sign_in'
                    ? 'Sign In'
                    : 'Sign Up'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.toggleRow}
              onPress={() => {
                setError(null);
                setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in');
              }}
            >
              <Text style={styles.toggleText}>
                {mode === 'sign_in' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.toggleTextBold}>
                  {mode === 'sign_in' ? 'Sign up' : 'Sign in'}
                </Text>
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    color: '#C0392B',
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
  toggleRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  toggleTextBold: {
    color: colors.primary,
    fontWeight: '700',
  },
  noticeBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  switchButton: {
    marginTop: spacing.md,
  },
  switchButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
