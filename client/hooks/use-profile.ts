import { useCallback, useEffect, useState } from "react";
import { profileService, type UserProfile } from "@/lib/profile.service";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

type UseProfileResult = {
  profile: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  saveErrorMessage: string | null;
  updateDisplayName: (name: string) => Promise<boolean>;
  clearSaveError: () => void;
};

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    profileService
      .getProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setErrorMessage(getErrorMessage(err, "Failed to load profile"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateDisplayName = useCallback(async (name: string): Promise<boolean> => {
    if (isSaving) return false;

    setIsSaving(true);
    setSaveErrorMessage(null);

    try {
      await profileService.updateDisplayName(name);
      setProfile((prev) => (prev ? { ...prev, displayName: name.trim() } : prev));
      return true;
    } catch (err) {
      setSaveErrorMessage(getErrorMessage(err, "Failed to update display name"));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  const clearSaveError = useCallback(() => setSaveErrorMessage(null), []);

  return { profile, isLoading, isSaving, errorMessage, saveErrorMessage, updateDisplayName, clearSaveError };
}
