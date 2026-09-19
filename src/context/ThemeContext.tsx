import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, ThemeColors } from '../theme';

type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedScheme = 'light' | 'dark';

const STORAGE_KEY = 'kuppio_theme_preference';

interface ThemeContextValue {
  scheme: ResolvedScheme;
  colors: ThemeColors;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const osScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  // Withhold the first paint until the persisted preference loads — otherwise a
  // stored 'light'/'dark' override briefly renders as the OS scheme instead,
  // flashing the wrong theme on every cold start.
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .finally(() => setPreferenceLoaded(true));
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const scheme: ResolvedScheme = useMemo(() => {
    if (preference === 'light' || preference === 'dark') return preference;
    return osScheme === 'light' ? 'light' : 'dark';
  }, [preference, osScheme]);

  const colors = scheme === 'dark' ? darkColors : lightColors;

  if (!preferenceLoaded) return null;

  return (
    <ThemeContext.Provider value={{ scheme, colors, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
