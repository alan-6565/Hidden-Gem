import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Collection, Post, Review, Spot } from '../types';
import { useAuth } from './AuthContext';
import { CURRENT_USER_DISPLAY, getDisplayNameFromEmail } from '../constants';
import {
  fetchCollections,
  fetchLikedPostIds,
  fetchPosts,
  fetchReviews,
  fetchSavedSpotIds,
  fetchSpots,
  insertPost,
  insertReview,
  NewPostInput,
  NewReviewInput,
  setPostLiked,
  setSpotSaved,
} from '../lib/api';

interface DataContextValue {
  spots: Spot[];
  reviews: Review[];
  posts: Post[];
  collections: Collection[];
  savedSpotIds: string[];
  likedPostIds: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isSaved: (spotId: string) => boolean;
  toggleSaved: (spotId: string) => Promise<void>;
  isPostLiked: (postId: string) => boolean;
  toggleLike: (postId: string) => Promise<void>;
  addReview: (input: NewReviewInput) => Promise<void>;
  addPost: (input: NewPostInput) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedSpotIds, setSavedSpotIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const [spotsData, reviewsData, postsData, collectionsData, savedData, likedData] = await Promise.all([
        fetchSpots(),
        fetchReviews(),
        fetchPosts(),
        fetchCollections(user.id),
        fetchSavedSpotIds(user.id),
        fetchLikedPostIds(user.id),
      ]);
      setSpots(spotsData);
      setReviews(reviewsData);
      setPosts(postsData);
      setCollections(collectionsData);
      setSavedSpotIds(savedData);
      setLikedPostIds(likedData);
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

  return (
    <DataContext.Provider
      value={{
        spots,
        reviews,
        posts,
        collections,
        savedSpotIds,
        likedPostIds,
        loading,
        error,
        refresh: load,
        isSaved,
        toggleSaved,
        isPostLiked,
        toggleLike,
        addReview,
        addPost,
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
