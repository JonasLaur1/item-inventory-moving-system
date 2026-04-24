import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { SectionHeader } from "@/components/ui/section-header";
import { BoxCard, type InventoryBox, type InventoryBoxStatus } from "@/components/inventory/box-card";
import { AppModal } from "@/components/ui/app-modal";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { boxService } from "@/lib/box.service";
import { roomService, type RoomDetails } from "@/lib/room.service";
import { getLocationIcon } from "@/utils/location-icon";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type EditableStatus = "packed" | "unpacked";

function getMinutesAgo(occurredAt: string, nowMs: number): number {
  const timestamp = new Date(occurredAt).getTime();

  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, Math.floor((nowMs - timestamp) / (60 * 1000)));
}

function formatRelativeTime(minutesAgo: number, unknownLabel: string, justNowLabel: string): string {
  if (!Number.isFinite(minutesAgo) || minutesAgo < 0) {
    return unknownLabel;
  }

  if (minutesAgo < 1) {
    return justNowLabel;
  }

  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  if (minutesAgo < 24 * 60) {
    return `${Math.floor(minutesAgo / 60)}h ago`;
  }

  return `${Math.floor(minutesAgo / (24 * 60))}d ago`;
}

function formatUpdatedAt(isoDate: string | null, unknownLabel: string, justNowLabel: string): string {
  if (!isoDate) {
    return unknownLabel;
  }

  return formatRelativeTime(getMinutesAgo(isoDate, Date.now()), unknownLabel, justNowLabel);
}

function normalizeBoxStatus(status: string | null): InventoryBoxStatus {
  return status?.toLowerCase() === "packed" ? "Packed" : "Not packed";
}

