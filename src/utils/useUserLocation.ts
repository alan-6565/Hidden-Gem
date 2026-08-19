import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { MOCK_USER_LOCATION } from './geo';

interface UserLocationState {
  coords: { lat: number; lng: number };
  placeName: string | null;
  isRealLocation: boolean;
  loading: boolean;
  permissionDenied: boolean;
  refresh: () => Promise<void>;
}

export function useUserLocation(): UserLocationState {
  const [coords, setCoords] = useState(MOCK_USER_LOCATION);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [isRealLocation, setIsRealLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setCoords(nextCoords);
      setIsRealLocation(true);

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: nextCoords.lat,
          longitude: nextCoords.lng,
        });
        setPlaceName(place?.city ?? place?.subregion ?? place?.region ?? null);
      } catch {
        setPlaceName(null);
      }
    } catch {
      // Keep the fallback mock location if location services fail or time out.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { coords, placeName, isRealLocation, loading, permissionDenied, refresh };
}
