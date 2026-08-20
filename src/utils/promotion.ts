import { Spot } from '../types';

export function isPromoted(spot: Spot): boolean {
  if (!spot.promotedUntil) return false;
  return new Date(spot.promotedUntil).getTime() > Date.now();
}
