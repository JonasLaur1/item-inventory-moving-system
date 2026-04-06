import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { AppModal } from "@/components/ui/app-modal";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { Colors } from "@/constants/theme";
import { ROOM_SUGGESTIONS } from "@/constants/room-suggestions";
import { useRooms } from "@/hooks/use-rooms";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { type RoomSummary } from "@/lib/room.service";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ManageRoomsScreen() {
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];

  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const locationId = useMemo(
    () => (Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "")),
    [params.id],
  );
  const locationName = useMemo(
    () => (Array.isArray(params.name) ? (params.name[0] ?? "") : (params.name ?? "")),
    [params.name],
  );

  const { rooms, isLoading, isRefreshing, isCreating, isUpdating, isDeleting, errorMessage, refreshRooms, createRoom, updateRoom, deleteRoom, clearError } =
    useRooms(locationId);

  const [roomToDelete, setRoomToDelete] = useState<RoomSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [roomToRename, setRoomToRename] = useState<RoomSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addRoomName, setAddRoomName] = useState("");
  const [addRoomError, setAddRoomError] = useState<string | null>(null);

  const openDeleteModal = useCallback((room: RoomSummary) => {
    setDeleteError(null);
    setRoomToDelete(room);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeleting) return;
    setRoomToDelete(null);
    setDeleteError(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!roomToDelete) return;

    setDeleteError(null);
    try {
      await deleteRoom(roomToDelete.id);
      setRoomToDelete(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete room.");
    }
  }, [deleteRoom, roomToDelete]);

  const openAddModal = useCallback(() => {
    setAddRoomName("");
    setAddRoomError(null);
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    if (isCreating) return;
    setIsAddModalOpen(false);
    setAddRoomName("");
    setAddRoomError(null);
  }, [isCreating]);

  const handleAddRoom = useCallback(async () => {
    const trimmed = addRoomName.trim();
    if (!trimmed) {
      setAddRoomError("Room name is required.");
      return;
    }

    setAddRoomError(null);
    Keyboard.dismiss();

    try {
      await createRoom({ locationId, name: trimmed });
      setIsAddModalOpen(false);
      setAddRoomName("");
    } catch (error) {
      setAddRoomError(error instanceof Error ? error.message : "Failed to add room.");
    }
  }, [addRoomName, createRoom, locationId]);

  const handleSuggestionPress = useCallback((suggestion: string) => {
    setAddRoomName(suggestion);
    setAddRoomError(null);
  }, []);

  const openRenameModal = useCallback((room: RoomSummary) => {
    setRenameValue(room.name);
    setRenameError(null);
    setRoomToRename(room);
  }, []);

  const closeRenameModal = useCallback(() => {
    if (isUpdating) return;
    setRoomToRename(null);
    setRenameValue("");
    setRenameError(null);
  }, [isUpdating]);

  const confirmRename = useCallback(async () => {
    if (!roomToRename) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError("Room name is required.");
      return;
    }

    setRenameError(null);
    Keyboard.dismiss();

    try {
      await updateRoom(roomToRename.id, { name: trimmed });
      setRoomToRename(null);
      setRenameValue("");
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : "Failed to rename room.");
    }
  }, [roomToRename, renameValue, updateRoom]);

  const renderRoom = useCallback(
    ({ item: room }: { item: RoomSummary }) => {
      const canDelete = room.boxes === 0;

      return (
        <View className="mb-3 flex-row items-center justify-between rounded-card border border-border-default bg-bg-elevated px-4 py-3.5">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-text-primary">{room.name}</Text>
            <Text className="mt-0.5 text-xs text-text-tertiary">
              {room.boxes} {room.boxes === 1 ? "box" : "boxes"}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => openRenameModal(room)}
              hitSlop={8}
              disabled={isUpdating || isDeleting}
              className="h-9 w-9 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
            >
              <Feather name="edit-2" size={15} color={themeColors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => openDeleteModal(room)}
              hitSlop={8}
              disabled={!canDelete || isDeleting}
              className={`h-9 w-9 items-center justify-center rounded-full border ${
                canDelete
                  ? "border-crimson/40 bg-crimson/10"
                  : "border-border-default bg-bg-base opacity-30"
              }`}
            >
              <Feather
                name="trash-2"
                size={16}
                color={canDelete ? themeColors.crimson : themeColors.textTertiary}
              />
            </Pressable>
          </View>
        </View>
      );
    },
    [isDeleting, isUpdating, openDeleteModal, openRenameModal, themeColors],
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-5">
        <View className="flex-row items-center justify-between pt-3 pb-4">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-card border border-border-default bg-bg-elevated"
          >
            <Feather name="arrow-left" size={18} color={themeColors.textPrimary} />
          </Pressable>
          <View className="items-center">
            <Text className="text-base font-semibold text-text-primary">Manage Rooms</Text>
            {locationName ? (
              <Text className="text-xs text-text-tertiary">{locationName}</Text>
            ) : null}
          </View>
          <View className="h-10 w-10" />
        </View>

        {errorMessage ? (
          <RetryErrorCard
            message={errorMessage}
            isRetrying={isRefreshing}
            retryingLabel="Refreshing..."
            onRetry={() => {
              clearError();
              void refreshRooms();
            }}
            className="mb-4"
          />
        ) : null}

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void refreshRooms()}
              />
            }
            ListHeaderComponent={
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-text-secondary">
                  {rooms.length} {rooms.length === 1 ? "room" : "rooms"}
                </Text>
                <Pressable
                  onPress={openAddModal}
                  className="flex-row items-center gap-1.5 rounded-control border border-border-default bg-bg-elevated px-3 py-2"
                >
                  <Feather name="plus" size={14} color={themeColors.primary} />
                  <Text className="text-xs font-semibold text-primary">Add Room</Text>
                </Pressable>
              </View>
            }
            ListEmptyComponent={
              <EmptyStateCard
                title="No rooms yet"
                description="Add rooms to this location using the button above."
                containerClassName="mt-2"
              />
            }
            renderItem={renderRoom}
          />
        )}
      </View>

      <AppModal
        visible={roomToDelete !== null}
        title="Delete room?"
        description={
          roomToDelete
            ? `Delete "${roomToDelete.name}" permanently. This cannot be undone.`
            : "Delete this room permanently."
        }
        onRequestClose={closeDeleteModal}
        maxWidth={420}
      >
        {deleteError ? <Text className="text-xs text-crimson">{deleteError}</Text> : null}

        <View className={`${deleteError ? "mt-4" : ""} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeDeleteModal}
            disabled={isDeleting}
            className="flex-1"
          />
          <Button
            label={isDeleting ? "Deleting..." : "Delete"}
            variant="secondary"
            onPress={() => void confirmDelete()}
            disabled={isDeleting}
            className="flex-1 border-crimson/60 bg-crimson/10"
            textClassName="text-crimson"
          />
        </View>
      </AppModal>

      <AppModal
        visible={isAddModalOpen}
        title="Add Room"
        description="Choose a suggestion or enter a custom room name."
        onRequestClose={closeAddModal}
        maxWidth={420}
      >
        <View className="flex-row flex-wrap gap-2">
          {ROOM_SUGGESTIONS.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => handleSuggestionPress(suggestion)}
              disabled={isCreating}
              className={`rounded-control border px-3 py-2 ${
                addRoomName === suggestion
                  ? "border-primary bg-primary/15"
                  : "border-border-default bg-bg-input/60"
              }`}
            >
              <Text className="text-sm font-semibold text-text-primary">{suggestion}</Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-4">
          <FormInput
            value={addRoomName}
            onChangeText={(text) => {
              setAddRoomName(text);
              setAddRoomError(null);
            }}
            placeholder="Room name"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isCreating}
            maxLength={60}
          />
        </View>

        {addRoomError ? (
          <Text className="mt-2 text-xs text-crimson">{addRoomError}</Text>
        ) : null}

        <View className={`${addRoomError ? "mt-4" : "mt-5"} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeAddModal}
            disabled={isCreating}
            className="flex-1"
          />
          <Button
            label={isCreating ? "Adding..." : "Add"}
            onPress={() => void handleAddRoom()}
            disabled={isCreating}
            className="flex-1"
          />
        </View>
      </AppModal>
      <AppModal
        visible={roomToRename !== null}
        title="Rename Room"
        description="Enter a new name for this room."
        onRequestClose={closeRenameModal}
        maxWidth={420}
      >
        <FormInput
          value={renameValue}
          onChangeText={(text) => {
            setRenameValue(text);
            setRenameError(null);
          }}
          placeholder="Room name"
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isUpdating}
          maxLength={60}
        />

        {renameError ? (
          <Text className="mt-2 text-xs text-crimson">{renameError}</Text>
        ) : null}

        <View className={`${renameError ? "mt-4" : "mt-5"} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeRenameModal}
            disabled={isUpdating}
            className="flex-1"
          />
          <Button
            label={isUpdating ? "Saving..." : "Save"}
            onPress={() => void confirmRename()}
            disabled={isUpdating}
            className="flex-1"
          />
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
