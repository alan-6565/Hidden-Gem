import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Tabs: undefined;
  SpotProfile: { spotId: string };
  AddReview: { spotId: string };
  SearchFilters: undefined;
  CreatePost: undefined;
};

export type TabParamList = {
  Home: undefined;
  Map: undefined;
  Post: undefined;
  Reels: { exploreTag?: string } | undefined;
  Profile: undefined;
};

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
