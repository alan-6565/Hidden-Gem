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
