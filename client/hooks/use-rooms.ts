import { useCallback, useEffect, useState } from "react";

import {
  roomService,
  type CreateRoomInput,
  type RoomSummary,
  type UpdateRoomInput,
} from "@/lib/room.service";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

type UseRoomsResult = {
  rooms: RoomSummary[];
  isLoading: boolean;
  isRefreshing: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  errorMessage: string | null;
  refreshRooms: () => Promise<void>;
  createRoom: (input: CreateRoomInput) => Promise<string>;
  updateRoom: (roomId: string, input: UpdateRoomInput) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  clearError: () => void;
};

export function useRooms(locationId?: string): UseRoomsResult {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRooms = useCallback(
    async (refresh: boolean) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await roomService.listRoomSummaries(locationId);
        setRooms(data);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to load rooms."));
      } finally {
        if (refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [locationId],
  );

  useEffect(() => {
    void loadRooms(false);
  }, [loadRooms]);

  const refreshRooms = useCallback(async () => {
    await loadRooms(true);
  }, [loadRooms]);

  const createRoom = useCallback(
    async (input: CreateRoomInput) => {
      setIsCreating(true);
      setErrorMessage(null);

      try {
        const roomId = await roomService.createRoom(input);
        await loadRooms(true);
        return roomId;
      } catch (error) {
        const message = getErrorMessage(error, "Failed to create room.");
        setErrorMessage(message);
        throw new Error(message);
      } finally {
        setIsCreating(false);
      }
    },
    [loadRooms],
  );

  const updateRoom = useCallback(
    async (roomId: string, input: UpdateRoomInput) => {
      setIsUpdating(true);
      setErrorMessage(null);

      try {
        await roomService.updateRoom(roomId, input);
        await loadRooms(true);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to update room.");
        setErrorMessage(message);
        throw new Error(message);
      } finally {
        setIsUpdating(false);
      }
    },
    [loadRooms],
  );

  const deleteRoom = useCallback(
    async (roomId: string) => {
      setIsDeleting(true);
      setErrorMessage(null);

      try {
        await roomService.deleteRoom(roomId);
        await loadRooms(true);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to delete room.");
        setErrorMessage(message);
        throw new Error(message);
      } finally {
        setIsDeleting(false);
      }
    },
    [loadRooms],
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    rooms,
    isLoading,
    isRefreshing,
    isCreating,
    isUpdating,
    isDeleting,
    errorMessage,
    refreshRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    clearError,
  };
}

