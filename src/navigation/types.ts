import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  // preview: show the owner's unpublished draft design (Customize storefront).
  SpotProfile: { spotId: string; preview?: boolean };
  AddReview: { spotId: string };
  Compose: { isStory?: boolean; spotId?: string } | undefined;
  SearchFilters: undefined;
  BusinessEdit: { spotId: string };
  BusinessHub: { spotId: string };
  CustomizeStorefront: { spotId: string };
  CreateBusiness: { lat: number; lng: number };
  ClaimBusiness: { spotId: string };
  VerificationStatus: undefined;
  AdminReview: undefined;
  AdminReports: undefined;
  Order: { spotId: string };
  Orders: { mode?: 'mine' | 'business' } | undefined;
  EditProfile: undefined;
  Notifications: undefined;
  Settings: undefined;
  Saved: undefined;
  BlockedUsers: undefined;
};

export type TabParamList = {
  Home: undefined;
  Map: { startAddingBusiness?: boolean } | undefined;
  Post: undefined;
  Reels: { exploreTag?: string } | undefined;
  Profile: undefined;
};

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
