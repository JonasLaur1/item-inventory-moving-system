import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { RoomCard, type RoomCardProps } from "@/components/home/room-card";
import { SectionHeader } from "@/components/ui/section-header";
import { AppModal } from "@/components/ui/app-modal";
import { CardGrid } from "@/components/ui/card-grid";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { locationService, type LocationDetails } from "@/lib/location.service";
import { getLocationIcon } from "@/utils/location-icon";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getKindLabel(kind: LocationDetails["kind"]): string {
  if (kind === "start") {
    return "Start";
  }

  if (kind === "destination") {
    return "Destination";
  }

  return "Other";
}

export default function LocationDetailsScreen() {
  const router = useRouter();
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const hasFocusedOnceRef = useRef(false);
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const isNarrow = width < 360;

  const locationId = useMemo(() => {
    if (!params.id) {
      return "";
    }

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

  const [isDeletingLocation, setIsDeletingLocation] = useState(false);
  const [deleteLocationError, setDeleteLocationError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const loadLocation = useCallback(
    async (refresh: boolean) => {
      if (!locationId) {
        setErrorMessage("Location id is missing.");
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
        const message = error instanceof Error ? error.message : "Failed to load location.";
        setErrorMessage(message);
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
    if (!location || isEditingName) {
      return;
    }

    setEditedLocationName(location.name);
  }, [isEditingName, location]);

  const locationRooms = useMemo(
    () =>
      (location?.roomList ?? []).map((room) => ({
        id: room.id,
        name: room.name,
        packed: room.packedBoxes,
        total: room.boxes,
        icon: getLocationIcon(room.name) as RoomCardProps["icon"],
      })),
    [location?.roomList],
  );

  const hasRooms = locationRooms.length > 0;

  const openNameEditor = useCallback(() => {
    if (!location) {
      return;
    }

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
    if (!location) {
      return;
    }

    const normalizedName = editedLocationName.trim();
    if (!normalizedName) {
      setEditNameError("Location name is required.");
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
      setLocation((previousLocation) =>
        previousLocation ? { ...previousLocation, name: normalizedName } : previousLocation,
      );
      setIsEditingName(false);
      await loadLocation(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update location name.";
      setEditNameError(message);
    } finally {
      setIsSavingName(false);
    }
  }, [editedLocationName, loadLocation, location]);

  const deleteLocation = useCallback(async () => {
    if (!location) {
      return;
    }

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
      const message = error instanceof Error ? error.message : "Failed to delete location.";
      setDeleteLocationError(message);
    } finally {
      setIsDeletingLocation(false);
    }
  }, [location, router]);

  const openDeleteModal = useCallback(() => {
    if (!location) {
      return;
    }

    setDeleteLocationError(null);
    setIsDeleteModalOpen(true);
  }, [location]);

  const closeDeleteModal = useCallback(() => {
    if (isDeletingLocation) {
      return;
    }

    setIsDeleteModalOpen(false);
    setDeleteLocationError(null);
  }, [isDeletingLocation]);

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
          <Text className="text-base font-semibold text-text-primary">Location Details</Text>
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
            retryingLabel="Refreshing..."
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
                        placeholder="Location name"
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
                          onPress={() => void saveLocationName()}
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
                        <Text className="text-lg font-bold leading-6 text-text-primary">{location.name}</Text>
                        <Text className="mt-1 text-xs text-text-tertiary">
                          {getKindLabel(location.kind)} • {location.rooms} rooms • {location.items} items
                        </Text>
                      </View>
                      <Pressable
                        onPress={openNameEditor}
                        hitSlop={8}
                        className="h-10 w-10 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
                        disabled={isDeletingLocation}
                      >
                        <Feather name="edit-2" size={18} color={themeColors.textPrimary} />
                      </Pressable>
                      <Pressable
                        onPress={openDeleteModal}
                        hitSlop={8}
                        className={`h-10 w-10 items-center justify-center rounded-full border border-crimson/40 bg-crimson/10 ${hasRooms ? "opacity-40" : ""}`}
                        disabled={isDeletingLocation || hasRooms}
                      >
                        <Feather name="trash-2" size={18} color={themeColors.crimson} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {hasRooms ? (
              <Text className="mt-2 text-xs text-text-tertiary">Remove all rooms before deleting this location.</Text>
            ) : null}

            <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
              <MetricCard
                label="Rooms"
                value={String(location.rooms)}
                style={{ width: isNarrow ? "100%" : "48.5%" }}
              />
              <MetricCard
                label="Boxes"
                value={String(location.boxes)}
                style={{ width: isNarrow ? "100%" : "48.5%" }}
              />
              <MetricCard
                label="Packed"
                value={String(location.packedBoxes)}
                style={{ width: isNarrow ? "100%" : "48.5%" }}
              />
              <MetricCard
                label="Items"
                value={String(location.items)}
                style={{ width: isNarrow ? "100%" : "48.5%" }}
              />
            </View>

            <View className="mt-8">
              <SectionHeader title="Rooms" />
              {locationRooms.length > 0 ? (
                <CardGrid
                  items={locationRooms}
                  compact={isCompact}
                  className="mt-4"
                  keyExtractor={(room) => room.id}
                  renderItem={(room, contentStyle) => (
                    <RoomCard
                      name={room.name}
                      packed={room.packed}
                      total={room.total}
                      icon={room.icon}
                      style={contentStyle}
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/inventory",
                          params: { locationName: location.name, roomName: room.name },
                        })
                      }
                    />
                  )}
                />
              ) : (
                <EmptyStateCard
                  title="No rooms"
                  description="Rooms are set up when a location is created. Manage rooms via Settings → Location Configuration."
                  containerClassName="mt-4"
                />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <AppModal
        visible={isDeleteModalOpen}
        title="Delete location?"
        description={
          location
            ? `Delete "${location.name}" permanently. If this location still has rooms, deletion will be blocked.`
            : "Delete this location permanently."
        }
        onRequestClose={closeDeleteModal}
        maxWidth={420}
      >
        {deleteLocationError ? <Text className="text-xs text-crimson">{deleteLocationError}</Text> : null}

        <View className={`${deleteLocationError ? "mt-4" : ""} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeDeleteModal}
            disabled={isDeletingLocation}
            className="flex-1"
          />
          <Button
            label={isDeletingLocation ? "Deleting..." : "Delete"}
            variant="secondary"
            onPress={() => void deleteLocation()}
            disabled={isDeletingLocation}
            className="flex-1 border-crimson/60 bg-crimson/10"
            textClassName="text-crimson"
          />
        </View>
      </AppModal>
    </SafeAreaView>
  );
}

