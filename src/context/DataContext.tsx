import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BusinessVerification, Collection, Comment, NewBusinessVerificationInput, Order, OrderStatus, Post, Review, Spot } from '../types';
import { useAuth } from './AuthContext';
import { CURRENT_USER_DISPLAY, getDisplayNameFromEmail } from '../constants';
import {
  fetchCollections,
  fetchComments,
  fetchLikedPostIds,
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
  setPostLiked,
  setPostSaved,
  setSpotSaved,
  SpotEditInput,
  submitBusinessVerification,
  updateOrderStatus as apiUpdateOrderStatus,
  updateSpot as apiUpdateSpot,
} from '../lib/api';

interface DataContextValue {
  spots: Spot[];
  reviews: Review[];
  posts: Post[];
  comments: Comment[];
  orders: Order[];
  collections: Collection[];
  savedSpotIds: string[];
  likedPostIds: string[];
  savedPostIds: string[];
  myVerifications: BusinessVerification[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isSaved: (spotId: string) => boolean;
  toggleSaved: (spotId: string) => Promise<void>;
  isPostLiked: (postId: string) => boolean;
  toggleLike: (postId: string) => Promise<void>;
  isPostSaved: (postId: string) => boolean;
  toggleSavePost: (postId: string) => Promise<void>;
  addReview: (input: NewReviewInput) => Promise<void>;
  addPost: (input: NewPostInput) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  updateSpot: (spotId: string, input: SpotEditInput) => Promise<void>;
  submitVerification: (input: NewBusinessVerificationInput) => Promise<BusinessVerification>;
  placeOrder: (input: NewOrderInput) => Promise<Order>;
  setOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedSpotIds, setSavedSpotIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [myVerifications, setMyVerifications] = useState<BusinessVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
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
        likedData,
        savedPostData,
        verificationsData,
      ] = await Promise.all([
        fetchSpots(),
        fetchReviews(),
        fetchPosts(),
        fetchComments(),
        fetchOrders(),
        fetchCollections(user.id),
        fetchSavedSpotIds(user.id),
        fetchLikedPostIds(user.id),
        fetchSavedPostIds(user.id),
        fetchMyVerifications(user.id),
      ]);
      setSpots(spotsData);
      setReviews(reviewsData);
      setPosts(postsData);
      setComments(commentsData);
      setOrders(ordersData);
      setCollections(collectionsData);
      setSavedSpotIds(savedData);
      setLikedPostIds(likedData);
      setSavedPostIds(savedPostData);
      setMyVerifications(verificationsData);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

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
        likedPostIds,
        savedPostIds,
        myVerifications,
        loading,
        error,
        refresh: load,
        isSaved,
        toggleSaved,
        isPostLiked,
        toggleLike,
        isPostSaved,
        toggleSavePost,
        addReview,
        addPost,
        addComment,
        updateSpot,
        submitVerification,
        placeOrder,
        setOrderStatus,
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
