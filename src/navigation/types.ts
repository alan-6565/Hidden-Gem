import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Tabs: undefined;
  SpotProfile: { spotId: string };
  AddReview: { spotId: string };
  Compose: { isStory?: boolean } | undefined;
  SearchFilters: undefined;
  BusinessEdit: { spotId: string };
  CreateBusiness: { lat: number; lng: number };
  ClaimBusiness: { spotId: string };
  VerificationStatus: undefined;
  AdminReview: undefined;
  Order: { spotId: string };
  Orders: { mode?: 'mine' | 'business' } | undefined;
  EditProfile: undefined;
  Notifications: undefined;
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
