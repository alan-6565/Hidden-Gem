import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Collection, Post, Review, Spot } from '../types';
import {
  fetchCollections,
  fetchPosts,
  fetchReviews,
  fetchSavedSpotIds,
  fetchSpots,
  insertReview,
  NewReviewInput,
  setSpotSaved,
} from '../lib/api';

interface DataContextValue {
  spots: Spot[];
  reviews: Review[];
  posts: Post[];
  collections: Collection[];
  savedSpotIds: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isSaved: (spotId: string) => boolean;
  toggleSaved: (spotId: string) => Promise<void>;
  addReview: (input: NewReviewInput) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedSpotIds, setSavedSpotIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [spotsData, reviewsData, postsData, collectionsData, savedData] = await Promise.all([
        fetchSpots(),
        fetchReviews(),
        fetchPosts(),
        fetchCollections(),
        fetchSavedSpotIds(),
      ]);
      setSpots(spotsData);
      setReviews(reviewsData);
      setPosts(postsData);
      setCollections(collectionsData);
      setSavedSpotIds(savedData);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isSaved = useCallback((spotId: string) => savedSpotIds.includes(spotId), [savedSpotIds]);

  const toggleSaved = useCallback(
    async (spotId: string) => {
      const currentlySaved = savedSpotIds.includes(spotId);
      setSavedSpotIds((prev) =>
        currentlySaved ? prev.filter((id) => id !== spotId) : [...prev, spotId],
      );
      try {
        await setSpotSaved(spotId, !currentlySaved);
      } catch (e) {
        setSavedSpotIds((prev) =>
          currentlySaved ? [...prev, spotId] : prev.filter((id) => id !== spotId),
        );
        throw e;
      }
    },
    [savedSpotIds],
  );

  const addReview = useCallback(async (input: NewReviewInput) => {
    const created = await insertReview(input);
    setReviews((prev) => [created, ...prev]);
  }, []);

  return (
    <DataContext.Provider
      value={{
        spots,
        reviews,
        posts,
        collections,
        savedSpotIds,
        loading,
        error,
        refresh: load,
        isSaved,
        toggleSaved,
        addReview,
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
