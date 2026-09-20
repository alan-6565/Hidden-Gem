import { Review, Spot } from '../types';

// A spot with no reviews has no rating (0) — it used to fall back to
// teaScore / 20, which invented stars nobody had given. The UI shows "New".
export function getDisplayRating(spot: Spot, allReviews: Review[]): number {
  const spotReviews = allReviews.filter((r) => r.spotId === spot.id);
  if (spotReviews.length === 0) return 0;
  const avg =
    spotReviews.reduce((sum, r) => sum + r.ratingOverall, 0) / spotReviews.length;
  return Math.round(avg * 2) / 2;
}

// "4.5 (12)" for a reviewed spot, "New" for one nobody has reviewed yet.
export function formatRating(rating: number, count: number): string {
  return count === 0 ? 'New' : `${rating.toFixed(1)} (${count})`;
}

export function getReviewCount(spot: Spot, allReviews: Review[]): number {
  return allReviews.filter((r) => r.spotId === spot.id).length;
}

export function getRatingDistribution(spotId: string, allReviews: Review[]) {
  const counts = [0, 0, 0, 0, 0];
  allReviews
    .filter((r) => r.spotId === spotId)
    .forEach((r) => {
      const idx = Math.min(5, Math.max(1, Math.round(r.ratingOverall))) - 1;
      counts[idx] += 1;
    });
  return counts.reverse();
}
