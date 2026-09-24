import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppNotification, BusinessVerification, Collection, Comment, NewBusinessVerificationInput, Order, OrderStatus, Post, Profile, ReportTargetType, Review, Spot } from '../types';
import { useAuth } from './AuthContext';
import {
  blockUser as apiBlockUser,
  deleteComment as apiDeleteComment,
  deleteOwnAccount,
  deletePost as apiDeletePost,
  deleteReview as apiDeleteReview,
  fetchBlockedUserIds,
  fetchCollections,
  fetchComments,
  fetchFollowingIds,
  fetchLikedPostIds,
  fetchLikedReviewIds,
  fetchLikedSpotIds,
  fetchMyProfile,
  fetchNotifications,
  fetchMyVerifications,
  fetchOrders,
  fetchPosts,
  fetchReviews,
  fetchSavedPostIds,
  fetchSavedSpotIds,
  fetchSpot,
  fetchSpots,
  markAllNotificationsRead,
  markNotificationRead,
  insertComment,
  insertCollection,
  insertOrder,
  insertPost,
  insertReview,
  NewOrderInput,
  NewPostInput,
  NewReviewInput,
  replyToReview as apiReplyToReview,
  setFollowing,
  setPostLiked,
  setPostSaved,
  setReviewLiked,
  setSpotHyped,
  setSpotSaved,
  SpotEditInput,
  submitBusinessVerification,
  submitReport,
  unblockUser as apiUnblockUser,
  updateOrderStatus as apiUpdateOrderStatus,
  updateReview as apiUpdateReview,
  updateMyProfile as apiUpdateMyProfile,
  updateSpot as apiUpdateSpot,
} from '../lib/api';

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
import { MOCK_MODE, mockCollections, mockPosts, mockReviews, mockSpots } from '../lib/mockData';

