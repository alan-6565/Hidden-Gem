import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  Theme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { RootStackParamList } from './src/navigation/types';
import AuthScreen from './src/screens/AuthScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider, useAppData } from './src/context/DataContext';
import { SearchFilterProvider } from './src/context/SearchFilterContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { spacing, ThemeColors } from './src/theme';
import { usePushNotifications } from './src/utils/usePushNotifications';

// Lets push-notification taps navigate from outside any screen.
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function PushNotifications() {
  usePushNotifications(navigationRef);
  return null;
}

function LoadedApp() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { loading, error, refresh } = useAppData();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load Kuppio</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <RootNavigator />
      <PushNotifications />
    </>
  );
}

function AppContent() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { session, initializing, recoveryMode } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Takes priority over the signed-in app below even once a session exists —
  // opening the app via a password-reset link creates one as a side effect
  // of exchanging the link's code, but the user still needs to set a new
  // password before going anywhere else.
  if (recoveryMode) {
    return <ResetPasswordScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <DataProvider>
      <SearchFilterProvider>
        <LoadedApp />
      </SearchFilterProvider>
    </DataProvider>
  );
}

function ThemedNavigation() {
  const { scheme, colors } = useTheme();

  const navigationTheme: Theme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
      },
    };
  }, [scheme, colors]);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <AppContent />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedNavigation />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: spacing.xl,
    },
    errorTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    retryButton: {
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
    },
    retryText: {
      color: '#fff',
      fontWeight: '700',
    },
  });
