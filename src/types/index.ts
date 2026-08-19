export type SpotCategory =
  | 'coffee'
  | 'matcha'
  | 'dessert'
  | 'brunch'
  | 'home_based'
  | 'pop_up'
  | 'food_truck';

export type VibeTag = 'worth_the_hype' | 'hidden_gem' | 'overpriced' | 'skip_it';

export type PriceRange = '$' | '$$' | '$$$';

export interface OpenHours {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  open: string;
  close: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  isPopular?: boolean;
  photo?: string;
}

export interface Spot {
  id: string;
  name: string;
  category: SpotCategory;
  tags: string[];
  isHomeBased: boolean;
  lat: number;
  lng: number;
  address?: string;
  serviceArea?: string;
  priceRange: PriceRange;
  description?: string;
  photos: string[];
  hours: OpenHours[];
  menu: MenuItem[];
  teaScore: number;
  worthTheHypeVotes: number;
  hiddenGemVotes: number;
}

export interface Review {
  id: string;
  spotId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  ratingOverall: number;
  ratingTaste: number;
  ratingValue: number;
  ratingVibe: number;
  vibeTag: VibeTag;
  text: string;
  photo?: string;
  likeCount: number;
  createdAt: string;
}

export type PostAuthorType = 'customer' | 'owner';

export interface Post {
  id: string;
  spotId: string | null;
  authorType: PostAuthorType;
  authorName: string;
  authorAvatar: string;
  mediaUrl: string;
  isVideo: boolean;
  caption: string;
  soundLabel?: string;
  exploreTags: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  spotIds: string[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  savedSpotIds: string[];
  collectionIds: string[];
}
