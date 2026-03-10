import { Button } from "@/components/button";
import { DashboardCard } from "@/components/home/dashboard-card";
import { RoomCard, type RoomCardProps } from "@/components/home/room-card";
import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { SectionHeader } from "@/components/home/section-header";
import { CardGrid } from "@/components/ui/card-grid";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MetricCard } from "@/components/ui/metric-card";
import { SearchBar } from "@/components/ui/search-bar";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { FormInput } from "@/components/form-input";
import { Colors } from "@/constants/theme";
import { useLocations } from "@/hooks/use-locations";
import { getLocationIcon } from "@/utils/location-icon";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState, useMemo } from "react";
import { ActivityIndicator, Text, type ViewStyle } from "react-native";
import { View, useWindowDimensions } from "react-native";

type RoomStatus = "Done" | "Packing" | "Started" | "Empty";
type Room = {
  id: string;
  name: string;
  icon: RoomCardProps["icon"];
  boxes: number;
  packedBoxes: number;
  items: number;
};

const PREVIEW_ROOMS_COUNT = 5;
const ROOM_GRID_CARD_MIN_HEIGHT = 170;

function getRoomStatus(room: Pick<Room, "boxes" | "packedBoxes">): RoomStatus {
  const totalBoxes = Math.max(room.boxes, 0);
  const packedBoxes = Math.max(room.packedBoxes, 0);

  if (totalBoxes === 0 || packedBoxes === 0) {
    return "Empty";
  }

  const completionRatio = packedBoxes / totalBoxes;

  if (completionRatio >= 1) {
    return "Done";
  }

  if (completionRatio < 0.4) {
    return "Started";
  }

  return "Packing";
}

function AddRoomCard({
  style,
  disabled,
  onPress,
}: {
  style: ViewStyle;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <DashboardCard
      icon={<Feather name="plus" size={20} color={Colors.dark.primary} />}
      title="Add Room"
      subtitle="Create a new room"
      className="border border-dashed border-border-strong bg-bg-elevated/40"
      iconContainerClassName="h-14 w-14 rounded-xl bg-primary/20"
      titleClassName="text-base text-text-primary"
      subtitleClassName="text-xs text-text-tertiary"
      onPress={onPress}
      disabled={disabled}
      style={style}
    />
  );
}

