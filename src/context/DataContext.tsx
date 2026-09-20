import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BusinessVerification, Collection, Comment, NewBusinessVerificationInput, Order, OrderStatus, Post, ReportTargetType, Review, Spot } from '../types';
import { useAuth } from './AuthContext';
import { CURRENT_USER_DISPLAY, getDisplayNameFromEmail } from '../constants';
import {
  blockUser as apiBlockUser,
  deleteOwnAccount,
  fetchBlockedUserIds,
  fetchCollections,
  fetchComments,
  fetchFollowingIds,
  fetchLikedPostIds,
  fetchLikedSpotIds,
  fetchMyVerifications,
  fetchOrders,
  fetchPosts,
  fetchReviews,
  fetchSavedPostIds,
  fetchSavedSpotIds,
  fetchSpots,
  insertComment,
  insertOrder,
  insertPost,
  insertReview,
  NewOrderInput,
  NewPostInput,
  NewReviewInput,
  setFollowing,
  setPostLiked,
  setPostSaved,
  setSpotHyped,
  setSpotSaved,
  SpotEditInput,
  submitBusinessVerification,
  submitReport,
  unblockUser as apiUnblockUser,
  updateOrderStatus as apiUpdateOrderStatus,
  updateReview as apiUpdateReview,
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
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isSaved: (spotId: string) => boolean;
  toggleSaved: (spotId: string) => Promise<void>;
  isSpotHyped: (spotId: string) => boolean;
  toggleSpotHype: (spotId: string) => Promise<void>;
  isPostLiked: (postId: string) => boolean;
  toggleLike: (postId: string) => Promise<void>;
  isPostSaved: (postId: string) => boolean;
  toggleSavePost: (postId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => Promise<void>;
  addReview: (input: NewReviewInput) => Promise<void>;
  editReview: (reviewId: string, input: NewReviewInput) => Promise<void>;
  addPost: (input: NewPostInput) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  updateSpot: (spotId: string, input: SpotEditInput) => Promise<void>;
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
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [myVerifications, setMyVerifications] = useState<BusinessVerification[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    if (MOCK_MODE) {
      setSpots(mockSpots);
      setReviews(mockReviews);
      setPosts(mockPosts);
      setCollections(mockCollections);
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
        likedData,
        savedPostData,
        verificationsData,
        blockedData,
        followingData,
      ] = await Promise.all([
        fetchSpots(),
        fetchReviews(),
        fetchPosts(),
        fetchComments(),
        fetchOrders(),
        fetchCollections(user.id),
        fetchSavedSpotIds(user.id),
        fetchLikedSpotIds(user.id),
        fetchLikedPostIds(user.id),
        fetchSavedPostIds(user.id),
        fetchMyVerifications(user.id),
        fetchBlockedUserIds(user.id),
        fetchFollowingIds(user.id),
      ]);
      setSpots(spotsData);
      setReviews(reviewsData);
      setPosts(postsData);
      setComments(commentsData);
      setOrders(ordersData);
      setCollections(collectionsData);
      setSavedSpotIds(savedData);
      setLikedSpotIds(likedSpotData);
      setLikedPostIds(likedData);
      setSavedPostIds(savedPostData);
      setMyVerifications(verificationsData);
      setBlockedUserIds(blockedData);
      setFollowingIds(followingData);
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

  const addReview = useCallback(
    async (input: NewReviewInput) => {
      if (!user) return;
      const displayName = getDisplayNameFromEmail(user.email);
      const created = await insertReview(user.id, displayName, CURRENT_USER_DISPLAY.avatar, input);
      setReviews((prev) => [created, ...prev]);
    },
    [user],
  );

  const editReview = useCallback(async (reviewId: string, input: NewReviewInput) => {
    const updated = await apiUpdateReview(reviewId, input);
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
  }, []);

  const addPost = useCallback(
    async (input: NewPostInput) => {
      if (!user) return;
      const displayName = getDisplayNameFromEmail(user.email);
      const created = await insertPost(user.id, displayName, CURRENT_USER_DISPLAY.avatar, input);
      setPosts((prev) => [created, ...prev]);
    },
    [user],
  );

  const addComment = useCallback(
    async (postId: string, text: string) => {
      if (!user) return;
      const displayName = getDisplayNameFromEmail(user.email);
      const created = await insertComment(user.id, displayName, CURRENT_USER_DISPLAY.avatar, postId, text);
      setComments((prev) => [...prev, created]);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)),
      );
    },
    [user],
  );

  const updateSpot = useCallback(async (spotId: string, input: SpotEditInput) => {
    const updated = await apiUpdateSpot(spotId, input);
    setSpots((prev) => prev.map((s) => (s.id === spotId ? updated : s)));
  }, []);

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
        loading,
        error,
        refresh: load,
        isSaved,
        toggleSaved,
        isSpotHyped,
        toggleSpotHype,
        isPostLiked,
        toggleLike,
        isPostSaved,
        toggleSavePost,
        isFollowing,
        toggleFollow,
        addReview,
        editReview,
        addPost,
        addComment,
        updateSpot,
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