interface DataContextValue {
  spots: Spot[];
  reviews: Review[];
  posts: Post[];
  comments: Comment[];
  orders: Order[];
  collections: Collection[];
  savedSpotIds: string[];
  likedSpotIds: string[];
  likedPostIds: string[];
  savedPostIds: string[];
  myVerifications: BusinessVerification[];
  blockedUserIds: string[];
  followingIds: string[];
  stories: Post[];
  profile: Profile | null;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isSaved: (spotId: string) => boolean;
  toggleSaved: (spotId: string) => Promise<void>;
  isSpotHyped: (spotId: string) => boolean;
  toggleSpotHype: (spotId: string) => Promise<void>;
  isReviewLiked: (reviewId: string) => boolean;
  toggleReviewLike: (reviewId: string) => Promise<void>;
  isPostLiked: (postId: string) => boolean;
  toggleLike: (postId: string) => Promise<void>;
  isPostSaved: (postId: string) => boolean;
  toggleSavePost: (postId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => Promise<void>;
  addReview: (input: NewReviewInput) => Promise<void>;
  editReview: (reviewId: string, input: NewReviewInput) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  replyToReview: (reviewId: string, replyText: string) => Promise<void>;
  addPost: (input: NewPostInput) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  addCollection: (name: string, description: string) => Promise<void>;
  updateSpot: (spotId: string, input: SpotEditInput) => Promise<void>;
  updateProfile: (input: { username?: string; avatarUrl?: string | null }) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  submitVerification: (input: NewBusinessVerificationInput) => Promise<BusinessVerification>;
  placeOrder: (input: NewOrderInput) => Promise<Order>;
  setOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  reportContent: (targetType: ReportTargetType, targetId: string, reason: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [rawReviews, setReviews] = useState<Review[]>([]);
  const [rawPosts, setPosts] = useState<Post[]>([]);
  const [rawComments, setComments] = useState<Comment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedSpotIds, setSavedSpotIds] = useState<string[]>([]);
  const [likedSpotIds, setLikedSpotIds] = useState<string[]>([]);
  const [likedReviewIds, setLikedReviewIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [myVerifications, setMyVerifications] = useState<BusinessVerification[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    if (MOCK_MODE) {
      setSpots(mockSpots);
      setReviews(mockReviews);
      setPosts(mockPosts);
      setCollections(mockCollections);
      setProfile({ userId: user.id, username: 'you', avatarUrl: null });
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [
        spotsData,
        reviewsData,
        postsData,
        commentsData,
        ordersData,
        collectionsData,
        savedData,
        likedSpotData,
        likedReviewData,
        likedData,
        savedPostData,
        verificationsData,
        blockedData,
        followingData,
        profileData,
        notificationsData,
      ] = await Promise.all([
        fetchSpots(),
        fetchReviews(),
        fetchPosts(),
        fetchComments(),
        fetchOrders(),
        fetchCollections(user.id),
        fetchSavedSpotIds(user.id),
        fetchLikedSpotIds(user.id),
        fetchLikedReviewIds(user.id),
        fetchLikedPostIds(user.id),
        fetchSavedPostIds(user.id),
        fetchMyVerifications(user.id),
        fetchBlockedUserIds(user.id),
        fetchFollowingIds(user.id),
        fetchMyProfile(),
        fetchNotifications(user.id),
      ]);
      setSpots(spotsData);
      setReviews(reviewsData);
      setPosts(postsData);
      setComments(commentsData);
      setOrders(ordersData);
      setCollections(collectionsData);
      setSavedSpotIds(savedData);
      setLikedSpotIds(likedSpotData);
      setLikedReviewIds(likedReviewData);
      setLikedPostIds(likedData);
      setSavedPostIds(savedPostData);
      setMyVerifications(verificationsData);
      setBlockedUserIds(blockedData);
      setFollowingIds(followingData);
      setProfile(profileData);
      setNotifications(notificationsData);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Blocked users' content is also excluded server-side by RLS (see
  // supabase/schema.sql), but filtering here too means blocking someone
  // hides their content immediately, without waiting on a refetch.
  const reviews = useMemo(
    () => rawReviews.filter((r) => !blockedUserIds.includes(r.userId)),
    [rawReviews, blockedUserIds],
  );
  const posts = useMemo(
    () => rawPosts.filter((p) => !p.userId || !blockedUserIds.includes(p.userId)),
    [rawPosts, blockedUserIds],
  );
  const comments = useMemo(
    () => rawComments.filter((c) => !blockedUserIds.includes(c.userId)),
    [rawComments, blockedUserIds],
  );

  const isSaved = useCallback((spotId: string) => savedSpotIds.includes(spotId), [savedSpotIds]);

  const toggleSaved = useCallback(
    async (spotId: string) => {
      if (!user) return;
      const currentlySaved = savedSpotIds.includes(spotId);
      setSavedSpotIds((prev) =>
        currentlySaved ? prev.filter((id) => id !== spotId) : [...prev, spotId],
      );
      try {
        await setSpotSaved(user.id, spotId, !currentlySaved);
      } catch (e) {
        setSavedSpotIds((prev) =>
          currentlySaved ? [...prev, spotId] : prev.filter((id) => id !== spotId),
        );
        throw e;
      }
    },
    [user, savedSpotIds],
  );

  const isSpotHyped = useCallback((spotId: string) => likedSpotIds.includes(spotId), [likedSpotIds]);

  const toggleSpotHype = useCallback(
    async (spotId: string) => {
      if (!user) return;
      const currentlyHyped = likedSpotIds.includes(spotId);
      const delta = currentlyHyped ? -1 : 1;
      setLikedSpotIds((prev) =>
        currentlyHyped ? prev.filter((id) => id !== spotId) : [...prev, spotId],
      );
      setSpots((prev) =>
        prev.map((s) =>
          s.id === spotId ? { ...s, worthTheHypeVotes: Math.max(0, s.worthTheHypeVotes + delta) } : s,
        ),
      );
      try {
        await setSpotHyped(user.id, spotId, !currentlyHyped);
      } catch (e) {
        setLikedSpotIds((prev) =>
          currentlyHyped ? [...prev, spotId] : prev.filter((id) => id !== spotId),
        );
        setSpots((prev) =>
          prev.map((s) =>
            s.id === spotId ? { ...s, worthTheHypeVotes: Math.max(0, s.worthTheHypeVotes - delta) } : s,
          ),
        );
        throw e;
      }
    },
    [user, likedSpotIds],
  );

  const isReviewLiked = useCallback(
    (reviewId: string) => likedReviewIds.includes(reviewId),
    [likedReviewIds],
  );

  const toggleReviewLike = useCallback(
    async (reviewId: string) => {
      if (!user) return;
      const currentlyLiked = likedReviewIds.includes(reviewId);
      const delta = currentlyLiked ? -1 : 1;
      setLikedReviewIds((prev) =>
        currentlyLiked ? prev.filter((id) => id !== reviewId) : [...prev, reviewId],
      );
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, likeCount: Math.max(0, r.likeCount + delta) } : r)),
      );
      try {
        await setReviewLiked(user.id, reviewId, !currentlyLiked);
      } catch (e) {
        setLikedReviewIds((prev) =>
          currentlyLiked ? [...prev, reviewId] : prev.filter((id) => id !== reviewId),
        );
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, likeCount: Math.max(0, r.likeCount - delta) } : r)),
        );
        throw e;
      }
    },
    [user, likedReviewIds],
  );

  const isPostLiked = useCallback((postId: string) => likedPostIds.includes(postId), [likedPostIds]);

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!user) return;
      const currentlyLiked = likedPostIds.includes(postId);
      const delta = currentlyLiked ? -1 : 1;
      setLikedPostIds((prev) =>
        currentlyLiked ? prev.filter((id) => id !== postId) : [...prev, postId],
      );
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likeCount: Math.max(0, p.likeCount + delta) } : p)),
      );
      try {
        await setPostLiked(user.id, postId, !currentlyLiked);
      } catch (e) {
        setLikedPostIds((prev) =>
          currentlyLiked ? [...prev, postId] : prev.filter((id) => id !== postId),
        );
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likeCount: Math.max(0, p.likeCount - delta) } : p)),
        );
        throw e;
      }
    },
    [user, likedPostIds],
  );

  const isFollowing = useCallback((userId: string) => followingIds.includes(userId), [followingIds]);

  const toggleFollow = useCallback(
    async (targetUserId: string) => {
      if (!user) return;
      const currentlyFollowing = followingIds.includes(targetUserId);
      setFollowingIds((prev) =>
        currentlyFollowing ? prev.filter((id) => id !== targetUserId) : [...prev, targetUserId],
      );
      try {
        await setFollowing(user.id, targetUserId, !currentlyFollowing);
      } catch (e) {
        setFollowingIds((prev) =>
          currentlyFollowing ? [...prev, targetUserId] : prev.filter((id) => id !== targetUserId),
        );
        throw e;
      }
    },
    [user, followingIds],
  );

  const stories = useMemo(() => {
    const cutoff = Date.now() - STORY_LIFETIME_MS;
    return posts.filter((p) => p.isStory && new Date(p.createdAt).getTime() > cutoff);
  }, [posts]);

  const isPostSaved = useCallback((postId: string) => savedPostIds.includes(postId), [savedPostIds]);

  const toggleSavePost = useCallback(
    async (postId: string) => {
      if (!user) return;
      const currentlySaved = savedPostIds.includes(postId);
      setSavedPostIds((prev) =>
        currentlySaved ? prev.filter((id) => id !== postId) : [...prev, postId],
      );
      try {
        await setPostSaved(user.id, postId, !currentlySaved);
      } catch (e) {
        setSavedPostIds((prev) =>
          currentlySaved ? [...prev, postId] : prev.filter((id) => id !== postId),
        );
        throw e;
      }
    },
    [user, savedPostIds],
  );

  // A review changing (add / edit / delete) makes the database recompute the
  // spot's Kuppio Score and Hidden Gem count — pull the fresh row so the badge
  // updates immediately instead of waiting for the next full refresh.
  const refreshSpot = useCallback(async (spotId: string) => {
    try {
      const fresh = await fetchSpot(spotId);
      if (fresh) setSpots((prev) => prev.map((s) => (s.id === spotId ? fresh : s)));
    } catch {
      // Non-critical: the score just stays stale until the next refresh.
    }
  }, []);

  // The name/avatar passed here are placeholders — the database always writes
  // the real ones from the caller's profile.
  const authorName = profile?.username ?? 'Kuppio user';

  const addReview = useCallback(
    async (input: NewReviewInput) => {
      if (!user) return;
      const created = await insertReview(user.id, authorName, profile?.avatarUrl ?? null, input);
      setReviews((prev) => [created, ...prev]);
      refreshSpot(input.spotId);
    },
    [user, authorName, profile, refreshSpot],
  );

  const editReview = useCallback(
    async (reviewId: string, input: NewReviewInput) => {
      const updated = await apiUpdateReview(reviewId, input);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      refreshSpot(updated.spotId);
    },
    [refreshSpot],
  );

  const deleteReview = useCallback(
    async (reviewId: string) => {
      const spotId = rawReviews.find((r) => r.id === reviewId)?.spotId;
      await apiDeleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      if (spotId) refreshSpot(spotId);
    },
    [rawReviews, refreshSpot],
  );

  const replyToReview = useCallback(async (reviewId: string, replyText: string) => {
    const updated = await apiReplyToReview(reviewId, replyText);
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
  }, []);

  const addPost = useCallback(
    async (input: NewPostInput) => {
      if (!user) return;
      const created = await insertPost(user.id, authorName, profile?.avatarUrl ?? null, input);
      setPosts((prev) => [created, ...prev]);
    },
    [user, authorName, profile],
  );

  const deletePost = useCallback(async (postId: string) => {
    await apiDeletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const addComment = useCallback(
    async (postId: string, text: string) => {
      if (!user) return;
      const created = await insertComment(user.id, authorName, profile?.avatarUrl ?? null, postId, text);
      setComments((prev) => [...prev, created]);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)),
      );
    },
    [user, authorName, profile],
  );

  const deleteComment = useCallback(async (postId: string, commentId: string) => {
    await apiDeleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p)),
    );
  }, []);

  const addCollection = useCallback(
    async (name: string, description: string) => {
      if (!user) return;
      const created = await insertCollection(user.id, name, description);
      setCollections((prev) => [...prev, created]);
    },
    [user],
  );

  const updateSpot = useCallback(async (spotId: string, input: SpotEditInput) => {
    const updated = await apiUpdateSpot(spotId, input);
    setSpots((prev) => prev.map((s) => (s.id === spotId ? updated : s)));
  }, []);

  // The database rewrites the name/avatar on everything this user already
  // posted (see propagate_profile_changes), so mirror that locally.
  const updateProfile = useCallback(
    async (input: { username?: string; avatarUrl?: string | null }) => {
      if (!user) throw new Error('You must be signed in.');
      const updated = await apiUpdateMyProfile(user.id, input);
      setProfile(updated);
      const avatar = updated.avatarUrl ?? '';
      setReviews((prev) =>
        prev.map((r) => (r.userId === user.id ? { ...r, userName: updated.username, userAvatar: avatar } : r)),
      );
      setPosts((prev) =>
        prev.map((p) => (p.userId === user.id ? { ...p, authorName: updated.username, authorAvatar: avatar } : p)),
      );
      setComments((prev) =>
        prev.map((c) => (c.userId === user.id ? { ...c, userName: updated.username, userAvatar: avatar } : c)),
      );
    },
    [user],
  );

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications],
  );

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setNotifications(await fetchNotifications(user.id));
    } catch {
      // Non-critical: the bell just stays stale until the next refresh.
    }
  }, [user]);

  const markRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    try {
      await markNotificationRead(notificationId);
    } catch {
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    try {
      await markAllNotificationsRead(user.id);
    } catch {
      refreshNotifications();
    }
  }, [user, refreshNotifications]);

  const submitVerification = useCallback(
    async (input: NewBusinessVerificationInput) => {
      if (!user) throw new Error('You must be signed in to submit a business for review.');
      const created = await submitBusinessVerification(user.id, input);
      setMyVerifications((prev) => [created, ...prev]);
      return created;
    },
    [user],
  );

  const placeOrder = useCallback(
    async (input: NewOrderInput) => {
      if (!user) throw new Error('You must be signed in to place an order.');
      const created = await insertOrder(user.id, input);
      setOrders((prev) => [created, ...prev]);
      return created;
    },
    [user],
  );

  const setOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    const previous = orders.find((o) => o.id === orderId);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    try {
      await apiUpdateOrderStatus(orderId, status);
    } catch (e) {
      if (previous) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? previous : o)));
      }
      throw e;
    }
  }, [orders]);

  const reportContent = useCallback(
    async (targetType: ReportTargetType, targetId: string, reason: string) => {
      if (!user) return;
      await submitReport(user.id, targetType, targetId, reason);
    },
    [user],
  );

  const blockUser = useCallback(
    async (blockedUserId: string) => {
      if (!user) return;
      setBlockedUserIds((prev) => (prev.includes(blockedUserId) ? prev : [...prev, blockedUserId]));
      try {
        await apiBlockUser(user.id, blockedUserId);
      } catch (e) {
        setBlockedUserIds((prev) => prev.filter((id) => id !== blockedUserId));
        throw e;
      }
    },
    [user],
  );

  const unblockUser = useCallback(
    async (blockedUserId: string) => {
      if (!user) return;
      setBlockedUserIds((prev) => prev.filter((id) => id !== blockedUserId));
      try {
        await apiUnblockUser(user.id, blockedUserId);
      } catch (e) {
        setBlockedUserIds((prev) => (prev.includes(blockedUserId) ? prev : [...prev, blockedUserId]));
        throw e;
      }
    },
    [user],
  );

  const deleteAccount = useCallback(async () => {
    await deleteOwnAccount();
  }, []);

  return (
    <DataContext.Provider
      value={{
        spots,
        reviews,
        posts,
        comments,
        orders,
        collections,
        savedSpotIds,
        likedSpotIds,
        likedPostIds,
        savedPostIds,
        myVerifications,
        blockedUserIds,
        followingIds,
        stories,
        profile,
        notifications,
        unreadNotificationCount,
        loading,
        error,
        refresh: load,
        isSaved,
        toggleSaved,
        isSpotHyped,
        toggleSpotHype,
        isReviewLiked,
        toggleReviewLike,
        isPostLiked,
        toggleLike,
        isPostSaved,
        toggleSavePost,
        isFollowing,
        toggleFollow,
        addReview,
        editReview,
        deleteReview,
        replyToReview,
        addPost,
        deletePost,
        addComment,
        deleteComment,
        addCollection,
        updateSpot,
        updateProfile,
        refreshNotifications,
        markNotificationRead: markRead,
        markAllNotificationsRead: markAllRead,
        submitVerification,
        placeOrder,
        setOrderStatus,
        reportContent,
        blockUser,
        unblockUser,
        deleteAccount,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useAppData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useAppData must be used within a DataProvider');
  return ctx;
}
