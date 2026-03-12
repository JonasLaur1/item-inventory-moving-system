import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { SectionHeader } from "@/components/home/section-header";
import { BoxCard, type InventoryBox, type InventoryBoxStatus } from "@/components/inventory/box-card";
import { AppModal } from "@/components/ui/app-modal";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { Colors } from "@/constants/theme";
import { boxService } from "@/lib/box.service";
import { locationService, type LocationDetails } from "@/lib/location.service";
import { getLocationIcon } from "@/utils/location-icon";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type EditableStatus = "packed" | "unpacked";

const editableStatuses: { label: string; value: EditableStatus }[] = [
  { label: "Packed", value: "packed" },
  { label: "Unpacked", value: "unpacked" },
];

function getMinutesAgo(occurredAt: string, nowMs: number): number {
  const timestamp = new Date(occurredAt).getTime();

  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, Math.floor((nowMs - timestamp) / (60 * 1000)));
}

function formatRelativeTime(minutesAgo: number): string {
  if (!Number.isFinite(minutesAgo) || minutesAgo < 0) {
    return "Unknown";
  }

  if (minutesAgo < 1) {
    return "Just now";
  }

  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  if (minutesAgo < 24 * 60) {
    return `${Math.floor(minutesAgo / 60)}h ago`;
  }

  return `${Math.floor(minutesAgo / (24 * 60))}d ago`;
}

function formatUpdatedAt(isoDate: string | null): string {
  if (!isoDate) {
    return "Unknown";
  }

  return formatRelativeTime(getMinutesAgo(isoDate, Date.now()));
}

function normalizeBoxStatus(status: string | null): InventoryBoxStatus {
  return status?.toLowerCase() === "packed" ? "Packed" : "Unpacked";
}

