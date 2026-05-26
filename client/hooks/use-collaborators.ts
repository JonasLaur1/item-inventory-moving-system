import { useCallback, useEffect, useState } from "react";

import { collaboratorService, type CollaboratorEntry } from "@/lib/collaborator.service";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

type UseCollaboratorsResult = {
  collaborators: CollaboratorEntry[];
  isLoading: boolean;
  isRefreshing: boolean;
  isAdding: boolean;
  isRemoving: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  addByEmail: (email: string) => Promise<void>;
  remove: (collaboratorId: string) => Promise<void>;
  clearError: () => void;
};

export function useCollaborators(locationId: string): UseCollaboratorsResult {
  const [collaborators, setCollaborators] = useState<CollaboratorEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCollaborators = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await collaboratorService.listCollaborators(locationId);
      setCollaborators(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to load collaborators."));
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [locationId]);

  useEffect(() => {
    void loadCollaborators(false);
  }, [loadCollaborators]);

  const refresh = useCallback(async () => {
    await loadCollaborators(true);
  }, [loadCollaborators]);

  const addByEmail = useCallback(
    async (email: string) => {
      setIsAdding(true);
      setErrorMessage(null);

      try {
        await collaboratorService.addCollaboratorByEmail(locationId, email);
        await loadCollaborators(true);
      } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to add collaborator."));
      } finally {
        setIsAdding(false);
      }
    },
    [locationId, loadCollaborators],
  );

  const remove = useCallback(
    async (collaboratorId: string) => {
      setIsRemoving(true);
      setErrorMessage(null);

      try {
        await collaboratorService.removeCollaborator(locationId, collaboratorId);
        await loadCollaborators(true);
      } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to remove collaborator."));
      } finally {
        setIsRemoving(false);
      }
    },
    [locationId, loadCollaborators],
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    collaborators,
    isLoading,
    isRefreshing,
    isAdding,
    isRemoving,
    errorMessage,
    refresh,
    addByEmail,
    remove,
    clearError,
  };
}
