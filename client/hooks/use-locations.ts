import { useCallback, useEffect, useState } from "react";

import { locationService, type LocationSummary } from "@/lib/location.service";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

type UseLocationsResult = {
  locations: LocationSummary[];
  isLoading: boolean;
  isRefreshing: boolean;
  isCreating: boolean;
  errorMessage: string | null;
  refreshLocations: () => Promise<void>;
  createLocation: (name: string) => Promise<void>;
  clearError: () => void;
};

export function useLocations(): UseLocationsResult {
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

  return {
    locations,
    isLoading,
    isRefreshing,
    isCreating,
    errorMessage,
    refreshLocations,
    createLocation,
    clearError,
  };
}
