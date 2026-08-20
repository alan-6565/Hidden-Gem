import { Review, Spot, SpotCategory } from '../types';
import { isOpenNow } from './hours';
import { distanceMiles } from './geo';
import { getDisplayRating } from './rating';
import { isPromoted } from './promotion';

export type SortBy = 'top_match' | 'distance' | 'rating';

export interface SearchFilterState {
  query: string;
  categories: SpotCategory[];
  openNow: boolean;
  outdoorSeating: boolean;
  petFriendly: boolean;
  goodForStudying: boolean;
  maxDistanceMiles: number;
  sortBy: SortBy;
}

export const DISTANCE_FILTER_MAX_MILES = 25;

export const DEFAULT_SEARCH_FILTERS: SearchFilterState = {
  query: '',
  categories: [],
  openNow: false,
  outdoorSeating: false,
  petFriendly: false,
  goodForStudying: false,
  maxDistanceMiles: DISTANCE_FILTER_MAX_MILES,
  sortBy: 'top_match',
};

export function applySearchFilters(
  spots: Spot[],
  filters: SearchFilterState,
  reviews: Review[],
  origin: { lat: number; lng: number } | null,
): Spot[] {
  const query = filters.query.trim().toLowerCase();

  let result = spots.filter((spot) => {
    if (query) {
      const matchesName = spot.name.toLowerCase().includes(query);
      const matchesTag = spot.tags.some((t) => t.toLowerCase().includes(query));
      if (!matchesName && !matchesTag) return false;
    }
    if (filters.categories.length > 0 && !filters.categories.includes(spot.category)) return false;
    if (filters.openNow && !isOpenNow(spot.hours)) return false;
    if (filters.outdoorSeating && !spot.tags.includes('outdoor seating')) return false;
    if (filters.petFriendly && !spot.tags.includes('pet friendly')) return false;
    if (filters.goodForStudying && !spot.tags.includes('study-friendly')) return false;
    if (origin && filters.maxDistanceMiles < DISTANCE_FILTER_MAX_MILES) {
      const dist = distanceMiles(origin, { lat: spot.lat, lng: spot.lng });
      if (dist > filters.maxDistanceMiles) return false;
    }
    return true;
  });

  if (filters.sortBy === 'distance' && origin) {
    result = [...result].sort(
      (a, b) =>
        distanceMiles(origin, { lat: a.lat, lng: a.lng }) -
        distanceMiles(origin, { lat: b.lat, lng: b.lng }),
    );
  } else if (filters.sortBy === 'rating') {
    result = [...result].sort((a, b) => getDisplayRating(b, reviews) - getDisplayRating(a, reviews));
  } else {
    // top_match: promoted spots surface first, otherwise keep the
    // incoming order (already tea_score-sorted from the DB fetch).
    result = [...result].sort((a, b) => Number(isPromoted(b)) - Number(isPromoted(a)));
  }

  return result;
}
