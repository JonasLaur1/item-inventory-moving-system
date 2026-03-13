import { useCallback, useEffect, useState } from "react";

import { activityService, type ActivityFeedEvent } from "@/lib/activity.service";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

type UseActivityHistoryResult = {
  events: ActivityFeedEvent[];
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  refreshActivity: () => Promise<void>;
  clearError: () => void;
};

export function useActivityHistory(limit = 200): UseActivityHistoryResult {
  const [events, setEvents] = useState<ActivityFeedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadActivity = useCallback(async (refresh: boolean) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await activityService.listRecentActivity(limit);
      setEvents(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to load activity history."));
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [limit]);

  useEffect(() => {
    void loadActivity(false);
  }, [loadActivity]);

  const refreshActivity = useCallback(async () => {
    await loadActivity(true);
  }, [loadActivity]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    events,
    isLoading,
    isRefreshing,
    errorMessage,
    refreshActivity,
    clearError,
  };
}
