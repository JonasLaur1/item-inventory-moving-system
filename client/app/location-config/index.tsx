import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { AppModal } from "@/components/ui/app-modal";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { Colors } from "@/constants/theme";
import { useLocations } from "@/hooks/use-locations";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { locationService, type LocationSummary } from "@/lib/location.service";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useState } from "react";
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

export default function LocationConfigScreen() {
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];

  const { locations, isLoading, isRefreshing, errorMessage, refreshLocations } = useLocations();

  const [pendingDelete, setPendingDelete] = useState<LocationSummary | null>(null);
  const [isDeletingLocation, setIsDeletingLocation] = useState(false);
  const [deleteLocationError, setDeleteLocationError] = useState<string | null>(null);

  const [locationToRename, setLocationToRename] = useState<LocationSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenamingLocation, setIsRenamingLocation] = useState(false);
  const [renameLocationError, setRenameLocationError] = useState<string | null>(null);

  const openDeleteModal = useCallback((location: LocationSummary) => {
    setDeleteLocationError(null);
    setPendingDelete(location);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeletingLocation) return;
    setPendingDelete(null);
    setDeleteLocationError(null);
  }, [isDeletingLocation]);

  const openRenameModal = useCallback((location: LocationSummary) => {
    setRenameValue(location.name);
    setRenameLocationError(null);
    setLocationToRename(location);
  }, []);

  const closeRenameModal = useCallback(() => {
    if (isRenamingLocation) return;
    setLocationToRename(null);
    setRenameValue("");
    setRenameLocationError(null);
  }, [isRenamingLocation]);

  const confirmRename = useCallback(async () => {
    if (!locationToRename) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameLocationError("Location name is required.");
      return;
    }

    setRenameLocationError(null);
    setIsRenamingLocation(true);
    Keyboard.dismiss();

    try {
      await locationService.updateLocation(locationToRename.id, { name: trimmed });
      setLocationToRename(null);
      setRenameValue("");
      await refreshLocations();
    } catch (error) {
      setRenameLocationError(
        error instanceof Error ? error.message : "Failed to rename location.",
      );
    } finally {
      setIsRenamingLocation(false);
    }
  }, [locationToRename, renameValue, refreshLocations]);

  const handleDeleteLocation = useCallback(async () => {
    if (!pendingDelete) return;

    setIsDeletingLocation(true);
    setDeleteLocationError(null);

    try {
      await locationService.deleteLocation(pendingDelete.id);
      setPendingDelete(null);
      await refreshLocations();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete location.";
      setDeleteLocationError(message);
    } finally {
      setIsDeletingLocation(false);
    }
  }, [pendingDelete, refreshLocations]);

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
          <Text className="text-base font-semibold text-text-primary">Location Configuration</Text>
          <View className="h-10 w-10" />
        </View>

        {errorMessage ? (
          <RetryErrorCard
            message={errorMessage}
            isRetrying={isRefreshing}
            retryingLabel="Refreshing..."
            onRetry={() => void refreshLocations()}
            className="mb-4"
          />
        ) : null}

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void refreshLocations()}
              />
            }
            ListEmptyComponent={
              <EmptyStateCard
                title="No locations yet"
                description="Create a location first to configure its rooms."
                containerClassName="mt-4"
              />
            }
            renderItem={({ item: location }) => (
              <View className="mb-3 flex-row items-center gap-2">
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/location-config/[id]",
                      params: { id: location.id, name: location.name, address: location.address ?? "", isOwner: location.isOwner ? "1" : "0" },
                    })
                  }
                  className="flex-1 flex-row items-center justify-between rounded-card border border-border-default bg-bg-elevated px-4 py-4"
                >
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-text-primary">{location.name}</Text>
                    <Text className="mt-0.5 text-xs text-text-tertiary">
                      {location.rooms} {location.rooms === 1 ? "room" : "rooms"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={themeColors.textTertiary} />
                </Pressable>

                {location.isOwner ? (
                  <>
                    <Pressable
                      onPress={() => openRenameModal(location)}
                      hitSlop={4}
                      disabled={isRenamingLocation || isDeletingLocation}
                      className="h-14 w-12 items-center justify-center rounded-card border border-border-default bg-bg-elevated"
                    >
                      <Feather name="edit-2" size={17} color={themeColors.textSecondary} />
                    </Pressable>

                    <Pressable
                      onPress={() => openDeleteModal(location)}
                      disabled={location.rooms > 0}
                      hitSlop={4}
                      className={`h-14 w-12 items-center justify-center rounded-card border border-crimson/40 bg-crimson/10 ${
                        location.rooms > 0 ? "opacity-40" : ""
                      }`}
                    >
                      <Feather name="trash-2" size={18} color={themeColors.crimson} />
                    </Pressable>
                  </>
                ) : null}
              </View>
            )}
          />
        )}
      </View>

      <AppModal
        visible={pendingDelete !== null}
        title="Delete location?"
        description={
          pendingDelete
            ? `Delete "${pendingDelete.name}" permanently. This cannot be undone.`
            : ""
        }
        onRequestClose={closeDeleteModal}
        maxWidth={420}
      >
        {deleteLocationError ? (
          <Text className="text-xs text-crimson">{deleteLocationError}</Text>
        ) : null}
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
            onPress={() => void handleDeleteLocation()}
            disabled={isDeletingLocation}
            className="flex-1 border-crimson/60 bg-crimson/10"
            textClassName="text-crimson"
          />
        </View>
      </AppModal>
      <AppModal
        visible={locationToRename !== null}
        title="Rename Location"
        description="Enter a new name for this location."
        onRequestClose={closeRenameModal}
        maxWidth={420}
      >
        <FormInput
          value={renameValue}
          onChangeText={(text) => {
            setRenameValue(text);
            setRenameLocationError(null);
          }}
          placeholder="Location name"
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isRenamingLocation}
          maxLength={80}
        />

        {renameLocationError ? (
          <Text className="mt-2 text-xs text-crimson">{renameLocationError}</Text>
        ) : null}

        <View className={`${renameLocationError ? "mt-4" : "mt-5"} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeRenameModal}
            disabled={isRenamingLocation}
            className="flex-1"
          />
          <Button
            label={isRenamingLocation ? "Saving..." : "Save"}
            onPress={() => void confirmRename()}
            disabled={isRenamingLocation}
            className="flex-1"
          />
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
