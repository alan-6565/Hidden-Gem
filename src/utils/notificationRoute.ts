import { AppNotification, NotificationType } from '../types';
import { RootStackParamList } from '../navigation/types';

type Route = {
  [K in keyof RootStackParamList]: undefined extends RootStackParamList[K]
    ? { name: K; params?: RootStackParamList[K] }
    : { name: K; params: RootStackParamList[K] };
}[keyof RootStackParamList];

// Where tapping a notification takes you — shared by the in-app list and
// push notifications so the two can't drift apart. Null means there's
// nowhere more specific than the notifications list itself.
export function notificationRoute(
  type: NotificationType,
  data: AppNotification['data'],
): Route | null {
  switch (type) {
    case 'review_reply':
      return data.spotId ? { name: 'SpotProfile', params: { spotId: data.spotId } } : null;
    case 'order_status':
      return { name: 'Orders', params: { mode: 'mine' } };
    case 'new_order':
      return { name: 'Orders', params: { mode: 'business' } };
    case 'verification_approved':
    case 'verification_rejected':
      return { name: 'VerificationStatus' };
    case 'follow':
      // No public profile screen to open yet.
      return null;
    default:
      return null;
  }
}
