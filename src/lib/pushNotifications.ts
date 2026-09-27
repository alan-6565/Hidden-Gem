import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { supabase } from './supabase';
import { MOCK_MODE } from './mockData';

// The pushes themselves are sent by the database (see
// supabase/migrations/015_push_notifications.sql) whenever a notification
// row is created — this file only registers the device and shows them.

// No push in the web build or in Expo Go — and Expo Go on Android throws
// the moment expo-notifications is even imported (push was removed from it
// in SDK 53), so the module is only loaded where push can actually work.
const PUSH_SUPPORTED = Platform.OS !== 'web' && !isRunningInExpoGo();

export const Notifications: typeof NotificationsModule | null = PUSH_SUPPORTED
  ? require('expo-notifications')
  : null;

// Show pushes as a banner even while the app is open; the in-app bell badge
// alone is easy to miss for a new order.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let registeredToken: string | null = null;

function easProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

// Asks for permission (once — iOS won't re-prompt after a "Don't Allow") and
// saves this device's Expo push token to the signed-in account. Never
// throws: a device without push is still a perfectly usable app.
export async function registerForPushNotifications(): Promise<void> {
  if (MOCK_MODE || !Notifications) return;
  try {
    const projectId = easProjectId();
    if (!projectId) {
      // Expo push tokens are issued per EAS project — run `npx eas init`.
      console.warn('Push notifications disabled: no EAS projectId in app.json.');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Orders & activity',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc('register_push_token', {
      token_param: token,
      platform_param: Platform.OS,
    });
    if (error) throw error;
    registeredToken = token;
  } catch (e: any) {
    console.warn('Could not register for push notifications:', e?.message);
  }
}

// Must run while still signed in — the RPC only deletes your own token.
export async function unregisterForPushNotifications(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  try {
    await supabase.rpc('unregister_push_token', { token_param: token });
  } catch (e: any) {
    console.warn('Could not unregister push token:', e?.message);
  }
}

export async function setAppBadgeCount(count: number): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Badge support varies by platform/launcher; not worth surfacing.
  }
}
