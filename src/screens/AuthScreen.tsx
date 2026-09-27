import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { radius, spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { PRIVACY_URL, TERMS_URL } from '../constants/legal';
import { isUsernameAvailable, USERNAME_PATTERN } from '../lib/api';
import {
  isAppleSignInEnabled,
  isGoogleSignInEnabled,
  signInWithApple,
  signInWithGoogle,
} from '../lib/socialAuth';

type Mode = 'welcome' | 'sign_in' | 'sign_up' | 'forgot_password';
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const MIN_PASSWORD = 8;

const PHOTOS = {
  matcha: require('../../assets/auth/welcome-matcha.jpg'),
  croissant: require('../../assets/auth/welcome-croissant.jpg'),
  cafe: require('../../assets/auth/welcome-cafe.jpg'),
  icedLatte: require('../../assets/auth/welcome-iced-latte.jpg'),
  hero: require('../../assets/auth/signin-hero.jpg'),
};

export default function AuthScreen() {
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { signIn, signUp, sendPasswordReset } = useAuth();

  const [mode, setMode] = useState<Mode>('welcome');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmailNotice, setCheckEmailNotice] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [appleEnabled, setAppleEnabled] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    isAppleSignInEnabled().then(setAppleEnabled);
    isGoogleSignInEnabled().then(setGoogleEnabled);
  }, []);

  // Debounced so we don't hit the database on every keystroke.
  useEffect(() => {
    if (mode !== 'sign_up' || !username) {
      setUsernameStatus('idle');
      return;
    }
    if (!USERNAME_PATTERN.test(username)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      isUsernameAvailable(username)
        .then((ok) => !cancelled && setUsernameStatus(ok ? 'available' : 'taken'))
        // Don't block sign-up on a failed check — the server falls back to a
        // random handle if the name turns out to be taken.
        .catch(() => !cancelled && setUsernameStatus('idle'));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, mode]);

  const goToMode = (next: Mode) => {
    setError(null);
    setShowPassword(false);
    setMode(next);
  };

  const handleSubmit = async () => {
    setError(null);
    if (mode === 'sign_up') {
      if (!USERNAME_PATTERN.test(username)) {
        setError('Pick a username: 3–20 letters, numbers, _ or .');
        return;
      }
      if (usernameStatus === 'taken') {
        setError('That username is taken — try another.');
        return;
      }
    }
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (mode === 'sign_up' && password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'sign_in') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, username);
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

  const handleSocial = async (provider: 'apple' | 'google') => {
    setError(null);
    try {
      await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
      // On success the auth listener swaps this screen out for the app.
    } catch (e: any) {
      setError(e?.message ?? 'Sign-in failed. Please try again.');
    }
  };

  const socialButtons =
    appleEnabled || googleEnabled ? (
      <>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>
        {appleEnabled && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              scheme === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
            }
            cornerRadius={radius.md}
            style={styles.appleButton}
            onPress={() => handleSocial('apple')}
          />
        )}
        {googleEnabled && (
          <Pressable style={styles.socialButton} onPress={() => handleSocial('google')}>
            <Ionicons name="logo-google" size={18} color={colors.text} />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </Pressable>
        )}
      </>
    ) : null;

  const errorText = error ? <Text style={styles.errorText}>{error}</Text> : null;

  const primaryButton = (label: string, busyLabel: string, onPress: () => void) => (
    <Pressable
      style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
      onPress={onPress}
      disabled={submitting}
    >
      <Text style={styles.primaryButtonText}>{submitting ? busyLabel : label}</Text>
    </Pressable>
  );

  // ── Welcome ──────────────────────────────────────────────────────────
  if (mode === 'welcome') {
    const collageHeight = Math.round(height * 0.56);
    const colWidth = (width - 6) / 2;
    return (
      <View style={styles.container}>
        <View style={{ height: collageHeight, flexDirection: 'row', gap: 6 }}>
          <View style={{ width: colWidth, gap: 6 }}>
            <Image source={PHOTOS.matcha} style={{ width: colWidth, height: collageHeight * 0.4 }} />
            <Image source={PHOTOS.cafe} style={{ width: colWidth, flex: 1 }} />
          </View>
          <View style={{ width: colWidth, gap: 6 }}>
            <Image source={PHOTOS.croissant} style={{ width: colWidth, height: collageHeight * 0.55 }} />
            <Image source={PHOTOS.icedLatte} style={{ width: colWidth, flex: 1 }} />
          </View>
          <LinearGradient
            colors={['transparent', colors.background]}
            style={[styles.fade, { height: collageHeight * 0.35 }]}
            pointerEvents="none"
          />
        </View>

        <View style={[styles.welcomeBody, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.logo}>Kuppio</Text>
          <Text style={styles.welcomeTitle}>Find your next{'\n'}favorite spot.</Text>
          <Text style={styles.subtitle}>Discover cafés, delis, pop-ups and home kitchens near you.</Text>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.primaryButton} onPress={() => goToMode('sign_up')}>
            <Text style={styles.primaryButtonText}>Get started</Text>
          </Pressable>
          <Pressable style={styles.secondaryLink} onPress={() => goToMode('sign_in')} hitSlop={8}>
            <Text style={styles.secondaryLinkText}>I already have an account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Everything else scrolls, so the keyboard never hides the button ──
  const header =
    mode === 'sign_in' ? (
      <>
        <View style={styles.heroWrap}>
          <Image source={PHOTOS.hero} style={styles.hero} />
          <LinearGradient colors={['transparent', colors.background]} style={styles.heroFade} pointerEvents="none" />
          <Pressable
            style={[styles.backButton, { top: insets.top + spacing.xs }]}
            onPress={() => goToMode('welcome')}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
        </View>
        <Text style={styles.logo}>Kuppio</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to keep discovering local favorites.</Text>
      </>
    ) : (
      <View style={{ paddingTop: insets.top + spacing.sm }}>
        <Pressable style={styles.backPlain} onPress={() => goToMode(mode === 'sign_up' ? 'welcome' : 'sign_in')} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Ionicons name="cafe" size={40} color={colors.primary} style={styles.cupIcon} />
        <Text style={styles.logo}>Kuppio</Text>
        <Text style={styles.title}>{mode === 'sign_up' ? 'Create your account' : 'Reset your password'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'sign_up'
            ? 'Save places, follow creators and support local food.'
            : "Enter the email on your account and we'll send you a link to set a new password."}
        </Text>
      </View>
    );

  const notice = (icon: keyof typeof Ionicons.glyphMap, title: string, body: string, onBack: () => void) => (
    <View style={styles.noticeBox}>
      <Ionicons name={icon} size={36} color={colors.primary} />
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeText}>{body}</Text>
      <Pressable style={[styles.primaryButton, styles.noticeButton]} onPress={onBack}>
        <Text style={styles.primaryButtonText}>Back to sign in</Text>
      </Pressable>
    </View>
  );

  let body: React.ReactNode;
  if (checkEmailNotice) {
    body = notice('mail-unread-outline', 'Check your email', `We sent a confirmation link to ${email.trim()}. Tap it, then sign in.`, () => {
      setCheckEmailNotice(false);
      goToMode('sign_in');
    });
  } else if (mode === 'forgot_password') {
    body = resetEmailSent
      ? notice('mail-outline', 'Check your email', `If an account exists for ${email.trim()}, we've sent a link to reset your password.`, () => {
          setResetEmailSent(false);
          goToMode('sign_in');
        })
      : (
        <>
          <Field
            label="Email"
            icon="mail-outline"
            placeholder="you@domain.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            styles={styles}
            colors={colors}
          />
          {errorText}
          {primaryButton('Send reset link', 'Sending…', handleSendReset)}
        </>
      );
  } else {
    const isSignUp = mode === 'sign_up';
    body = (
      <>
        {isSignUp && (
          <>
            <Field
              label="Username"
              icon="person-outline"
              placeholder="yourname"
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              maxLength={20}
              styles={styles}
              colors={colors}
              right={
                usernameStatus === 'checking' ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : usernameStatus === 'available' ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                ) : null
              }
            />
            <Text style={[styles.helper, (usernameStatus === 'taken' || usernameStatus === 'invalid') && styles.helperError]}>
              {usernameStatus === 'taken'
                ? `@${username} is taken`
                : usernameStatus === 'invalid'
                  ? '3–20 characters: letters, numbers, _ or .'
                  : usernameStatus === 'available'
                    ? `@${username} is available`
                    : 'This is how people will see you on Kuppio.'}
            </Text>
          </>
        )}
        <Field
          label="Email"
          icon="mail-outline"
          placeholder="you@domain.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          styles={styles}
          colors={colors}
        />
        <Field
          label="Password"
          icon="lock-closed-outline"
          placeholder={isSignUp ? 'Create a password' : 'Your password'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          textContentType={isSignUp ? 'newPassword' : 'password'}
          styles={styles}
          colors={colors}
          right={
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          }
        />
        {isSignUp ? (
          <Text style={styles.helper}>{MIN_PASSWORD}+ characters</Text>
        ) : (
          <Pressable style={styles.forgotRow} onPress={() => goToMode('forgot_password')} hitSlop={6}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        )}

        {errorText}
        {isSignUp
          ? primaryButton('Create account', 'Creating account…', handleSubmit)
          : primaryButton('Sign in', 'Signing in…', handleSubmit)}

        {socialButtons}

        {isSignUp && (
          <Text style={styles.legalText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
              Privacy Policy
            </Text>
            .
          </Text>
        )}

        <Pressable style={styles.switchRow} onPress={() => goToMode(isSignUp ? 'sign_in' : 'sign_up')} hitSlop={6}>
          <Text style={styles.switchText}>
            {isSignUp ? 'Already have an account? ' : 'New to Kuppio? '}
            <Text style={styles.link}>{isSignUp ? 'Sign in' : 'Create account'}</Text>
          </Text>
        </Pressable>
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {header}
        <View style={styles.form}>{body}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}

function Field({ label, icon, right, styles, colors, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        <Ionicons name={icon} size={20} color={colors.textMuted} />
        <TextInput style={styles.fieldInput} placeholderTextColor={colors.textMuted} {...inputProps} />
        {right}
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    fade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    welcomeBody: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      marginTop: -spacing.lg,
    },
    logo: {
      fontSize: 36,
      fontWeight: '800',
      fontStyle: 'italic',
      color: colors.primary,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    welcomeTitle: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.xs,
      letterSpacing: -0.5,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.xs,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 22,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    scrollContent: {
      flexGrow: 1,
    },
    heroWrap: {
      height: 250,
      marginBottom: spacing.sm,
    },
    hero: {
      width: '100%',
      height: '100%',
    },
    heroFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 90,
    },
    backButton: {
      position: 'absolute',
      left: spacing.md,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backPlain: {
      marginLeft: spacing.md,
      alignSelf: 'flex-start',
    },
    cupIcon: {
      alignSelf: 'center',
      marginTop: spacing.sm,
    },
    form: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    field: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      marginBottom: spacing.sm,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    fieldInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: spacing.sm,
    },
    helper: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: -spacing.xs,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    helperError: {
      color: colors.danger,
    },
    forgotRow: {
      alignSelf: 'flex-end',
      marginBottom: spacing.sm,
    },
    forgotText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      height: 54,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xs,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '700',
    },
    secondaryLink: {
      paddingVertical: spacing.md,
    },
    secondaryLinkText: {
      fontSize: 16,
      color: colors.textMuted,
      fontWeight: '500',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.textMuted,
      opacity: 0.5,
    },
    dividerText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    appleButton: {
      height: 52,
      marginBottom: spacing.sm,
    },
    socialButton: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      marginBottom: spacing.sm,
    },
    socialButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    legalText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    link: {
      color: colors.primary,
      fontWeight: '600',
    },
    switchRow: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      marginTop: spacing.xs,
    },
    switchText: {
      fontSize: 15,
      color: colors.textMuted,
    },
    noticeBox: {
      alignItems: 'center',
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    noticeTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    noticeText: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.textMuted,
      textAlign: 'center',
    },
    noticeButton: {
      marginTop: spacing.md,
    },
  });
