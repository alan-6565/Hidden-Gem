import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// Each provider stays hidden until it's been set up end to end — a button
// that errors on tap is worse than no button. Turn one on in .env once:
//
//   Apple  (EXPO_PUBLIC_APPLE_SIGN_IN=true)
//     1. Apple Developer → Identifiers → your App ID → enable "Sign in with
//        Apple" (EAS does this when it manages credentials).
//     2. Supabase → Authentication → Providers → Apple → enable, and add
//        the bundle id (com.kuppio.app) under Client IDs.
//     3. Rebuild the native app — app.config.js only adds the entitlement
//        when the flag is on.
//
//   Google (EXPO_PUBLIC_GOOGLE_SIGN_IN=true)
//     1. Google Cloud → OAuth client (type "Web application") with
//        https://<project>.supabase.co/auth/v1/callback as a redirect URI.
//     2. Supabase → Authentication → Providers → Google → paste its client
//        id + secret; add kuppio://auth-callback to Redirect URLs.
//
// App Store rule 4.8: if Google sign-in is offered on iOS, Sign in with
// Apple must be offered too — enforced in isGoogleSignInEnabled below.

const APPLE_FLAG = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === 'true';
const GOOGLE_FLAG = process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN === 'true';
const OAUTH_REDIRECT = 'kuppio://auth-callback';

export async function isAppleSignInEnabled(): Promise<boolean> {
  if (!APPLE_FLAG || Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

export async function isGoogleSignInEnabled(): Promise<boolean> {
  if (!GOOGLE_FLAG || Platform.OS === 'web') return false;
  if (Platform.OS === 'ios') return isAppleSignInEnabled();
  return true;
}

// Returns false if the person closed the Apple sheet (not an error).
export async function signInWithApple(): Promise<boolean> {
  // Apple gets the hashed nonce, Supabase the raw one, so a stolen identity
  // token can't be replayed against our project.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  return true;
}

// Returns false if the person closed the browser sheet (not an error).
export async function signInWithGoogle(): Promise<boolean> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: OAUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT);
  if (result.type !== 'success') return false;
  const code = new URL(result.url).searchParams.get('code');
  if (!code) {
    const description = new URL(result.url).searchParams.get('error_description');
    throw new Error(description ?? 'Google sign-in did not complete.');
  }
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return true;
}
