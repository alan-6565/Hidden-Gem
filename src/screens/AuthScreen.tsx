import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { PRIVACY_URL, TERMS_URL } from '../constants/legal';

type Mode = 'sign_in' | 'sign_up' | 'forgot_password';

export default function AuthScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmailNotice, setCheckEmailNotice] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const goToMode = (next: Mode) => {
    setError(null);
    setMode(next);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter an email and password.');
      return;
    }
    if (mode === 'sign_up' && !agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to sign up.');
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

  const handleSendReset = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(email.trim());
      setResetEmailSent(true);
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
          {mode === 'sign_in' ? 'Welcome back' : mode === 'sign_up' ? 'Create your account' : 'Reset your password'}
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
                goToMode('sign_in');
              }}
            >
              <Text style={styles.switchButtonText}>Back to sign in</Text>
            </Pressable>
          </View>
        ) : mode === 'forgot_password' ? (
          resetEmailSent ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                If an account exists for {email.trim()}, we've sent a link to reset your password.
              </Text>
              <Pressable
                style={styles.switchButton}
                onPress={() => {
                  setResetEmailSent(false);
                  goToMode('sign_in');
                }}
              >
                <Text style={styles.switchButtonText}>Back to sign in</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.helperText}>
                Enter the email on your account and we'll send you a link to set a new password.
              </Text>
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

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSendReset}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Sending...' : 'Send reset link'}
                </Text>
              </Pressable>

              <Pressable style={styles.toggleRow} onPress={() => goToMode('sign_in')}>
                <Text style={styles.toggleText}>
                  Back to <Text style={styles.toggleTextBold}>sign in</Text>
                </Text>
              </Pressable>
            </>
          )
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

            {mode === 'sign_in' && (
              <Pressable style={styles.forgotRow} onPress={() => goToMode('forgot_password')} hitSlop={4}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            )}

            {mode === 'sign_up' && (
              <Pressable
                style={styles.termsRow}
                onPress={() => setAgreedToTerms((v) => !v)}
                hitSlop={4}
              >
                <Ionicons
                  name={agreedToTerms ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={agreedToTerms ? colors.primary : colors.textMuted}
                />
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                    Privacy Policy
                  </Text>
                </Text>
              </Pressable>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[
                styles.submitButton,
                (submitting || (mode === 'sign_up' && !agreedToTerms)) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting || (mode === 'sign_up' && !agreedToTerms)}
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
  helperText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '700',
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
