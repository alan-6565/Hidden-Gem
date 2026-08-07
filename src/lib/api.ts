import { supabase } from './supabase';
import { Collection, MenuItem, OpenHours, Post, Review, Spot, VibeTag } from '../types';

function mapSpot(row: any): Spot {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tags: row.tags ?? [],
    isHomeBased: row.is_home_based,
    lat: row.lat,
    lng: row.lng,
    address: row.address ?? undefined,
    serviceArea: row.service_area ?? undefined,
    priceRange: row.price_range,
    description: row.description ?? undefined,
    photos: row.photos ?? [],
    hours: (row.hours ?? []) as OpenHours[],
    menu: (row.menu ?? []) as MenuItem[],
    teaScore: row.tea_score,
    worthTheHypeVotes: row.worth_the_hype_votes,
    hiddenGemVotes: row.hidden_gem_votes,
  };
}

function mapReview(row: any): Review {
  return {
    id: row.id,
    spotId: row.spot_id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar ?? '',
    ratingOverall: Number(row.rating_overall),
    ratingTaste: Number(row.rating_taste),
    ratingValue: Number(row.rating_value),
    ratingVibe: Number(row.rating_vibe),
    vibeTag: row.vibe_tag as VibeTag,
    text: row.body,
    photo: row.photo ?? undefined,
    likeCount: row.like_count,
    createdAt: row.created_at,
  };
}

function mapPost(row: any): Post {
  return {
    id: row.id,
    spotId: row.spot_id ?? null,
    authorType: row.author_type,
    authorName: row.author_name,
    authorAvatar: row.author_avatar ?? '',
    mediaUrl: row.media_url,
    isVideo: row.is_video,
    caption: row.caption ?? '',
    soundLabel: row.sound_label ?? undefined,
    exploreTags: row.explore_tags ?? [],
    likeCount: row.like_count,
    commentCount: row.comment_count,
    shareCount: row.share_count,
    createdAt: row.created_at,
  };
}

export async function fetchSpots(): Promise<Spot[]> {
  const { data, error } = await supabase.from('spots').select('*').order('tea_score', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSpot);
}

export async function fetchReviews(): Promise<Review[]> {
  const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReview);
}

export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPost);
}

export async function fetchCollections(userId: string): Promise<Collection[]> {
  const { data: collectionsData, error: collectionsError } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId);
  if (collectionsError) throw collectionsError;

  const { data: linksData, error: linksError } = await supabase
    .from('collection_spots')
    .select('collection_id, spot_id');
  if (linksError) throw linksError;

  return (collectionsData ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    spotIds: (linksData ?? [])
      .filter((link) => link.collection_id === row.id)
      .map((link) => link.spot_id),
  }));
}

export async function fetchSavedSpotIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_spots')
    .select('spot_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.spot_id);
}

export async function setSpotSaved(userId: string, spotId: string, saved: boolean): Promise<void> {
  if (saved) {
    const { error } = await supabase
      .from('saved_spots')
      .upsert({ user_id: userId, spot_id: spotId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('saved_spots')
      .delete()
      .eq('user_id', userId)
      .eq('spot_id', spotId);
    if (error) throw error;
  }
}

export interface NewReviewInput {
  spotId: string;
  ratingTaste: number;
  ratingValue: number;
  ratingVibe: number;
  vibeTag: VibeTag;
  text: string;
  photo?: string;
}

export async function insertReview(
  userId: string,
  userName: string,
  userAvatar: string,
  input: NewReviewInput,
): Promise<Review> {
  const ratingOverall = Math.round((input.ratingTaste + input.ratingValue + input.ratingVibe) / 3);
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      spot_id: input.spotId,
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      rating_overall: ratingOverall,
      rating_taste: input.ratingTaste,
      rating_value: input.ratingValue,
      rating_vibe: input.ratingVibe,
      vibe_tag: input.vibeTag,
      body: input.text,
      photo: input.photo ?? null,
      like_count: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return mapReview(data);
}

export interface NewPostInput {
  spotId?: string | null;
  mediaUrl: string;
  isVideo: boolean;
  caption: string;
  exploreTags: string[];
}

export async function insertPost(
  userId: string,
  authorName: string,
  authorAvatar: string,
  input: NewPostInput,
): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      spot_id: input.spotId ?? null,
      author_type: 'customer',
      author_name: authorName,
      author_avatar: authorAvatar,
      media_url: input.mediaUrl,
      is_video: input.isVideo,
      caption: input.caption,
      explore_tags: input.exploreTags,
      like_count: 0,
      comment_count: 0,
      share_count: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return mapPost(data);
}
