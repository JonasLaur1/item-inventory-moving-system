import { Button } from "@/components/button";
import { RoomCard, type RoomCardProps } from "@/components/home/room-card";
import { SectionHeader } from "@/components/ui/section-header";
import { CardGrid } from "@/components/ui/card-grid";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { SearchBar } from "@/components/ui/search-bar";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { CreateLocationModal } from "@/components/inventory/create-location-modal";
import { Colors } from "@/constants/theme";
import { useLocations } from "@/hooks/use-locations";
import { useRooms } from "@/hooks/use-rooms";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { getLocationIcon } from "@/utils/location-icon";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View, useWindowDimensions } from "react-native";

const ROOM_GRID_CARD_MIN_HEIGHT = 170;

export default function RoomsTabScreen() {
  const router = useRouter();
  const { selectId } = useLocalSearchParams<{ selectId?: string }>();
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];
  const hasFocusedOnceRef = useRef(false);

  const {
    locations,
    isLoading: isLocationsLoading,
    isRefreshing,
    errorMessage,
    refreshLocations,
  } = useLocations();

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const {
    rooms,
    isLoading: isRoomsLoading,
    isRefreshing: isRoomsRefreshing,
    refreshRooms,
  } = useRooms(selectedLocationId || undefined);

  useEffect(() => {
    if (locations.length === 0) {
      setSelectedLocationId("");
      return;
    }
    if (selectId && locations.some((l) => l.id === selectId)) {
      setSelectedLocationId(selectId);
      return;
    }
    if (!locations.some((l) => l.id === selectedLocationId)) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectId, selectedLocationId]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      void Promise.all([refreshLocations(), refreshRooms()]);
    }, [refreshLocations, refreshRooms]),
  );

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? null,
    [locations, selectedLocationId],
  );

  const filteredRooms = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return rooms;
    return rooms.filter((r) => r.name.toLowerCase().includes(normalized));
  }, [rooms, search]);

  const showSegmented = locations.length >= 1 && locations.length <= 2;
  const showDropdown = locations.length > 2;

  return (
    <TabScreenLayout
      horizontalPadding={isCompact ? 16 : 20}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing || isRoomsRefreshing}
          onRefresh={() => void Promise.all([refreshLocations(), refreshRooms()])}
        />
      }
    >
      {errorMessage ? (
        <RetryErrorCard
          message={errorMessage}
          isRetrying={isRefreshing}
          retryingLabel="Refreshing..."
          onRetry={() => void refreshLocations()}
          className="mt-6"
        />
      ) : null}

      {showSegmented ? (
        <View className="mt-6 flex-row items-center gap-2">
          {locations.map((location) => (
            <Pressable
              key={location.id}
              onPress={() => setSelectedLocationId(location.id)}
              className={`flex-1 items-center rounded-control border py-2.5 ${
                location.id === selectedLocationId
                  ? "border-primary bg-primary/15"
                  : "border-border-default bg-bg-elevated/70"
              }`}
            >
              <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                {location.name}
              </Text>
            </Pressable>
          ))}
          {selectedLocation ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/location-settings/[id]",
                  params: { id: selectedLocation.id, name: selectedLocation.name },
                })
              }
              className="h-10 w-10 items-center justify-center rounded-control border border-border-default bg-bg-elevated/70"
            >
              <Feather name="settings" size={16} color={themeColors.textSecondary} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setIsAddLocationModalOpen(true)}
            className="h-10 w-10 items-center justify-center rounded-control border border-dashed border-border-strong bg-bg-elevated/40"
          >
            <Feather name="plus" size={16} color={themeColors.primary} />
          </Pressable>
        </View>
      ) : showDropdown ? (
        <View className="mt-6">
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setIsDropdownOpen((prev) => !prev)}
              className="flex-1 flex-row items-center justify-between rounded-control border border-border-default bg-bg-input/60 px-3 py-2.5"
            >
              <Text className="text-sm font-semibold text-text-primary">
                {selectedLocation?.name ?? "Select location"}
              </Text>
              <Feather
                name={isDropdownOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={themeColors.textSecondary}
              />
            </Pressable>
            {selectedLocation ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/location-settings/[id]",
                    params: { id: selectedLocation.id, name: selectedLocation.name },
                  })
                }
                className="h-[42px] w-[42px] items-center justify-center rounded-control border border-border-default bg-bg-elevated/70"
              >
                <Feather name="settings" size={16} color={themeColors.textSecondary} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setIsAddLocationModalOpen(true)}
              className="h-[42px] w-[42px] items-center justify-center rounded-control border border-dashed border-border-strong bg-bg-elevated/40"
            >
              <Feather name="plus" size={16} color={themeColors.primary} />
            </Pressable>
          </View>
          {isDropdownOpen ? (
            <View className="mt-2 gap-2">
              {locations.map((location) => {
                const isActive = location.id === selectedLocationId;
                return (
                  <Pressable
                    key={location.id}
                    onPress={() => {
                      setSelectedLocationId(location.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`rounded-control border px-3 py-2.5 ${
                      isActive ? "border-primary bg-primary/15" : "border-border-default bg-bg-input/60"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-text-primary">{location.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {selectedLocation ? (
        <View className="mt-4 flex-row gap-3">
          <MetricCard label="Boxes" value={String(selectedLocation.boxes)} style={{ flex: 1 }} />
          <MetricCard label="Items" value={String(selectedLocation.items)} style={{ flex: 1 }} />
        </View>
      ) : null}

      <View className="mt-5">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search rooms" />
      </View>

      <View className="mt-6">
        <SectionHeader title="Rooms" />
        {isRoomsLoading && rooms.length === 0 ? (
          <View className="mt-6 items-center">
            <ActivityIndicator />
          </View>
        ) : filteredRooms.length > 0 ? (
          <CardGrid
            items={filteredRooms}
            compact={isCompact}
            itemMinHeight={ROOM_GRID_CARD_MIN_HEIGHT}
            className="mt-4"
            keyExtractor={(room) => room.id}
            renderItem={(room, contentStyle) => (
              <RoomCard
                name={room.name}
                packed={room.packedBoxes}
                total={room.boxes}
                icon={getLocationIcon(room.name) as RoomCardProps["icon"]}
                style={contentStyle}
                onPress={() => router.push({ pathname: "/room/[id]", params: { id: room.id } })}
              />
            )}
          />
        ) : !isRoomsLoading && !isLocationsLoading && locations.length > 0 ? (
          <EmptyStateCard
            title={search.trim().length > 0 ? "No rooms match your search" : "No rooms yet"}
            description={
              search.trim().length > 0
                ? "Try a different search query."
                : "This location has no rooms."
            }
            containerClassName="mt-4"
          />
        ) : null}
      </View>

      {!isLocationsLoading && locations.length === 0 ? (
        <>
          <EmptyStateCard
            title="No locations yet"
            description="Create your first location to start organizing your inventory."
            containerClassName="mt-6"
          />
          <Button
            label="Create Location"
            onPress={() => setIsAddLocationModalOpen(true)}
            className="mt-4"
          />
        </>
      ) : null}

      <CreateLocationModal
        visible={isAddLocationModalOpen}
        onClose={() => {
          setIsAddLocationModalOpen(false);
          void refreshLocations();
        }}
        onCreated={(id) => {
          setSelectedLocationId(id);
        }}
      />
    </TabScreenLayout>
  );
}
