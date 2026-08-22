import { supabase } from './supabase';
import {
  BusinessVerification,
  Collection,
  Comment,
  MenuItem,
  NewBusinessVerificationInput,
  OpenHours,
  Order,
  OrderItem,
  OrderStatus,
  Post,
  PriceRange,
  ReportTargetType,
  Review,
  Spot,
  SpotCategory,
  VibeTag,
} from '../types';

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
    ownerUserId: row.owner_user_id ?? null,
    promotedUntil: row.promoted_until ?? null,
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
    userId: row.user_id ?? null,
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

function mapComment(row: any): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar ?? '',
    text: row.body,
    createdAt: row.created_at,
  };
}

function mapOrder(row: any): Order {
  return {
    id: row.id,
    spotId: row.spot_id,
    customerUserId: row.customer_user_id,
    status: row.status as OrderStatus,
    items: (row.items ?? []) as OrderItem[],
    total: Number(row.total),
    note: row.note ?? undefined,
    pickupTime: row.pickup_time ?? undefined,
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

export async function fetchLikedPostIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.post_id);
}

export async function setPostLiked(userId: string, postId: string, liked: boolean): Promise<void> {
  if (liked) {
    const { error } = await supabase
      .from('post_likes')
      .upsert({ user_id: userId, post_id: postId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    if (error) throw error;
  }
}

export async function fetchSavedPostIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_posts')
    .select('post_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.post_id);
}

export async function setPostSaved(userId: string, postId: string, saved: boolean): Promise<void> {
  if (saved) {
    const { error } = await supabase
      .from('saved_posts')
      .upsert({ user_id: userId, post_id: postId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
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

export async function fetchComments(): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapComment);
}

export async function insertComment(
  userId: string,
  userName: string,
  userAvatar: string,
  postId: string,
  text: string,
): Promise<Comment> {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      body: text,
    })
    .select()
    .single();
  if (error) throw error;
  return mapComment(data);
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
      user_id: userId,
      // author_type is set server-side by a trigger based on spot ownership —
      // never trust the client for this.
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

// Business verification — ownership is only ever granted once an admin
// approves a submitted business_verifications row (see supabase/schema.sql,
// apply_business_verification_approval). There's no client-side path to
// instantly claim or create-and-own a spot anymore.

function mapVerification(row: any): BusinessVerification {
  return {
    id: row.id,
    userId: row.user_id,
    claimType: row.claim_type,
    existingSpotId: row.existing_spot_id ?? null,
    businessName: row.business_name,
    category: row.category ?? null,
    isHomeBased: row.is_home_based ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    address: row.address ?? undefined,
    serviceArea: row.service_area ?? undefined,
    priceRange: row.price_range ?? null,
    description: row.description ?? undefined,
    photos: row.photos ?? [],
    hours: (row.hours ?? []) as OpenHours[],
    menu: (row.menu ?? []) as MenuItem[],
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone ?? undefined,
    googleMapsUrl: row.google_maps_url ?? undefined,
    idPhotoPath: row.id_photo_path,
    businessPhotoPath: row.business_photo_path,
    status: row.status,
    reviewerNote: row.reviewer_note ?? undefined,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? null,
  };
}

export async function submitBusinessVerification(
  userId: string,
  input: NewBusinessVerificationInput,
): Promise<BusinessVerification> {
  const { data, error } = await supabase
    .from('business_verifications')
    .insert({
      user_id: userId,
      claim_type: input.claimType,
      existing_spot_id: input.existingSpotId ?? null,
      business_name: input.businessName,
      category: input.category ?? null,
      is_home_based: input.isHomeBased ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      address: input.isHomeBased ? null : input.address ?? null,
      service_area: input.isHomeBased ? input.serviceArea ?? null : null,
      price_range: input.priceRange ?? null,
      description: input.description ?? null,
      photos: input.photos ?? [],
      hours: input.hours ?? [],
      menu: input.menu ?? [],
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone ?? null,
      google_maps_url: input.googleMapsUrl ?? null,
      id_photo_path: input.idPhotoPath,
      business_photo_path: input.businessPhotoPath,
    })
    .select()
    .single();
  if (error) throw error;
  return mapVerification(data);
}

export async function fetchMyVerifications(userId: string): Promise<BusinessVerification[]> {
  const { data, error } = await supabase
    .from('business_verifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapVerification);
}

export async function fetchPendingVerifications(): Promise<BusinessVerification[]> {
  const { data, error } = await supabase
    .from('business_verifications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapVerification);
}

export async function reviewVerification(
  id: string,
  status: 'approved' | 'rejected',
  note?: string,
): Promise<void> {
  const { error } = await supabase
    .from('business_verifications')
    .update({ status, reviewer_note: note ?? null })
    .eq('id', id);
  if (error) {
    if (error.code === '23505') {
      throw new Error('A business with that name already exists.');
    }
    throw error;
  }
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function getVerificationDocUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('verification-docs')
    .createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

export interface SpotEditInput {
  description?: string;
  priceRange?: string;
  hours?: OpenHours[];
  menu?: MenuItem[];
  photos?: string[];
  promotedUntil?: string | null;
}

export async function updateSpot(spotId: string, input: SpotEditInput): Promise<Spot> {
  const payload: Record<string, unknown> = {};
  if (input.description !== undefined) payload.description = input.description;
  if (input.priceRange !== undefined) payload.price_range = input.priceRange;
  if (input.hours !== undefined) payload.hours = input.hours;
  if (input.menu !== undefined) payload.menu = input.menu;
  if (input.photos !== undefined) payload.photos = input.photos;
  if (input.promotedUntil !== undefined) payload.promoted_until = input.promotedUntil;

  const { data, error } = await supabase
    .from('spots')
    .update(payload)
    .eq('id', spotId)
    .select()
    .single();
  if (error) throw error;
  return mapSpot(data);
}

// RLS returns every order the current user can see: their own orders as a
// customer, plus every order placed against any spot they own — no userId
// filter needed here, the database already scopes it.
export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

export interface NewOrderInput {
  spotId: string;
  items: OrderItem[];
  total: number;
  note?: string;
  pickupTime?: string;
}

export async function insertOrder(userId: string, input: NewOrderInput): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      spot_id: input.spotId,
      customer_user_id: userId,
      items: input.items,
      total: input.total,
      note: input.note ?? null,
      pickup_time: input.pickupTime ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapOrder(data);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return mapOrder(data);
}

// Reports & blocking — minimum-viable content moderation (App Store
// Guideline 1.2). Visibility filtering for blocked users' content is
// enforced server-side by RLS on posts/reviews/post_comments (see
// supabase/schema.sql), not just here.

export async function submitReport(
  userId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .insert({ reporter_user_id: userId, target_type: targetType, target_id: targetId, reason });
  if (error) throw error;
}

export async function fetchBlockedUserIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_user_id')
    .eq('blocker_user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row: any) => row.blocked_user_id);
}

export async function blockUser(blockerUserId: string, blockedUserId: string): Promise<void> {
  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocker_user_id: blockerUserId, blocked_user_id: blockedUserId });
  if (error) throw error;
}

export async function unblockUser(blockerUserId: string, blockedUserId: string): Promise<void> {
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_user_id', blockerUserId)
    .eq('blocked_user_id', blockedUserId);
  if (error) throw error;
}

// Deletes everything the caller owns and their auth account (see
// delete_own_account() in supabase/schema.sql). The caller must sign out
// immediately after this resolves — their session is no longer valid.
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
}
