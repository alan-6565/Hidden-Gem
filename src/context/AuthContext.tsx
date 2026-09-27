import React, { createContext, useContext, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { MOCK_MODE, mockSession } from '../lib/mockData';
import { unregisterForPushNotifications } from '../lib/pushNotifications';

// Deep link the "reset password" email points at (see
// resetPasswordForEmail below). Requires two things done outside this repo:
//   1. `scheme: "kuppio"` in app.json (already set) needs a native rebuild
//      (`npx expo prebuild`) to actually register with iOS/Android.
//   2. This exact URL added to Supabase Dashboard → Authentication → URL
//      Configuration → Redirect URLs — Supabase silently ignores an
//      unrecognized redirectTo and falls back to the project's default Site
//      URL instead, so the email link won't reopen the app until this is done.
const RESET_PASSWORD_URL = 'kuppio://reset-password';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  initializing: boolean;
  // True from the moment a password-recovery link is opened until
  // updatePassword() succeeds — App.tsx shows the "set a new password"
  // screen for the whole window, even though exchanging the link's code
  // already creates a real session underneath.
  recoveryMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    // Offline preview mode while Supabase project is paused (see .env EXPO_PUBLIC_MOCK_MODE).
    if (MOCK_MODE) {
      setSession(mockSession);
      setInitializing(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      // Lets "Cancel" on the reset screen back out cleanly, instead of being
      // stuck there forever with no session and no way to leave.
      if (event === 'SIGNED_OUT') setRecoveryMode(false);
      setSession(newSession);
    });

    // A password-reset link opens the app via RESET_PASSWORD_URL with a
    // one-time `?code=...` from Supabase. exchangeCodeForSession trades that
    // for a real session, which fires the PASSWORD_RECOVERY event above.
    // Every other deep link (there are none yet) is ignored.
    const handleUrl = (url: string) => {
      if (!url.includes('reset-password')) return;
      supabase.auth.exchangeCodeForSession(url).catch((e) => {
        console.warn('Could not open password reset link:', e?.message);
      });
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const urlListener = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      listener.subscription.unsubscribe();
      urlListener.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (MOCK_MODE) {
      setSession(mockSession);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    if (MOCK_MODE) {
      setSession(mockSession);
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (MOCK_MODE) {
      setSession(null);
      return;
    }
    // Before signing out — it needs this account's session to delete the token.
    await unregisterForPushNotifications();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const sendPasswordReset = async (email: string) => {
    if (MOCK_MODE) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_PASSWORD_URL,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    if (MOCK_MODE) {
      setRecoveryMode(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setRecoveryMode(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        initializing,
        recoveryMode,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
