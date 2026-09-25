import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useAppData } from '../context/DataContext';
import { registerForPushNotifications, setAppBadgeCount } from '../lib/pushNotifications';
import { RootStackParamList } from '../navigation/types';
import { AppNotification, NotificationType } from '../types';
import { notificationRoute } from './notificationRoute';

type NavRef = NavigationContainerRefWithCurrent<RootStackParamList>;

// Mounted once the signed-in app has loaded. Registers the device, opens the
// right screen when a push is tapped (including the one that launched the
// app), refreshes the in-app list when a push arrives while it's open, and
// keeps the home-screen badge in sync with unread notifications.
export function usePushNotifications(navigationRef: NavRef) {
  const { refreshNotifications, markNotificationRead, unreadNotificationCount } = useAppData();
  const handledResponseIds = useRef(new Set<string>());

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    setAppBadgeCount(unreadNotificationCount);
  }, [unreadNotificationCount]);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handledResponseIds.current.has(id)) return;
      handledResponseIds.current.add(id);

      const data = (response.notification.request.content.data ?? {}) as AppNotification['data'] & {
        type?: NotificationType;
        notificationId?: string;
      };
      if (data.notificationId) markNotificationRead(data.notificationId);
      refreshNotifications();

      const route = data.type ? notificationRoute(data.type, data) : null;
      const go = () => {
        if (!navigationRef.isReady()) return false;
        if (route) navigationRef.navigate(route.name as any, route.params as any);
        else navigationRef.navigate('Notifications');
        return true;
      };
      // On a cold start the navigator may mount a beat after this runs.
      if (!go()) setTimeout(go, 500);
    };

    const last = Notifications.getLastNotificationResponse();
    if (last) open(last);

    const responseSub = Notifications.addNotificationResponseReceivedListener(open);
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      refreshNotifications();
    });
    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, [navigationRef, markNotificationRead, refreshNotifications]);
}