export default function RoomDetailsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const isNarrow = width < 360;
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const hasFocusedOnceRef = useRef(false);

  const roomId = useMemo(() => {
    if (!params.id) {
      return "";
    }

    return Array.isArray(params.id) ? params.id[0] ?? "" : params.id;
  }, [params.id]);

  const [room, setRoom] = useState<LocationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedRoomName, setEditedRoomName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [deleteRoomError, setDeleteRoomError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxStatus, setNewBoxStatus] = useState<EditableStatus>("unpacked");
  const [createBoxError, setCreateBoxError] = useState<string | null>(null);
  const [isCreatingBox, setIsCreatingBox] = useState(false);

  const loadRoom = useCallback(
    async (refresh: boolean) => {
      if (!roomId) {
        setErrorMessage("Room id is missing.");
        setRoom(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const details = await locationService.getLocationDetails(roomId);
        setRoom(details);
        setErrorMessage(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load room.";
        setErrorMessage(message);
      } finally {
        if (refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [roomId],
  );

  useEffect(() => {
    void loadRoom(false);
  }, [loadRoom]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void loadRoom(true);
    }, [loadRoom]),
  );

  useEffect(() => {
    if (!room || isEditingName) {
      return;
    }

    setEditedRoomName(room.name);
  }, [room, isEditingName]);

  const boxes: InventoryBox[] = useMemo(() => {
    if (!room) {
      return [];
    }

    return room.boxList.map((box, index) => ({
      id: box.id,
      label: box.name || `Box #${index + 1}`,
      room: room.name,
      itemsCount: box.itemsCount,
      fragileCount: 0,
      status: normalizeBoxStatus(box.status),
      updatedAt: formatUpdatedAt(box.updatedAt),
    }));
  }, [room]);

  const openNameEditor = useCallback(() => {
    if (!room) {
      return;
    }

    setEditedRoomName(room.name);
    setEditNameError(null);
    setIsEditingName(true);
  }, [room]);

  const cancelNameEditor = useCallback(() => {
    setEditedRoomName(room?.name ?? "");
    setEditNameError(null);
    setIsEditingName(false);
  }, [room?.name]);

  const saveRoomName = useCallback(async () => {
    if (!room) {
      return;
    }

    const normalizedName = editedRoomName.trim();
    if (!normalizedName) {
      setEditNameError("Room name is required.");
      return;
    }

    if (normalizedName === room.name) {
      setEditNameError(null);
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    setEditNameError(null);

    try {
      await locationService.updateLocationName(room.id, normalizedName);
      setRoom((previousRoom) => (previousRoom ? { ...previousRoom, name: normalizedName } : previousRoom));
      setIsEditingName(false);
      await loadRoom(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update room name.";
      setEditNameError(message);
    } finally {
      setIsSavingName(false);
    }
  }, [editedRoomName, loadRoom, room]);

  const deleteRoom = useCallback(async () => {
    if (!room) {
      return;
    }

    setIsDeletingRoom(true);
    setDeleteRoomError(null);

    try {
      await locationService.deleteLocation(room.id);

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/rooms");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete room.";
      setDeleteRoomError(message);
    } finally {
      setIsDeletingRoom(false);
    }
  }, [room, router]);

  const openDeleteModal = useCallback(() => {
    if (!room) {
      return;
    }

    setDeleteRoomError(null);
    setIsDeleteModalOpen(true);
  }, [room]);

  const closeDeleteModal = useCallback(() => {
    if (isDeletingRoom) {
      return;
    }

    setIsDeleteModalOpen(false);
    setDeleteRoomError(null);
  }, [isDeletingRoom]);

  const openCreateModal = useCallback(() => {
    if (!room) {
      return;
    }

    setCreateBoxError(null);
    setNewBoxName("");
    setNewBoxStatus("unpacked");
    setIsCreateModalOpen(true);
  }, [room]);

  const closeCreateModal = useCallback(() => {
    if (isCreatingBox) {
      return;
    }

    setIsCreateModalOpen(false);
    setCreateBoxError(null);
  }, [isCreatingBox]);

  const createBoxInRoom = useCallback(async () => {
    if (!room) {
      return;
    }

    const normalizedName = newBoxName.trim();
    if (!normalizedName) {
      setCreateBoxError("Box name is required.");
      return;
    }

    setIsCreatingBox(true);
    setCreateBoxError(null);

    try {
      const boxId = await boxService.createBox({
        name: normalizedName,
        locationId: room.id,
        status: newBoxStatus,
      });
      setIsCreateModalOpen(false);
      await loadRoom(true);
      router.push({ pathname: "/box/[id]", params: { id: boxId } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create box.";
      setCreateBoxError(message);
    } finally {
      setIsCreatingBox(false);
    }
  }, [loadRoom, newBoxName, newBoxStatus, room, router]);

  if (isLoading && !room) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <FlatList
        className="flex-1"
        data={room ? boxes : []}
        keyExtractor={(box) => box.id}
        renderItem={({ item }) => (
          <BoxCard
            box={item}
            compact={isCompact}
            onPressOpen={() => router.push({ pathname: "/box/[id]", params: { id: item.id } })}
            onPressEdit={() => router.push({ pathname: "/box/[id]", params: { id: item.id, edit: "1" } })}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View className="mt-2">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-card border border-border-default bg-bg-elevated"
              >
                <Feather name="arrow-left" size={18} color={Colors.dark.textPrimary} />
              </Pressable>
              <Text className="text-base font-semibold text-text-primary">Room Details</Text>
              <View className="h-10 w-10" />
            </View>

            {errorMessage ? (
              <RetryErrorCard
                message={errorMessage}
                isRetrying={isRefreshing}
                retryingLabel="Refreshing..."
                onRetry={() => void loadRoom(true)}
                className="mt-6"
              />
            ) : null}

            {room ? (
              <>
                <View className="mt-6 rounded-card border border-border-default bg-bg-elevated/70 p-4">
                  <View className="flex-row items-center gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                      <MaterialCommunityIcons
                        name={getLocationIcon(room.name)}
                        size={22}
                        color={Colors.dark.primary}
                      />
                    </View>
                    <View className="flex-1">
                      {isEditingName ? (
                        <>
                          <FormInput
                            value={editedRoomName}
                            onChangeText={setEditedRoomName}
                            placeholder="Room name"
                            autoCapitalize="words"
                            autoCorrect={false}
                            maxLength={60}
                            editable={!isSavingName}
                            showDefaultBorder={false}
                          />

                          {editNameError ? (
                            <Text className="mt-2 text-xs text-text-tertiary">{editNameError}</Text>
                          ) : null}

                          <View className="mt-3 flex-row gap-2">
                            <Button
                              label={isSavingName ? "Saving..." : "Save"}
                              onPress={() => void saveRoomName()}
                              disabled={isSavingName}
                              className="flex-1"
                              textClassName="text-base"
                            />
                            <Button
                              label="Cancel"
                              variant="secondary"
                              onPress={cancelNameEditor}
                              disabled={isSavingName}
                              className="flex-1"
                              textClassName="text-base"
                            />
                          </View>
                        </>
                      ) : (
                        <View className="flex-row items-center gap-2">
                          <View className="flex-1">
                            <Text className="text-lg font-bold leading-6 text-text-primary">{room.name}</Text>
                            <Text className="mt-1 text-xs text-text-tertiary">
                              {room.boxes} boxes • {room.items} items
                            </Text>
                          </View>
                          <Pressable
                            onPress={openNameEditor}
                            hitSlop={8}
                            className="h-10 w-10 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
                            disabled={isDeletingRoom}
                          >
                            <Feather name="edit-2" size={18} color={Colors.dark.textPrimary} />
                          </Pressable>
                          <Pressable
                            onPress={openDeleteModal}
                            hitSlop={8}
                            className="h-10 w-10 items-center justify-center rounded-full border border-crimson/40 bg-crimson/10"
                            disabled={isDeletingRoom}
                          >
                            <Feather name="trash-2" size={18} color={Colors.dark.crimson} />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
                  <MetricCard
                    label="Boxes"
                    value={String(room.boxes)}
                    style={{ width: isNarrow ? "100%" : "48.5%" }}
                  />
                  <MetricCard
                    label="Packed"
                    value={String(room.packedBoxes)}
                    style={{ width: isNarrow ? "100%" : "48.5%" }}
                  />
                  <MetricCard
                    label="Items"
                    value={String(room.items)}
                    style={{ width: "100%" }}
                  />
                </View>

                <View className="mb-4 mt-8">
                  <SectionHeader title="Boxes" actionLabel="Add Box" onPressAction={openCreateModal} />
                </View>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          room ? (
            <EmptyStateCard
              title="No boxes yet"
              description="Create your first box for this room."
            />
          ) : null
        }
        contentContainerStyle={{ paddingHorizontal: isCompact ? 16 : 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      />

      <AppModal
        visible={isCreateModalOpen}
        title="Create box"
        description={room ? `This box will be created in "${room.name}".` : "Create a box."}
        onRequestClose={closeCreateModal}
        maxWidth={420}
      >
        <FormInput
          value={newBoxName}
          onChangeText={setNewBoxName}
          placeholder="Box name (e.g. Kitchen Box #1)"
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isCreatingBox}
          maxLength={80}
        />

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Status</Text>
          <View className="mt-2 flex-row gap-2">
            {editableStatuses.map((option) => {
              const isActive = option.value === newBoxStatus;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setNewBoxStatus(option.value)}
                  disabled={isCreatingBox}
                  className={`flex-1 items-center rounded-control border py-2.5 ${
                    isActive
                      ? "border-primary bg-primary/15"
                      : "border-border-default bg-bg-input/60"
                  }`}
                >
                  <Text className="text-sm font-semibold text-text-primary">{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {createBoxError ? (
          <Text className="mt-3 text-xs text-crimson">{createBoxError}</Text>
        ) : null}

        <View className={`${createBoxError ? "mt-4" : "mt-5"} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeCreateModal}
            disabled={isCreatingBox}
            className="flex-1"
          />
          <Button
            label={isCreatingBox ? "Creating..." : "Create"}
            onPress={() => void createBoxInRoom()}
            disabled={isCreatingBox}
            className="flex-1"
          />
        </View>
      </AppModal>

      <AppModal
        visible={isDeleteModalOpen}
        title="Delete room?"
        description={
          room
            ? `Delete "${room.name}" permanently. If this room still has boxes, deletion will be blocked.`
            : "Delete this room permanently."
        }
        onRequestClose={closeDeleteModal}
        maxWidth={420}
      >
        {deleteRoomError ? (
          <Text className="text-xs text-crimson">{deleteRoomError}</Text>
        ) : null}

        <View className={`${deleteRoomError ? "mt-4" : ""} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeDeleteModal}
            disabled={isDeletingRoom}
            className="flex-1"
          />
          <Button
            label={isDeletingRoom ? "Deleting..." : "Delete"}
            variant="secondary"
            onPress={() => void deleteRoom()}
            disabled={isDeletingRoom}
            className="flex-1 border-crimson/60 bg-crimson/10"
            textClassName="text-crimson"
          />
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
