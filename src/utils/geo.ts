import { Spot } from '../types';

export const MOCK_USER_LOCATION = { lat: 37.7749, lng: -122.4194 };

export function distanceMiles(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const R = 3958.8;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(miles: number): string {
  return miles < 0.1 ? '<0.1 mi' : `${miles.toFixed(1)} mi`;
}

export interface MapPoint {
  spot: Spot;
  x: number;
  y: number;
}

export function projectSpotsToMapCoords(
  spots: Spot[],
  width: number,
  height: number,
  padding = 40,
): MapPoint[] {
  if (spots.length === 0 || width === 0 || height === 0) return [];

  const lats = spots.map((s) => s.lat);
  const lngs = spots.map((s) => s.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;

  return spots.map((spot) => {
    const normX = (spot.lng - minLng) / lngRange;
    const normY = 1 - (spot.lat - minLat) / latRange;
    return {
      spot,
      x: padding + normX * (width - padding * 2),
      y: padding + normY * (height - padding * 2),
    };
  });
}
