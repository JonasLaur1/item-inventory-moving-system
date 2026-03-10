import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { locationService, type LocationSummary } from "@/lib/location.service";
import { getLocationIcon, type LocationIcon } from "@/utils/location-icon";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export type LocationRoom = {
  id: string;
  name: string;
  icon: LocationIcon;
  boxes: number;
  packedBoxes: number;
  items: number;
};

type UseLocationsResult = {
  locations: LocationSummary[];
  rooms: LocationRoom[];
  isLoading: boolean;
  isRefreshing: boolean;
  isCreating: boolean;
  errorMessage: string | null;
  refreshLocations: () => Promise<void>;
  createLocation: (name: string) => Promise<void>;
  clearError: () => void;
};

type LocationsProviderProps = {
  children: ReactNode;
};

const LocationsContext = createContext<UseLocationsResult | null>(null);

function useLocationsState(): UseLocationsResult {
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLocations = useCallback(async (refresh: boolean) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await locationService.listLocationSummaries();
      setLocations(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to load locations."));
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadLocations(false);
  }, [loadLocations]);

  const refreshLocations = useCallback(async () => {
    await loadLocations(true);
  }, [loadLocations]);

  const createLocation = useCallback(
    async (name: string) => {
      setIsCreating(true);
      setErrorMessage(null);

      try {
        await locationService.createLocation(name);
        await loadLocations(true);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to create location.");
        setErrorMessage(message);
        throw new Error(message);
      } finally {
        setIsCreating(false);
      }
    },
    [loadLocations],
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const rooms = useMemo<LocationRoom[]>(
    () =>
      locations.map((location) => ({
        id: location.id,
        name: location.name,
        icon: getLocationIcon(location.name),
        boxes: location.boxes,
        packedBoxes: location.packedBoxes,
        items: location.items,
      })),
    [locations],
  );

  return useMemo(
    () => ({
      locations,
      rooms,
      isLoading,
      isRefreshing,
      isCreating,
      errorMessage,
      refreshLocations,
      createLocation,
      clearError,
    }),
    [
      locations,
      rooms,
      isLoading,
      isRefreshing,
      isCreating,
      errorMessage,
      refreshLocations,
      createLocation,
      clearError,
    ],
  );
}

export function LocationsProvider({ children }: LocationsProviderProps) {
  const value = useLocationsState();
  return <LocationsContext.Provider value={value}>{children}</LocationsContext.Provider>;
}

export function useLocations(): UseLocationsResult {
  const context = useContext(LocationsContext);

  if (!context) {
    throw new Error("useLocations must be used within LocationsProvider.");
  }

  return context;
}
