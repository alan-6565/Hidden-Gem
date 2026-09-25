import { supabase } from './supabase';
import {
  AppNotification,
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
  Profile,
  Report,
  ReportAction,
  ReportGroup,
  ReportTargetPreview,
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
    phone: row.phone ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    tiktokUrl: row.tiktok_url ?? undefined,
    acceptingOrders: row.accepting_orders ?? true,
    prepTime: row.prep_time ?? undefined,
    teaScore: row.tea_score,
    worthTheHypeVotes: row.worth_the_hype_votes,
    hiddenGemVotes: row.hidden_gem_votes,
    ownerUserId: row.owner_user_id ?? null,
    promotedUntil: row.promoted_until ?? null,
    published: row.published ?? true,
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
    replyText: row.reply_text ?? null,
    repliedAt: row.replied_at ?? null,
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
    isStory: row.is_story ?? false,
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

function mapNotification(row: any): AppNotification {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    actorUserId: row.actor_user_id ?? null,
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    data: row.data ?? {},
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

export async function fetchSpots(): Promise<Spot[]> {
  // Admins can still read removed listings (to review or restore them) —
  // they shouldn't show up in anyone's feed or map, admins included.
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .is('removed_at', null)
    .order('tea_score', { ascending: false });
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

export async function insertCollection(
  userId: string,
  name: string,
  description: string,
): Promise<Collection> {
  const { data, error } = await supabase
    .from('collections')
    .insert({ user_id: userId, name, description: description || null })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, description: data.description ?? '', spotIds: [] };
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

export async function fetchFollowedSpotIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('business_follows')
    .select('spot_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.spot_id);
}

export async function setSpotFollowed(userId: string, spotId: string, followed: boolean): Promise<void> {
  if (followed) {
    const { error } = await supabase
      .from('business_follows')
      .upsert({ user_id: userId, spot_id: spotId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('business_follows')
      .delete()
      .eq('user_id', userId)
      .eq('spot_id', spotId);
    if (error) throw error;
  }
}

export async function fetchSpotFollowerCount(spotId: string): Promise<number> {
  const { count, error } = await supabase
    .from('business_follows')
    .select('*', { count: 'exact', head: true })
    .eq('spot_id', spotId);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchSpotSaveCount(spotId: string): Promise<number> {
  const { count, error } = await supabase
    .from('saved_spots')
    .select('*', { count: 'exact', head: true })
    .eq('spot_id', spotId);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchLikedSpotIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('spot_hype_votes')
    .select('spot_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.spot_id);
}

export async function setSpotHyped(userId: string, spotId: string, hyped: boolean): Promise<void> {
  if (hyped) {
    const { error } = await supabase
      .from('spot_hype_votes')
      .upsert({ user_id: userId, spot_id: spotId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('spot_hype_votes')
      .delete()
      .eq('user_id', userId)
      .eq('spot_id', spotId);
    if (error) throw error;
  }
}

export async function fetchLikedReviewIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('review_likes')
    .select('review_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.review_id);
}

export async function setReviewLiked(userId: string, reviewId: string, liked: boolean): Promise<void> {
  if (liked) {
    const { error } = await supabase
      .from('review_likes')
      .upsert({ user_id: userId, review_id: reviewId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('review_likes')
      .delete()
      .eq('user_id', userId)
      .eq('review_id', reviewId);
    if (error) throw error;
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) throw error;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
  if (error) throw error;
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

export async function fetchFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('followed_id')
    .eq('follower_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.followed_id);
}

export async function setFollowing(
  followerId: string,
  followedId: string,
  following: boolean,
): Promise<void> {
  if (following) {
    const { error } = await supabase
      .from('follows')
      .upsert({ follower_id: followerId, followed_id: followedId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followed_id', followedId);
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

// user_name / user_avatar are required columns but the database overwrites
// them from the caller's profile (and resets like_count, the reply, the
// timestamp and the overall rating) — see supabase/schema.sql. The values sent
// here are placeholders, never trusted.
export async function insertReview(
  userId: string,
  userName: string,
  userAvatar: string | null,
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
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error("You've already reviewed this spot.");
    if (error.code === '42501') throw new Error("You can't review your own business.");
    throw error;
  }
  return mapReview(data);
}

export async function updateReview(reviewId: string, input: NewReviewInput): Promise<Review> {
  const ratingOverall = Math.round((input.ratingTaste + input.ratingValue + input.ratingVibe) / 3);
  const { data, error } = await supabase
    .from('reviews')
    .update({
      rating_overall: ratingOverall,
      rating_taste: input.ratingTaste,
      rating_value: input.ratingValue,
      rating_vibe: input.ratingVibe,
      vibe_tag: input.vibeTag,
      body: input.text,
      photo: input.photo ?? null,
    })
    .eq('id', reviewId)
    .select()
    .single();
  if (error) throw error;
  return mapReview(data);
}

export async function replyToReview(reviewId: string, replyText: string): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update({ reply_text: replyText.trim() || null })
    .eq('id', reviewId)
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
  userAvatar: string | null,
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
  isStory?: boolean;
}

export async function insertPost(
  userId: string,
  authorName: string,
  authorAvatar: string | null,
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
      is_story: input.isStory ?? false,
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
      throw new Error('A business with that name already exists at this location.');
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
  name?: string;
  category?: SpotCategory;
  isHomeBased?: boolean;
  address?: string | null;
  serviceArea?: string | null;
  description?: string;
  priceRange?: string;
  hours?: OpenHours[];
  menu?: MenuItem[];
  photos?: string[];
  tags?: string[];
  phone?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  acceptingOrders?: boolean;
  prepTime?: string | null;
  published?: boolean;
}

export async function updateSpot(spotId: string, input: SpotEditInput): Promise<Spot> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.category !== undefined) payload.category = input.category;
  if (input.isHomeBased !== undefined) payload.is_home_based = input.isHomeBased;
  if (input.address !== undefined) payload.address = input.address;
  if (input.serviceArea !== undefined) payload.service_area = input.serviceArea;
  if (input.description !== undefined) payload.description = input.description;
  if (input.priceRange !== undefined) payload.price_range = input.priceRange;
  if (input.hours !== undefined) payload.hours = input.hours;
  if (input.menu !== undefined) payload.menu = input.menu;
  if (input.photos !== undefined) payload.photos = input.photos;
  if (input.tags !== undefined) payload.tags = input.tags;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.instagramUrl !== undefined) payload.instagram_url = input.instagramUrl;
  if (input.tiktokUrl !== undefined) payload.tiktok_url = input.tiktokUrl;
  if (input.acceptingOrders !== undefined) payload.accepting_orders = input.acceptingOrders;
  if (input.prepTime !== undefined) payload.prep_time = input.prepTime;
  if (input.published !== undefined) payload.published = input.published;

  const { data, error } = await supabase
    .from('spots')
    .update(payload)
    .eq('id', spotId)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('A business with that name already exists at this location.');
    throw error;
  }
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

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    // The notifications table may not exist yet on a database that hasn't
    // run its migration — degrade to an empty list rather than failing the
    // whole app load.
    console.warn('Could not load notifications:', error.message);
    return [];
  }
  return (data ?? []).map(mapNotification);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', userId)
    .is('read_at', null);
  if (error) throw error;
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

function mapReport(row: any): Report {
  return {
    id: row.id,
    reporterUserId: row.reporter_user_id,
    targetType: row.target_type as ReportTargetType,
    targetId: row.target_id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? null,
  };
}

async function fetchReportPreviews(
  targetType: ReportTargetType,
  ids: string[],
): Promise<Map<string, ReportTargetPreview>> {
  const previews = new Map<string, ReportTargetPreview>();
  if (ids.length === 0) return previews;

  if (targetType === 'post') {
    const { data, error } = await supabase.from('posts').select('*').in('id', ids);
    if (error) throw error;
    for (const row of data ?? []) {
      const post = mapPost(row);
      previews.set(post.id, {
        title: `${post.isStory ? 'Story' : 'Post'} by ${post.authorName}`,
        body: post.caption || null,
        mediaUrl: post.mediaUrl,
        isVideo: post.isVideo,
        authorUserId: post.userId,
        spotId: post.spotId,
      });
    }
  } else if (targetType === 'review') {
    const { data, error } = await supabase.from('reviews').select('*').in('id', ids);
    if (error) throw error;
    for (const row of data ?? []) {
      const review = mapReview(row);
      previews.set(review.id, {
        title: `Review by ${review.userName} · ${review.ratingOverall}★`,
        body: review.text,
        mediaUrl: review.photo ?? null,
        isVideo: false,
        authorUserId: review.userId,
        spotId: review.spotId,
      });
    }
  } else if (targetType === 'comment') {
    const { data, error } = await supabase.from('post_comments').select('*').in('id', ids);
    if (error) throw error;
    for (const row of data ?? []) {
      const comment = mapComment(row);
      previews.set(comment.id, {
        title: `Comment by ${comment.userName}`,
        body: comment.text,
        mediaUrl: null,
        isVideo: false,
        authorUserId: comment.userId,
        spotId: null,
      });
    }
  } else if (targetType === 'spot') {
    const { data, error } = await supabase.from('spots').select('*').in('id', ids);
    if (error) throw error;
    for (const row of data ?? []) {
      const spot = mapSpot(row);
      previews.set(spot.id, {
        title: row.removed_at ? `${spot.name} (removed)` : spot.name,
        body: spot.description ?? null,
        mediaUrl: spot.photos[0] ?? null,
        isVideo: false,
        authorUserId: spot.ownerUserId,
        spotId: spot.id,
      });
    }
  } else if (targetType === 'user') {
    const { data, error } = await supabase.from('profiles').select('*').in('user_id', ids);
    if (error) throw error;
    for (const row of data ?? []) {
      const profile = mapProfile(row);
      previews.set(profile.userId, {
        title: `@${profile.username}`,
        body: profile.bio,
        mediaUrl: profile.avatarUrl,
        isVideo: false,
        authorUserId: profile.userId,
        spotId: null,
      });
    }
  }
  return previews;
}

// Admin-only (RLS returns nothing but your own reports otherwise). Grouped
// by target so one post reported five times is one item in the queue,
// most-reported first.
export async function fetchOpenReportGroups(): Promise<ReportGroup[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const groups = new Map<string, ReportGroup>();
  for (const report of (data ?? []).map(mapReport)) {
    const key = `${report.targetType}:${report.targetId}`;
    const group = groups.get(key);
    if (group) group.reports.push(report);
    else groups.set(key, { targetType: report.targetType, targetId: report.targetId, reports: [report], preview: null });
  }

  const types: ReportTargetType[] = ['post', 'review', 'comment', 'spot', 'user'];
  const previewsByType = await Promise.all(
    types.map((type) =>
      fetchReportPreviews(
        type,
        [...groups.values()].filter((g) => g.targetType === type).map((g) => g.targetId),
      ),
    ),
  );
  for (const [i, type] of types.entries()) {
    for (const group of groups.values()) {
      if (group.targetType === type) group.preview = previewsByType[i].get(group.targetId) ?? null;
    }
  }

  return [...groups.values()].sort((a, b) => b.reports.length - a.reports.length);
}

export async function resolveReport(reportId: string, action: ReportAction): Promise<void> {
  const { error } = await supabase.rpc('admin_resolve_report', {
    report_id_param: reportId,
    action,
  });
  if (error) throw error;
}

export async function setSpotRemoved(spotId: string, removed: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_spot_removed', {
    spot_id_param: spotId,
    removed,
  });
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

// ── Profiles ──────────────────────────────────────────────────────────────
// Public identity (username + avatar) shown on reviews, posts and comments.
// The database creates one at signup; ensure_my_profile() also covers accounts
// that predate profiles. Returns null (rather than throwing) if the profiles
// migration hasn't been applied yet, so the rest of the app still loads.

export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

function mapProfile(row: any): Profile {
  return {
    userId: row.user_id,
    username: row.username,
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
    location: row.location ?? null,
  };
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('ensure_my_profile');
  if (error) {
    console.warn('Could not load profile:', error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapProfile(row) : null;
}

export async function updateMyProfile(
  userId: string,
  input: { username?: string; avatarUrl?: string | null; bio?: string | null; location?: string | null },
): Promise<Profile> {
  const payload: Record<string, unknown> = {};
  if (input.username !== undefined) payload.username = input.username.trim().toLowerCase();
  if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;
  if (input.bio !== undefined) payload.bio = input.bio?.trim() || null;
  if (input.location !== undefined) payload.location = input.location?.trim() || null;

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('That username is already taken.');
    if (error.code === '23514') {
      if (error.message.includes('profiles_bio_length')) throw new Error('Bio must be 150 characters or fewer.');
      if (error.message.includes('profiles_location_length')) throw new Error('Location must be 60 characters or fewer.');
      throw new Error('Usernames are 3–20 characters: lowercase letters, numbers, "." and "_".');
    }
    throw error;
  }
  return mapProfile(data);
}

// Public — anyone can see how many people follow a given user (the follows
// table's own "public read" policy already allows this; this just counts).
export async function fetchFollowerCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('followed_id', userId);
  if (error) throw error;
  return count ?? 0;
}

// Blocking only ever stores an id (blocked_users.blocked_user_id) — this
// resolves a batch of ids to a displayable username/avatar for a "manage
// blocked users" list. profiles is public-readable, so no special access
// is needed beyond knowing which ids to ask for.
export async function fetchProfilesByIds(userIds: string[]): Promise<Profile[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase.from('profiles').select('*').in('user_id', userIds);
  if (error) throw error;
  return (data ?? []).map(mapProfile);
}

// Re-read one spot — its Kuppio Score is recomputed by the database whenever a
// review is added, edited or deleted, so the app refetches it afterwards.
export async function fetchSpot(spotId: string): Promise<Spot | null> {
  const { data, error } = await supabase.from('spots').select('*').eq('id', spotId).maybeSingle();
  if (error) throw error;
  return data ? mapSpot(data) : null;
}
