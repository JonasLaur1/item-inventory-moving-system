import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { SectionHeader } from "@/components/ui/section-header";
import { CardGrid } from "@/components/ui/card-grid";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { AppModal } from "@/components/ui/app-modal";
import { Colors } from "@/constants/theme";
import { ROOM_SUGGESTION_KEYS } from "@/constants/room-suggestions";
import { useRooms } from "@/hooks/use-rooms";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { locationService, type LocationDetails } from "@/lib/location.service";
import { type RoomSummary } from "@/lib/room.service";
import { getLocationIcon } from "@/utils/location-icon";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LocationDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const hasFocusedOnceRef = useRef(false);
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const isNarrow = width < 360;

  const locationId = useMemo(() => {
    if (!params.id) return "";
    return Array.isArray(params.id) ? params.id[0] ?? "" : params.id;
  }, [params.id]);

  const [location, setLocation] = useState<LocationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedLocationName, setEditedLocationName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [editNameError, setEditNameError] = useState<string | null>(null);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editedAddress, setEditedAddress] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [editAddressError, setEditAddressError] = useState<string | null>(null);

  const [isDeletingLocation, setIsDeletingLocation] = useState(false);
  const [deleteLocationError, setDeleteLocationError] = useState<string | null>(null);
  const [isDeleteLocationModalOpen, setIsDeleteLocationModalOpen] = useState(false);

  const {
    rooms,
    isLoading: isRoomsLoading,
    isCreating: isCreatingRoom,
    isUpdating: isUpdatingRoom,
    isDeleting: isDeletingRoom,
    refreshRooms,
    createRoom,
    updateRoom,
    deleteRoom,
  } = useRooms(locationId);

  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [addRoomName, setAddRoomName] = useState("");
  const [addRoomError, setAddRoomError] = useState<string | null>(null);

  const [roomToRename, setRoomToRename] = useState<RoomSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameRoomError, setRenameRoomError] = useState<string | null>(null);

  const [roomToDelete, setRoomToDelete] = useState<RoomSummary | null>(null);
  const [deleteRoomError, setDeleteRoomError] = useState<string | null>(null);

  const getKindLabel = useCallback((kind: LocationDetails["kind"]): string => {
    if (kind === "start") return t("locationDetail.kindStart");
    if (kind === "destination") return t("locationDetail.kindDestination");
    return t("locationDetail.kindOther");
  }, [t]);

  const loadLocation = useCallback(
    async (refresh: boolean) => {
      if (!locationId) {
        setErrorMessage(t("locationDetail.missingId"));
        setLocation(null);
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
        const details = await locationService.getLocationDetails(locationId);
        setLocation(details);
        setErrorMessage(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : t("locationDetail.failedLoad");
        setErrorMessage(message);
      } finally {
        if (refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [locationId, t],
  );

  useEffect(() => {
    void loadLocation(false);
  }, [loadLocation]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      void loadLocation(true);
    }, [loadLocation]),
  );

  useEffect(() => {
    if (!location || isEditingName) return;
    setEditedLocationName(location.name);
  }, [isEditingName, location]);


  const openNameEditor = useCallback(() => {
    if (!location) return;
    setEditedLocationName(location.name);
    setEditNameError(null);
    setIsEditingName(true);
  }, [location]);

  const cancelNameEditor = useCallback(() => {
    setEditedLocationName(location?.name ?? "");
    setEditNameError(null);
    setIsEditingName(false);
  }, [location?.name]);

  const saveLocationName = useCallback(async () => {
    if (!location) return;
    const normalizedName = editedLocationName.trim();
    if (!normalizedName) {
      setEditNameError(t("locationDetail.nameRequired"));
      return;
    }
    if (normalizedName === location.name) {
      setEditNameError(null);
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    setEditNameError(null);
    try {
      await locationService.updateLocationName(location.id, normalizedName);
      setLocation((prev) => (prev ? { ...prev, name: normalizedName } : prev));
      setIsEditingName(false);
      await loadLocation(true);
    } catch (error) {
      setEditNameError(error instanceof Error ? error.message : t("locationDetail.failedUpdateName"));
    } finally {
      setIsSavingName(false);
    }
  }, [editedLocationName, loadLocation, location, t]);

  const openAddressEditor = useCallback(() => {
    setEditedAddress(location?.address ?? "");
    setEditAddressError(null);
    setIsEditingAddress(true);
  }, [location?.address]);

  const cancelAddressEditor = useCallback(() => {
    setEditedAddress(location?.address ?? "");
    setEditAddressError(null);
    setIsEditingAddress(false);
  }, [location?.address]);

  const saveLocationAddress = useCallback(async () => {
    if (!location) return;
    const normalizedAddress = editedAddress.trim() || null;
    setIsSavingAddress(true);
    setEditAddressError(null);
    try {
      await locationService.updateLocationAddress(location.id, normalizedAddress);
      setLocation((prev) => (prev ? { ...prev, address: normalizedAddress } : prev));
      setIsEditingAddress(false);
    } catch (error) {
      setEditAddressError(error instanceof Error ? error.message : t("locationDetail.failedUpdateAddress"));
    } finally {
      setIsSavingAddress(false);
    }
  }, [editedAddress, location, t]);

  const openDeleteLocationModal = useCallback(() => {
    if (!location) return;
    setDeleteLocationError(null);
    setIsDeleteLocationModalOpen(true);
  }, [location]);

  const closeDeleteLocationModal = useCallback(() => {
    if (isDeletingLocation) return;
    setIsDeleteLocationModalOpen(false);
    setDeleteLocationError(null);
  }, [isDeletingLocation]);

  const deleteLocation = useCallback(async () => {
    if (!location) return;
    setIsDeletingLocation(true);
    setDeleteLocationError(null);
    try {
      await locationService.deleteLocation(location.id);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/rooms");
      }
    } catch (error) {
      setDeleteLocationError(error instanceof Error ? error.message : t("locationDetail.failedDeleteLocation"));
    } finally {
      setIsDeletingLocation(false);
    }
  }, [location, router, t]);

  const openAddRoomModal = useCallback(() => {
    setAddRoomName("");
    setAddRoomError(null);
    setIsAddRoomModalOpen(true);
  }, []);

  const closeAddRoomModal = useCallback(() => {
    if (isCreatingRoom) return;
    setIsAddRoomModalOpen(false);
    setAddRoomName("");
    setAddRoomError(null);
  }, [isCreatingRoom]);

  const handleAddRoom = useCallback(async () => {
    const trimmed = addRoomName.trim();
    if (!trimmed) {
      setAddRoomError(t("locationDetail.roomNameRequired"));
      return;
    }
    setAddRoomError(null);
    Keyboard.dismiss();
    try {
      await createRoom({ locationId, name: trimmed });
      setIsAddRoomModalOpen(false);
      setAddRoomName("");
      void loadLocation(true);
    } catch (error) {
      setAddRoomError(error instanceof Error ? error.message : t("locationDetail.failedAddRoom"));
    }
  }, [addRoomName, createRoom, locationId, loadLocation, t]);

  const handleRoomSuggestionPress = useCallback((suggestion: string) => {
    setAddRoomName(suggestion);
    setAddRoomError(null);
  }, []);

  const openRenameRoomModal = useCallback((room: RoomSummary) => {
    setRenameValue(room.name);
    setRenameRoomError(null);
    setRoomToRename(room);
  }, []);

  const closeRenameRoomModal = useCallback(() => {
    if (isUpdatingRoom) return;
    setRoomToRename(null);
    setRenameValue("");
    setRenameRoomError(null);
  }, [isUpdatingRoom]);

  const confirmRenameRoom = useCallback(async () => {
    if (!roomToRename) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameRoomError(t("locationDetail.roomNameRequired"));
      return;
    }
    setRenameRoomError(null);
    Keyboard.dismiss();
    try {
      await updateRoom(roomToRename.id, { name: trimmed });
      setRoomToRename(null);
      setRenameValue("");
    } catch (error) {
      setRenameRoomError(error instanceof Error ? error.message : t("locationDetail.failedRenameRoom"));
    }
  }, [roomToRename, renameValue, updateRoom, t]);

  const openDeleteRoomModal = useCallback((room: RoomSummary) => {
    setDeleteRoomError(null);
    setRoomToDelete(room);
  }, []);

  const closeDeleteRoomModal = useCallback(() => {
    if (isDeletingRoom) return;
    setRoomToDelete(null);
    setDeleteRoomError(null);
  }, [isDeletingRoom]);

  const confirmDeleteRoom = useCallback(async () => {
    if (!roomToDelete) return;
    setDeleteRoomError(null);
    try {
      await deleteRoom(roomToDelete.id);
      setRoomToDelete(null);
      void loadLocation(true);
    } catch (error) {
      setDeleteRoomError(error instanceof Error ? error.message : t("locationDetail.failedDeleteRoom"));
    }
  }, [deleteRoom, roomToDelete, loadLocation, t]);

  if (isLoading && !location) {
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
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: isCompact ? 16 : 20, paddingTop: 10, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadLocation(true)} />}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-card border border-border-default bg-bg-elevated"
          >
            <Feather name="arrow-left" size={18} color={themeColors.textPrimary} />
          </Pressable>
          <Text className="text-base font-semibold text-text-primary">{t("locationDetail.title")}</Text>
          {location?.isOwner ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/location-settings/[id]",
                  params: { id: locationId, name: location.name },
                })
              }
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-card border border-border-default bg-bg-elevated"
            >
              <Feather name="settings" size={18} color={themeColors.textPrimary} />
            </Pressable>
          ) : (
            <View className="h-10 w-10" />
          )}
        </View>

        {errorMessage ? (
          <RetryErrorCard
            message={errorMessage}
            isRetrying={isRefreshing}
            retryingLabel={t("common.refreshing")}
            onRetry={() => void loadLocation(true)}
            className="mt-6"
          />
        ) : null}

        {location ? (
          <>
            <View className="mt-6 rounded-card border border-border-default bg-bg-elevated/70 p-4">
              <View className="flex-row items-start gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                  <MaterialCommunityIcons
                    name={getLocationIcon(location.name)}
                    size={22}
                    color={themeColors.primary}
                  />
                </View>
                <View className="flex-1">
                  {isEditingName ? (
                    <>
                      <FormInput
                        value={editedLocationName}
                        onChangeText={setEditedLocationName}
                        placeholder={t("locationDetail.locationNamePlaceholder")}
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
                          onPress={() => void saveLocationName()}
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
                        <Text className="text-lg font-bold leading-6 text-text-primary">{location.name}</Text>
                        <Text className="mt-1 text-xs text-text-tertiary">
                          {getKindLabel(location.kind)} • {location.rooms} {t("locationDetail.rooms").toLowerCase()} • {location.items} {t("locationDetail.boxes").toLowerCase()}
                        </Text>
                        {location.isOwner ? (
                          <Pressable onPress={openAddressEditor} hitSlop={4} className="mt-1.5 flex-row items-center gap-1">
                            <Feather name="map-pin" size={11} color={themeColors.textTertiary} />
                            <Text className="text-xs text-text-tertiary" numberOfLines={1}>
                              {location.address ?? t("locationDetail.addAddress")}
                            </Text>
                          </Pressable>
                        ) : location.address ? (
                          <View className="mt-1.5 flex-row items-center gap-1">
                            <Feather name="map-pin" size={11} color={themeColors.textTertiary} />
                            <Text className="text-xs text-text-tertiary" numberOfLines={1}>
                              {location.address}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {location.isOwner ? (
                        <>
                          <Pressable
                            onPress={openNameEditor}
                            hitSlop={8}
                            className="h-10 w-10 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
                            disabled={isDeletingLocation}
                          >
                            <Feather name="edit-2" size={18} color={themeColors.textPrimary} />
                          </Pressable>
                          <Pressable
                            onPress={openDeleteLocationModal}
                            hitSlop={8}
                            className="h-10 w-10 items-center justify-center rounded-full border border-crimson/40 bg-crimson/10"
                            disabled={isDeletingLocation}
                          >
                            <Feather name="trash-2" size={18} color={themeColors.crimson} />
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
              <MetricCard
                label={t("locationDetail.rooms")}
                value={String(location.rooms)}
                style={{ width: isNarrow ? "100%" : "48.5%" }}
              />
              <MetricCard
                label={t("locationDetail.packedBoxes")}
                value={String(location.packedBoxes)}
                style={{ width: isNarrow ? "100%" : "48.5%" }}
              />
            </View>

            <View className="mt-8">
              <SectionHeader
                title={t("locationDetail.rooms")}
                actionLabel={location.isOwner ? t("locationDetail.addRoom") : undefined}
                onPressAction={location.isOwner ? openAddRoomModal : undefined}
              />

              {isRoomsLoading ? (
                <View className="mt-4 items-center">
                  <ActivityIndicator />
                </View>
              ) : rooms.length > 0 ? (
                <CardGrid
                  items={rooms}
                  compact={isCompact}
                  itemMinHeight={110}
                  className="mt-4"
                  keyExtractor={(room) => room.id}
                  renderItem={(room, contentStyle) => (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/inventory",
                          params: { locationName: location.name, roomName: room.name },
                        })
                      }
                      className="rounded-card border border-border-default bg-bg-elevated/75"
                      style={contentStyle}
                    >
                      <View className="flex-1 p-3">
                        <View className="flex-row items-start justify-between">
                          <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                            <MaterialCommunityIcons
                              name={getLocationIcon(room.name)}
                              size={20}
                              color={themeColors.primary}
                            />
                          </View>
                          {location.isOwner ? (
                            <View className="flex-row gap-1">
                              <Pressable
                                onPress={() => openRenameRoomModal(room)}
                                hitSlop={6}
                                disabled={isUpdatingRoom || isDeletingRoom}
                                className="h-7 w-7 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
                              >
                                <Feather name="edit-2" size={12} color={themeColors.textSecondary} />
                              </Pressable>
                              <Pressable
                                onPress={() => openDeleteRoomModal(room)}
                                hitSlop={6}
                                disabled={room.boxes > 0 || isDeletingRoom}
                                className={`h-7 w-7 items-center justify-center rounded-full border ${
                                  room.boxes > 0
                                    ? "border-border-default bg-bg-base opacity-30"
                                    : "border-crimson/40 bg-crimson/10"
                                }`}
                              >
                                <Feather
                                  name="trash-2"
                                  size={12}
                                  color={room.boxes > 0 ? themeColors.textTertiary : themeColors.crimson}
                                />
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                        <Text className="mt-2 text-sm font-semibold text-text-primary" numberOfLines={2}>
                          {room.name}
                        </Text>
                        <Text className="mt-0.5 text-xs text-text-tertiary">
                          {room.boxes} {room.boxes === 1 ? t("locationDetail.box") : t("locationDetail.boxes")}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  footer={
                    location.isOwner
                      ? (contentStyle) => (
                          <Pressable
                            onPress={openAddRoomModal}
                            className="items-center justify-center rounded-card border border-dashed border-border-strong bg-bg-elevated/40"
                            style={contentStyle}
                          >
                            <Feather name="plus" size={20} color={themeColors.primary} />
                            <Text className="mt-2 text-xs font-medium text-text-secondary">{t("locationDetail.addRoom")}</Text>
                          </Pressable>
                        )
                      : undefined
                  }
                />
              ) : (
                <>
                  <EmptyStateCard
                    title={t("locationDetail.noRoomsYet")}
                    description={t("locationDetail.noRoomsYetDesc")}
                    containerClassName="mt-4"
                  />
                  {location.isOwner ? (
                    <Button label={t("locationDetail.addRoom")} onPress={openAddRoomModal} className="mt-4" />
                  ) : null}
                </>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <AppModal
        visible={isEditingAddress}
        title={t("locationDetail.addressTitle")}
        description={t("locationDetail.addressDesc")}
        onRequestClose={cancelAddressEditor}
        maxWidth={420}
      >
        <FormInput
          value={editedAddress}
          onChangeText={setEditedAddress}
          placeholder={t("locationDetail.addressPlaceholder")}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={120}
          editable={!isSavingAddress}
        />
        {editAddressError ? (
          <Text className="mt-2 text-xs text-crimson">{editAddressError}</Text>
        ) : null}
        <View className={`${editAddressError ? "mt-4" : "mt-5"} flex-row gap-3`}>
          <Button
            label={t("common.cancel")}
            variant="secondary"
            onPress={cancelAddressEditor}
            disabled={isSavingAddress}
            className="flex-1"
          />
          <Button
            label={isSavingAddress ? t("common.saving") : t("common.save")}
            onPress={() => void saveLocationAddress()}
            disabled={isSavingAddress}
            className="flex-1"
          />
        </View>
      </AppModal>

      <AppModal
        visible={isDeleteLocationModalOpen}
        title={t("locationDetail.deleteLocation")}
        description={
          location
            ? t("locationDetail.deleteLocationDesc", { name: location.name })
            : t("locationDetail.deleteLocationFallback")
        }
        onRequestClose={closeDeleteLocationModal}
        maxWidth={420}
      >
        {deleteLocationError ? <Text className="text-xs text-crimson">{deleteLocationError}</Text> : null}
        <View className={`${deleteLocationError ? "mt-4" : ""} flex-row gap-3`}>
          <Button
            label={t("common.cancel")}
            variant="secondary"
            onPress={closeDeleteLocationModal}
            disabled={isDeletingLocation}
            className="flex-1"
          />
          <Button
            label={isDeletingLocation ? t("common.deleting") : t("common.delete")}
            variant="secondary"
            onPress={() => void deleteLocation()}
            disabled={isDeletingLocation}
            className="flex-1 border-crimson/60 bg-crimson/10"
            textClassName="text-crimson"
          />
        </View>
      </AppModal>

      <AppModal
        visible={isAddRoomModalOpen}
        title={t("locationDetail.addRoomModalTitle")}
        description={t("locationDetail.addRoomModalDesc")}
        onRequestClose={closeAddRoomModal}
        maxWidth={420}
      >
        <View className="flex-row flex-wrap gap-2">
          {ROOM_SUGGESTION_KEYS.map((key) => {
            const label = t(`roomSuggestions.${key}`);
            return (
              <Pressable
                key={key}
                onPress={() => handleRoomSuggestionPress(label)}
                disabled={isCreatingRoom}
                className={`rounded-control border px-3 py-2 ${
                  addRoomName === label
                    ? "border-primary bg-primary/15"
                    : "border-border-default bg-bg-input/60"
                }`}
              >
                <Text className="text-sm font-semibold text-text-primary">{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View className="mt-4">
          <FormInput
            value={addRoomName}
            onChangeText={(text) => {
              setAddRoomName(text);
              setAddRoomError(null);
            }}
            placeholder={t("locationDetail.locationNamePlaceholder")}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isCreatingRoom}
            maxLength={60}
          />
        </View>
        {addRoomError ? <Text className="mt-2 text-xs text-crimson">{addRoomError}</Text> : null}
        <View className={`${addRoomError ? "mt-4" : "mt-5"} flex-row gap-3`}>
          <Button
            label={t("common.cancel")}
            variant="secondary"
            onPress={closeAddRoomModal}
            disabled={isCreatingRoom}
            className="flex-1"
          />
          <Button
            label={isCreatingRoom ? t("common.adding") : t("common.add")}
            onPress={() => void handleAddRoom()}
            disabled={isCreatingRoom}
            className="flex-1"
          />
        </View>
      </AppModal>

      <AppModal
        visible={roomToRename !== null}
        title={t("locationDetail.renameRoom")}
        description={t("locationDetail.renameRoomDesc")}
        onRequestClose={closeRenameRoomModal}
        maxWidth={420}
      >
        <FormInput
          value={renameValue}
          onChangeText={(text) => {
            setRenameValue(text);
            setRenameRoomError(null);
          }}
          placeholder={t("locationDetail.locationNamePlaceholder")}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isUpdatingRoom}
          maxLength={60}
        />
        {renameRoomError ? <Text className="mt-2 text-xs text-crimson">{renameRoomError}</Text> : null}
        <View className={`${renameRoomError ? "mt-4" : "mt-5"} flex-row gap-3`}>
          <Button
            label={t("common.cancel")}
            variant="secondary"
            onPress={closeRenameRoomModal}
            disabled={isUpdatingRoom}
            className="flex-1"
          />
          <Button
            label={isUpdatingRoom ? t("common.saving") : t("common.save")}
            onPress={() => void confirmRenameRoom()}
            disabled={isUpdatingRoom}
            className="flex-1"
          />
        </View>
      </AppModal>

      <AppModal
        visible={roomToDelete !== null}
        title={t("locationDetail.deleteRoomModalTitle")}
        description={
          roomToDelete
            ? t("locationDetail.deleteRoomModalDesc", { name: roomToDelete.name })
            : t("locationDetail.deleteLocationFallback")
        }
        onRequestClose={closeDeleteRoomModal}
        maxWidth={420}
      >
        {deleteRoomError ? <Text className="text-xs text-crimson">{deleteRoomError}</Text> : null}
        <View className={`${deleteRoomError ? "mt-4" : ""} flex-row gap-3`}>
          <Button
            label={t("common.cancel")}
            variant="secondary"
            onPress={closeDeleteRoomModal}
            disabled={isDeletingRoom}
            className="flex-1"
          />
          <Button
            label={isDeletingRoom ? t("common.deleting") : t("common.delete")}
            variant="secondary"
            onPress={() => void confirmDeleteRoom()}
            disabled={isDeletingRoom}
            className="flex-1 border-crimson/60 bg-crimson/10"
            textClassName="text-crimson"
          />
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
