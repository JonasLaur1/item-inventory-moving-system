import { useCallback, useEffect, useState } from "react";

import {
  boxService,
  type BoxSummary,
  type CreateBoxInput,
  type UpdateBoxInput,
} from "@/lib/box.service";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

type UseBoxesResult = {
  boxes: BoxSummary[];
  isLoading: boolean;
  isRefreshing: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  errorMessage: string | null;
  refreshBoxes: () => Promise<void>;
  createBox: (input: CreateBoxInput) => Promise<string>;
  updateBox: (boxId: string, input: UpdateBoxInput) => Promise<void>;
  deleteBox: (boxId: string) => Promise<void>;
  clearError: () => void;
};

export function useBoxes(): UseBoxesResult {
  const [boxes, setBoxes] = useState<BoxSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBoxes = useCallback(async (refresh: boolean) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await boxService.listBoxes();
      setBoxes(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to load boxes."));
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadBoxes(false);
  }, [loadBoxes]);

  const refreshBoxes = useCallback(async () => {
    await loadBoxes(true);
  }, [loadBoxes]);

  const createBox = useCallback(
    async (input: CreateBoxInput) => {
      setIsCreating(true);
      setErrorMessage(null);

      try {
        const boxId = await boxService.createBox(input);
        await loadBoxes(true);
        return boxId;
      } catch (error) {
        const message = getErrorMessage(error, "Failed to create box.");
        setErrorMessage(message);
        throw new Error(message);
      } finally {
        setIsCreating(false);
      }
    },
    [loadBoxes],
  );

  const updateBox = useCallback(
    async (boxId: string, input: UpdateBoxInput) => {
      setIsUpdating(true);
      setErrorMessage(null);

      try {
        await boxService.updateBox(boxId, input);
        await loadBoxes(true);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to update box.");
        setErrorMessage(message);
        throw new Error(message);
      } finally {
        setIsUpdating(false);
      }
    },
    [loadBoxes],
  );

  const deleteBox = useCallback(
    async (boxId: string) => {
      setIsDeleting(true);
      setErrorMessage(null);

      try {
        await boxService.deleteBox(boxId);
        await loadBoxes(true);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to delete box.");
        setErrorMessage(message);
        throw new Error(message);
      } finally {
        setIsDeleting(false);
      }
    },
    [loadBoxes],
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    boxes,
    isLoading,
    isRefreshing,
    isCreating,
    isUpdating,
    isDeleting,
    errorMessage,
    refreshBoxes,
    createBox,
    updateBox,
    deleteBox,
    clearError,
  };
}
