import { Review, Spot } from '../types';

export function getDisplayRating(spot: Spot, allReviews: Review[]): number {
  const spotReviews = allReviews.filter((r) => r.spotId === spot.id);
  if (spotReviews.length === 0) {
    return Math.round((spot.teaScore / 20) * 2) / 2;
  }
  const avg =
    spotReviews.reduce((sum, r) => sum + r.ratingOverall, 0) / spotReviews.length;
  return Math.round(avg * 2) / 2;
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