export default function RoomDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];
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

  const [room, setRoom] = useState<RoomDetails | null>(null);
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

  const unknownLabel = t("common.unknown");
  const justNowLabel = t("common.justNow");

  const loadRoom = useCallback(
    async (refresh: boolean) => {
      if (!roomId) {
        setErrorMessage(t("roomDetail.missingId"));
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
        const details = await roomService.getRoomDetails(roomId);
        setRoom(details);
        setErrorMessage(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : t("roomDetail.failedLoad");
        setErrorMessage(message);
      } finally {
        if (refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [roomId, t],
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

  const hasBoxes = (room?.boxList?.length ?? 0) > 0;

  const boxes: InventoryBox[] = useMemo(() => {
    if (!room) {
      return [];
    }

    return room.boxList.map((box, index) => ({
      id: box.id,
      label: box.name || `Box #${index + 1}`,
      room: room.name,
      itemsCount: box.itemsCount,
      isFragile: box.isFragile,
      status: normalizeBoxStatus(box.status),
      updatedAt: formatUpdatedAt(box.updatedAt, unknownLabel, justNowLabel),
    }));
  }, [room, unknownLabel, justNowLabel]);

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
      setEditNameError(t("roomDetail.roomNameRequired"));
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
      await roomService.updateRoomName(room.id, normalizedName);
      setRoom((previousRoom) => (previousRoom ? { ...previousRoom, name: normalizedName } : previousRoom));
      setIsEditingName(false);
      await loadRoom(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("roomDetail.failedUpdateName");
      setEditNameError(message);
    } finally {
      setIsSavingName(false);
    }
  }, [editedRoomName, loadRoom, room, t]);

  const deleteRoom = useCallback(async () => {
    if (!room) {
      return;
    }

    setIsDeletingRoom(true);
    setDeleteRoomError(null);

    try {
      await roomService.deleteRoom(room.id);

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/rooms");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("roomDetail.failedDelete");
      setDeleteRoomError(message);
    } finally {
      setIsDeletingRoom(false);
    }
  }, [room, router, t]);

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
      setCreateBoxError(t("roomDetail.boxNameRequired"));
      return;
    }

    setIsCreatingBox(true);
    setCreateBoxError(null);

    try {
      const boxId = await boxService.createBox({
        name: normalizedName,
        roomId: room.id,
        status: newBoxStatus,
      });
      setIsCreateModalOpen(false);
      await loadRoom(true);
      router.push({ pathname: "/box/[id]", params: { id: boxId } });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("roomDetail.failedCreateBox");
      setCreateBoxError(message);
    } finally {
      setIsCreatingBox(false);
    }
  }, [loadRoom, newBoxName, newBoxStatus, room, router, t]);

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
                <Feather name="arrow-left" size={18} color={themeColors.textPrimary} />
              </Pressable>
              <Text className="text-base font-semibold text-text-primary">{t("roomDetail.title")}</Text>
              <View className="h-10 w-10" />
            </View>

            {errorMessage ? (
              <RetryErrorCard
                message={errorMessage}
                isRetrying={isRefreshing}
                retryingLabel={t("common.refreshing")}
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
                        color={themeColors.primary}
                      />
                    </View>
                    <View className="flex-1">
                      {isEditingName ? (
                        <>
                          <FormInput
                            value={editedRoomName}
                            onChangeText={setEditedRoomName}
                            placeholder={t("roomDetail.roomNamePlaceholder")}
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
                              label={isSavingName ? t("common.saving") : t("common.save")}
                              onPress={() => void saveRoomName()}
                              disabled={isSavingName}
                              className="flex-1"
                              textClassName="text-base"
                            />
                            <Button
                              label={t("common.cancel")}
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
                              {room.locationName} • {room.boxes} {t("roomDetail.boxes").toLowerCase()} • {room.items} {t("roomDetail.items").toLowerCase()}
                            </Text>
                          </View>
                          <Pressable
                            onPress={openNameEditor}
                            hitSlop={8}
                            className="h-10 w-10 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
                            disabled={isDeletingRoom}
                          >
                            <Feather name="edit-2" size={18} color={themeColors.textPrimary} />
                          </Pressable>
                          {room.isOwner ? (
                            <Pressable
                              onPress={openDeleteModal}
                              hitSlop={8}
                              className={`h-10 w-10 items-center justify-center rounded-full border border-crimson/40 bg-crimson/10 ${hasBoxes ? "opacity-40" : ""}`}
                              disabled={isDeletingRoom || hasBoxes}
                            >
                              <Feather name="trash-2" size={18} color={themeColors.crimson} />
                            </Pressable>
                          ) : null}
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {hasBoxes ? (
                  <Text className="mt-2 text-xs text-text-tertiary">{t("roomDetail.removeBoxesFirst")}</Text>
                ) : null}

                <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
                  <MetricCard
                    label={t("roomDetail.boxes")}
                    value={String(room.boxes)}
                    style={{ width: isNarrow ? "100%" : "48.5%" }}
                  />
                  <MetricCard
                    label={t("roomDetail.packed")}
                    value={String(room.packedBoxes)}
                    style={{ width: isNarrow ? "100%" : "48.5%" }}
                  />
                  <MetricCard
                    label={t("roomDetail.items")}
                    value={String(room.items)}
                    style={{ width: "100%" }}
                  />
                </View>

                <View className="mb-4 mt-8">
                  <SectionHeader
                    title={t("roomDetail.boxes")}
                    actionLabel={t("roomDetail.addBox")}
                    onPressAction={openCreateModal}
                  />
                </View>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          room ? (
            <EmptyStateCard
              title={t("roomDetail.noBoxesYet")}
              description={t("roomDetail.noBoxesYetDesc")}
            />
          ) : null
        }
        contentContainerStyle={{ paddingHorizontal: isCompact ? 16 : 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadRoom(true)} />}
      />

      <AppModal
        visible={isCreateModalOpen}
        title={t("roomDetail.addBox")}
        description={room
          ? t("roomDetail.createBoxDesc", { name: room.name })
          : t("roomDetail.createBoxFallback")}
        onRequestClose={closeCreateModal}
        maxWidth={420}
      >
        <FormInput
          value={newBoxName}
          onChangeText={setNewBoxName}
          placeholder={t("inventory.boxNamePlaceholder")}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isCreatingBox}
          maxLength={80}
        />

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">{t("inventory.status")}</Text>
          <View className="mt-2 flex-row gap-2">
            {(["unpacked", "packed"] as EditableStatus[]).map((value) => {
              const isActive = value === newBoxStatus;
              return (
                <Pressable
                  key={value}
                  onPress={() => setNewBoxStatus(value)}
                  disabled={isCreatingBox}
                  className={`flex-1 items-center rounded-control border py-2.5 ${
                    isActive
                      ? "border-primary bg-primary/15"
                      : "border-border-default bg-bg-input/60"
                  }`}
                >
                  <Text className="text-sm font-semibold text-text-primary">
                    {value === "packed" ? t("inventory.packed") : t("inventory.notPacked")}
                  </Text>
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
            label={t("common.cancel")}
            variant="secondary"
            onPress={closeCreateModal}
            disabled={isCreatingBox}
            className="flex-1"
          />
          <Button
            label={isCreatingBox ? t("common.creating") : t("common.create")}
            onPress={() => void createBoxInRoom()}
            disabled={isCreatingBox}
            className="flex-1"
          />
        </View>
      </AppModal>

      <AppModal
        visible={isDeleteModalOpen}
        title={t("roomDetail.deleteRoom")}
        description={
          room
            ? t("roomDetail.deleteRoomDesc", { name: room.name })
            : t("roomDetail.deleteRoomFallback")
        }
        onRequestClose={closeDeleteModal}
        maxWidth={420}
      >
        {deleteRoomError ? (
          <Text className="text-xs text-crimson">{deleteRoomError}</Text>
        ) : null}

        <View className={`${deleteRoomError ? "mt-4" : ""} flex-row gap-3`}>
          <Button
            label={t("common.cancel")}
            variant="secondary"
            onPress={closeDeleteModal}
            disabled={isDeletingRoom}
            className="flex-1"
          />
          <Button
            label={isDeletingRoom ? t("common.deleting") : t("common.delete")}
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