export default function RoomsTabScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 400;

  const {
    locations,
    isLoading,
    isRefreshing,
    isCreating,
    errorMessage,
    refreshLocations,
    createLocation,
    clearError,
  } = useLocations();

  const [search, setSearch] = useState("");
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);
  const hasFocusedOnceRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void refreshLocations();
    }, [refreshLocations]),
  );

  const rooms: Room[] = useMemo(
    () =>
      locations.map((location) => ({
        id: location.id,
        name: location.name,
        icon: getLocationIcon(location.name),
        boxes: location.boxes,
        packedBoxes: location.packedBoxes,
        items: location.items,
      })),
    [locations],
  );

  const filteredRooms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return rooms;
    }

    return rooms.filter((room) => {
      const derivedStatus = getRoomStatus(room).toLowerCase();
      return (
        room.name.toLowerCase().includes(normalizedSearch) ||
        derivedStatus.includes(normalizedSearch)
      );
    });
  }, [rooms, search]);

  const totalItems = useMemo(
    () => filteredRooms.reduce((total, room) => total + room.items, 0),
    [filteredRooms],
  );

  const packedPercentage = useMemo(() => {
    const totalBoxes = filteredRooms.reduce((total, room) => total + room.boxes, 0);
    const packedBoxes = filteredRooms.reduce((total, room) => total + room.packedBoxes, 0);
    return totalBoxes === 0 ? 0 : Math.round((packedBoxes / totalBoxes) * 100);
  }, [filteredRooms]);

  const roomsWithLowProgress = useMemo(
    () =>
      filteredRooms
        .filter((room) => {
          const derivedStatus = getRoomStatus(room);
          return derivedStatus !== "Done" && derivedStatus !== "Empty";
        })
        .sort((a, b) => a.packedBoxes / Math.max(a.boxes, 1) - b.packedBoxes / Math.max(b.boxes, 1))
        .slice(0, 3),
    [filteredRooms],
  );
  const priorityRows: InventoryItemRowData[] = useMemo(
    () =>
      roomsWithLowProgress.map((room) => {
        const remainingBoxes = Math.max(room.boxes - room.packedBoxes, 0);
        return {
          id: `priority-${room.id}`,
          title: room.name,
          subtitle: `${remainingBoxes} boxes left to pack`,
          badgeText: "Prioritize",
          icon: "alert-circle",
        };
      }),
    [roomsWithLowProgress],
  );

  const canExpand = filteredRooms.length > PREVIEW_ROOMS_COUNT;
  const visibleRooms = showAllRooms ? filteredRooms : filteredRooms.slice(0, PREVIEW_ROOMS_COUNT);

  const openCreateRoomForm = () => {
    clearError();
    setCreateRoomError(null);
    setIsCreateRoomOpen(true);
  };

  const closeCreateRoomForm = () => {
    setIsCreateRoomOpen(false);
    setCreateRoomError(null);
    setNewRoomName("");
  };

  const handleCreateRoom = async () => {
    const normalizedName = newRoomName.trim();

    if (!normalizedName) {
      setCreateRoomError("Room name is required.");
      return;
    }

    setCreateRoomError(null);

    try {
      await createLocation(normalizedName);
      closeCreateRoomForm();
    } catch (error) {
      if (error instanceof Error) {
        setCreateRoomError(error.message);
        return;
      }

      setCreateRoomError("Failed to create room.");
    }
  };

  return (
    <TabScreenLayout horizontalPadding={isCompact ? 16 : 20}>
      {errorMessage ? (
        <View className="mt-6 rounded-card border border-border-default bg-bg-elevated/80 p-4">
          <Text className="text-sm font-semibold text-text-primary">{errorMessage}</Text>
          <Button
            label={isRefreshing ? "Refreshing..." : "Retry"}
            variant="secondary"
            onPress={() => void refreshLocations()}
            disabled={isRefreshing}
            className="mt-3"
            textClassName="text-sm"
          />
        </View>
      ) : null}

      <View className={`mt-6 gap-3 ${isCompact ? "" : "flex-row"}`}>
        <MetricCard
          label="Total Items"
          value={String(totalItems)}
          hint={`${filteredRooms.length} rooms`}
          className="flex-1"
          valueClassName="text-[30px] font-black leading-[34px] text-text-primary"
        />
        <MetricCard
          label="Packed"
          value={`${packedPercentage}%`}
          hint="By box completion"
          progress={packedPercentage}
          className="flex-1"
          valueClassName="text-[30px] font-black leading-[34px] text-text-primary"
        />
      </View>

      <View className="mt-5">
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search rooms or status"
        />
      </View>

      <View className="mt-8">
        <SectionHeader
          title="Rooms"
          actionLabel={canExpand ? (showAllRooms ? "Show Less" : "View All") : undefined}
          onPressAction={canExpand ? () => setShowAllRooms((prev) => !prev) : undefined}
        />

        {isCreateRoomOpen ? (
          <View className="mt-4 rounded-card border border-border-default bg-bg-elevated/75 p-4">
            <FormInput
              value={newRoomName}
              onChangeText={setNewRoomName}
              placeholder="Room name (e.g. Kitchen)"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={60}
            />

            {createRoomError ? (
              <Text className="mt-2 text-xs text-text-tertiary">{createRoomError}</Text>
            ) : null}

            <View className="mt-4 flex-row gap-3">
              <Button
                label={isCreating ? "Creating..." : "Create Room"}
                onPress={() => void handleCreateRoom()}
                disabled={isCreating}
                className="flex-1"
              />
              <Button
                label="Cancel"
                variant="secondary"
                onPress={closeCreateRoomForm}
                disabled={isCreating}
                className="flex-1"
              />
            </View>
          </View>
        ) : null}

        {isLoading && rooms.length === 0 ? (
          <View className="mt-6 items-center">
            <ActivityIndicator />
          </View>
        ) : (
          <CardGrid
            items={visibleRooms}
            compact={isCompact}
            itemMinHeight={ROOM_GRID_CARD_MIN_HEIGHT}
            className="mt-4"
            keyExtractor={(room) => room.id}
            renderItem={(room, contentStyle) => (
              <RoomCard
                name={room.name}
                packed={room.packedBoxes}
                total={room.boxes}
                icon={room.icon}
                style={contentStyle}
              />
            )}
            footer={(contentStyle) => (
              <AddRoomCard
                style={contentStyle}
                onPress={openCreateRoomForm}
                disabled={isCreating}
              />
            )}
          />
        )}

        {!isLoading && !errorMessage && filteredRooms.length === 0 ? (
          <EmptyStateCard
            title={search.trim().length > 0 ? "No rooms match your search" : "No rooms yet"}
            description={
              search.trim().length > 0
                ? "Try a different search query."
                : "Create your first room to start organizing your inventory."
            }
            containerClassName="mt-4"
          />
        ) : null}
      </View>

      <View className="mt-8">
        <SectionHeader title="Packing Priorities" actionLabel={`${roomsWithLowProgress.length} rooms`} />
        <View className="mt-4 gap-3">
          {roomsWithLowProgress.length === 0 ? (
            <EmptyStateCard
              title="Everything is on track"
              description="No active rooms need extra attention right now."
            />
          ) : (
            priorityRows.map((row) => <ItemRow key={row.id} item={row} />)
          )}
        </View>
      </View>
    </TabScreenLayout>
  );
}
