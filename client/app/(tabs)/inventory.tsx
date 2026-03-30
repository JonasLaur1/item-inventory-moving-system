import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { QuickActionCard } from "@/components/home/quick-action-card";
import { SectionHeader } from "@/components/ui/section-header";
import { BoxCard, type InventoryBox, type InventoryBoxStatus } from "@/components/inventory/box-card";
import { CreateLocationModal } from "@/components/inventory/create-location-modal";
import { AppModal } from "@/components/ui/app-modal";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FilterGroup } from "@/components/ui/filter-group";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { SearchBar } from "@/components/ui/search-bar";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { getMinutesAgo, formatRelativeTime } from "@/utils/time-formatting";
import { useBoxes } from "@/hooks/use-boxes";
import { useLocations } from "@/hooks/use-locations";
import { useRooms } from "@/hooks/use-rooms";
import { itemService } from "@/lib/item.service";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

type StatusFilter = "All" | InventoryBoxStatus | "Fragile";
type EditableStatus = "packed" | "unpacked";

const statusFilters: StatusFilter[] = ["All", "Packed", "Not packed", "Fragile"];
const editableStatuses: { label: string; value: EditableStatus }[] = [
  { label: "Packed", value: "packed" },
  { label: "Not packed", value: "unpacked" },
];

function formatUpdatedAt(isoDate: string | null): string {
  if (!isoDate) {
    return "Unknown";
  }

  return formatRelativeTime(getMinutesAgo(isoDate, Date.now()));
}

function mapBoxStatus(status: "packed" | "unpacked" | "delivered" | "unpacked_at_destination"): InventoryBoxStatus {
  switch (status) {
    case "packed":
      return "Packed";
    case "delivered":
      return "Delivered";
    case "unpacked_at_destination":
      return "Unpacked";
    default:
      return "Not packed";
  }
}

function parseQuantity(value: string): number | null {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return null;
  }

  return parsedValue;
}

export default function InventoryTabScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ create?: string | string[] }>();
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const isNarrow = width < 360;
  const hasFocusedOnceRef = useRef(false);
  const { resolvedTheme } = useThemePreference();
  const palette = Colors[resolvedTheme];

  const {
    boxes: summaryBoxes,
    isLoading,
    isRefreshing,
    isCreating,
    errorMessage,
    refreshBoxes,
    createBox,
    clearError,
  } = useBoxes();
  const {
    locations,
    isLoading: isLocationsLoading,
    isRefreshing: isLocationsRefreshing,
    errorMessage: locationErrorMessage,
    refreshLocations,
  } = useLocations();
  const { rooms, isLoading: isRoomsLoading, refreshRooms } = useRooms();

  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("All");
  const [activeRoom, setActiveRoom] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateLocationModalOpen, setIsCreateLocationModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxRoomId, setNewBoxRoomId] = useState("");
  const [newBoxStatus, setNewBoxStatus] = useState<EditableStatus>("unpacked");
  const [createBoxError, setCreateBoxError] = useState<string | null>(null);

  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemIsFragile, setNewItemIsFragile] = useState(false);
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemBoxId, setNewItemBoxId] = useState("");
  const [createItemError, setCreateItemError] = useState<string | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void Promise.all([refreshBoxes(), refreshLocations(), refreshRooms()]);
    }, [refreshBoxes, refreshLocations, refreshRooms]),
  );

  const availableRoomsForBox = useMemo(() => rooms, [rooms]);

  const availableBoxesForItem = useMemo(() => summaryBoxes, [summaryBoxes]);

  const boxes: InventoryBox[] = useMemo(
    () =>
      summaryBoxes.map((box) => ({
        id: box.id,
        label: box.name,
        room: `${box.parentLocationName} / ${box.roomName}`,
        itemsCount: box.itemsCount,
        isFragile: box.isFragile,
        status: mapBoxStatus(box.status),
        updatedAt: formatUpdatedAt(box.updatedAt),
      })),
    [summaryBoxes],
  );

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    if (!newBoxRoomId && availableRoomsForBox.length > 0) {
      setNewBoxRoomId(availableRoomsForBox[0].id);
    }
  }, [availableRoomsForBox, isCreateModalOpen, newBoxRoomId]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    if (newBoxRoomId && availableRoomsForBox.some((room) => room.id === newBoxRoomId)) {
      return;
    }

    setNewBoxRoomId(availableRoomsForBox[0]?.id ?? "");
  }, [availableRoomsForBox, isCreateModalOpen, newBoxRoomId]);

  useEffect(() => {
    if (!isCreateItemModalOpen) {
      return;
    }

    if (!newItemBoxId && availableBoxesForItem.length > 0) {
      setNewItemBoxId(availableBoxesForItem[0].id);
    }
  }, [availableBoxesForItem, isCreateItemModalOpen, newItemBoxId]);

  const packedCount = boxes.filter((box) => box.status === "Packed").length;
  const unpackedCount = boxes.length - packedCount;
  const totalItemsCount = summaryBoxes.reduce((total, box) => total + box.itemsCount, 0);
  const activeFilterCount = Number(activeStatus !== "All") + Number(activeRoom !== "All");
  const roomFilters = useMemo(
    () => [
      "All",
      ...rooms
        .map((r) => `${r.locationName} / ${r.name}`)
        .sort((a, b) => a.localeCompare(b)),
    ],
    [rooms],
  );

  useEffect(() => {
    if (activeRoom === "All") {
      return;
    }

    if (roomFilters.includes(activeRoom)) {
      return;
    }

    setActiveRoom("All");
  }, [activeRoom, roomFilters]);

  const filteredBoxes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return boxes.filter((box) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        box.label.toLowerCase().includes(normalizedSearch) ||
        box.room.toLowerCase().includes(normalizedSearch) ||
        box.id.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        activeStatus === "All" ||
        (activeStatus === "Fragile" ? box.isFragile : box.status === activeStatus);

      const matchesRoom = activeRoom === "All" || box.room === activeRoom;

      return matchesSearch && matchesStatus && matchesRoom;
    });
  }, [activeRoom, activeStatus, boxes, search]);

  const openCreateModal = useCallback(() => {
    clearError();
    setCreateBoxError(null);
    setNewBoxName("");
    setNewBoxStatus("unpacked");
    setNewBoxRoomId(availableRoomsForBox[0]?.id ?? "");
    setIsCreateModalOpen(true);
  }, [availableRoomsForBox, clearError]);

  const closeCreateModal = () => {
    if (isCreating) {
      return;
    }

    setIsCreateModalOpen(false);
    setCreateBoxError(null);
  };

  const openCreateItemModal = useCallback(() => {
    setCreateItemError(null);
    setNewItemName("");
    setNewItemQuantity("1");
    setNewItemIsFragile(false);
    setNewItemNotes("");
    setNewItemBoxId(availableBoxesForItem[0]?.id ?? "");
    setIsCreateItemModalOpen(true);
  }, [availableBoxesForItem]);

  const closeCreateItemModal = useCallback(() => {
    if (isCreatingItem) {
      return;
    }

    setIsCreateItemModalOpen(false);
    setCreateItemError(null);
  }, [isCreatingItem]);

  const shouldOpenCreateModal = useMemo(() => {
    if (!params.create) {
      return false;
    }

    const normalizedValue = Array.isArray(params.create) ? params.create[0] ?? "" : params.create;
    return normalizedValue === "1" || normalizedValue.toLowerCase() === "true";
  }, [params.create]);

  useEffect(() => {
    if (!shouldOpenCreateModal) {
      return;
    }

    openCreateModal();
    router.setParams({ create: undefined });
  }, [openCreateModal, router, shouldOpenCreateModal]);

  const handleCreateBox = async () => {
    const normalizedName = newBoxName.trim();

    if (!normalizedName) {
      setCreateBoxError("Box name is required.");
      return;
    }

    if (!newBoxRoomId) {
      setCreateBoxError("Room is required.");
      return;
    }

    setCreateBoxError(null);

    try {
      const createdId = await createBox({
        name: normalizedName,
        roomId: newBoxRoomId,
        status: newBoxStatus,
      });

      setIsCreateModalOpen(false);
      await Promise.all([refreshRooms(), refreshLocations()]);
      router.push({ pathname: "/box/[id]", params: { id: createdId } });
    } catch (error) {
      if (error instanceof Error) {
        setCreateBoxError(error.message);
        return;
      }

      setCreateBoxError("Failed to create box.");
    }
  };

  const handleCreateItem = useCallback(async () => {
    const normalizedName = newItemName.trim();
    if (!normalizedName) {
      setCreateItemError("Item name is required.");
      return;
    }

    const parsedQuantity = parseQuantity(newItemQuantity);
    if (!parsedQuantity) {
      setCreateItemError("Quantity must be a whole number greater than 0.");
      return;
    }

    if (!newItemBoxId) {
      setCreateItemError("Box is required.");
      return;
    }

    setIsCreatingItem(true);
    setCreateItemError(null);

    try {
      await itemService.createItem({
        name: normalizedName,
        quantity: parsedQuantity,
        isFragile: newItemIsFragile,
        notes: newItemNotes,
        boxId: newItemBoxId,
      });

      setIsCreateItemModalOpen(false);
      await Promise.all([refreshBoxes(), refreshRooms(), refreshLocations()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create item.";
      setCreateItemError(message);
    } finally {
      setIsCreatingItem(false);
    }
  }, [
    newItemBoxId,
    newItemIsFragile,
    newItemName,
    newItemNotes,
    newItemQuantity,
    refreshBoxes,
    refreshLocations,
    refreshRooms,
  ]);

  if (!isLocationsLoading && locations.length === 0) {
    return (
      <TabScreenLayout horizontalPadding={isCompact ? 16 : 20}>
        {locationErrorMessage ? (
          <RetryErrorCard
            message={locationErrorMessage}
            isRetrying={isLocationsRefreshing}
            retryingLabel="Refreshing..."
            onRetry={() => void refreshLocations()}
            className="mt-6"
          />
        ) : null}

        <EmptyStateCard
          title="No locations yet"
          description="Create your first location to start organizing rooms and boxes."
          containerClassName="mt-6"
        />
        <Button
          label="Create Location"
          onPress={() => setIsCreateLocationModalOpen(true)}
          className="mt-4"
        />

        <CreateLocationModal
          visible={isCreateLocationModalOpen}
          onClose={() => {
            setIsCreateLocationModalOpen(false);
            void refreshLocations();
          }}
        />
      </TabScreenLayout>
    );
  }

  return (
    <TabScreenLayout horizontalPadding={isCompact ? 16 : 20}>
      {errorMessage ? (
        <RetryErrorCard
          message={errorMessage}
          isRetrying={isRefreshing}
          retryingLabel="Refreshing..."
          onRetry={() => void refreshBoxes()}
          className="mt-6"
        />
      ) : null}

      <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
        <MetricCard
          label="Total Boxes"
          value={String(boxes.length)}
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
        <MetricCard
          label="Packed"
          value={String(packedCount)}
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
        <MetricCard
          label="Not packed"
          value={String(unpackedCount)}
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
        <MetricCard
          label="Total Items"
          value={String(totalItemsCount)}
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
      </View>

      <View className={`mt-6 gap-3 ${isCompact ? "" : "flex-row"}`}>
        <QuickActionCard
          title="Add Item"
          subtitle="Create and assign to box"
          icon="plus"
          variant="primary"
          onPress={openCreateItemModal}
          disabled={availableBoxesForItem.length === 0}
        />
        <QuickActionCard
          title="Add Box"
          subtitle="Create new box"
          icon="plus"
          variant="secondary"
          onPress={openCreateModal}
          disabled={availableRoomsForBox.length === 0}
        />
      </View>

      <View className="mt-6 flex-row gap-3">
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search box, room, or ID"
          containerClassName="flex-1"
        />
        <Pressable
          onPress={() => setIsFilterOpen((prev) => !prev)}
          className={`h-[48px] w-[48px] items-center justify-center rounded-control border ${
            isFilterOpen || activeFilterCount > 0
              ? "border-primary bg-primary/20"
              : "border-border-default bg-bg-elevated/70"
          }`}
        >
          <Feather
            name="sliders"
            size={16}
            color={
              isFilterOpen || activeFilterCount > 0 ? palette.primary : palette.textSecondary
            }
          />
          {activeFilterCount > 0 ? (
            <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1">
              <Text className="text-[10px] font-bold text-text-primary">{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {isFilterOpen ? (
        <View className="mt-3 rounded-card border border-border-default bg-bg-elevated/80 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-text-primary">Filters</Text>
            <Pressable
              onPress={() => {
                setActiveStatus("All");
                setActiveRoom("All");
              }}
            >
              <Text className="text-xs font-semibold text-text-link">Clear</Text>
            </Pressable>
          </View>

          <FilterGroup
            label="Status"
            options={statusFilters}
            activeValue={activeStatus}
            onSelect={setActiveStatus}
            className="mt-4"
          />

          <FilterGroup
            label="Room"
            options={roomFilters}
            activeValue={activeRoom}
            onSelect={setActiveRoom}
            className="mt-4"
          />
        </View>
      ) : null}

      <View className="mt-8">
        <SectionHeader title="Boxes & Items" actionLabel={`${filteredBoxes.length} boxes`} />
        <View className="mt-4 gap-3">
          {filteredBoxes.length > 0 ? (
            filteredBoxes.map((box) => (
              <BoxCard
                key={box.id}
                box={box}
                compact={isCompact}
                onPressOpen={() => router.push({ pathname: "/box/[id]", params: { id: box.id } })}
                onPressEdit={() => router.push({ pathname: "/box/[id]", params: { id: box.id, edit: "1" } })}
              />
            ))
          ) : (
            <EmptyStateCard
              title={
                isLoading || isRefreshing
                  ? "Loading boxes..."
                  : search.trim().length > 0 || activeFilterCount > 0
                    ? "No boxes found"
                    : "No boxes yet"
              }
              description={
                isLoading || isRefreshing
                  ? "Fetching your inventory boxes."
                  : search.trim().length > 0 || activeFilterCount > 0
                    ? "Try a different search query or filter combination."
                    : "Create your first box to start organizing your move."
              }
              containerClassName="p-5"
            />
          )}
        </View>
      </View>

      <AppModal
        visible={isCreateItemModalOpen}
        title="Create item"
        description="Set item details and select a box."
        onRequestClose={closeCreateItemModal}
        maxWidth={420}
      >
        <FormInput
          value={newItemName}
          onChangeText={setNewItemName}
          placeholder="Item name"
          autoCapitalize="sentences"
          autoCorrect={false}
          editable={!isCreatingItem}
          maxLength={120}
        />

        <View className="mt-4">
          <FormInput
            value={newItemQuantity}
            onChangeText={setNewItemQuantity}
            placeholder="Quantity"
            keyboardType="number-pad"
            editable={!isCreatingItem}
            maxLength={4}
          />
        </View>

        <View className="mt-4">
          <FormInput
            value={newItemNotes}
            onChangeText={setNewItemNotes}
            placeholder="Notes (optional)"
            autoCapitalize="sentences"
            editable={!isCreatingItem}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 84, paddingTop: 12 }}
            maxLength={300}
          />
        </View>

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Fragility</Text>
          <View className="mt-2 flex-row gap-2">
            <Pressable
              onPress={() => setNewItemIsFragile(false)}
              disabled={isCreatingItem}
              className={`flex-1 items-center rounded-control border py-2.5 ${
                !newItemIsFragile
                  ? "border-primary bg-primary/15"
                  : "border-border-default bg-bg-input/60"
              }`}
            >
              <Text className="text-sm font-semibold text-text-primary">Not fragile</Text>
            </Pressable>
            <Pressable
              onPress={() => setNewItemIsFragile(true)}
              disabled={isCreatingItem}
              className={`flex-1 items-center rounded-control border py-2.5 ${
                newItemIsFragile
                  ? "border-primary bg-primary/15"
                  : "border-border-default bg-bg-input/60"
              }`}
            >
              <Text className="text-sm font-semibold text-text-primary">Fragile</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Box</Text>
          <ScrollView className="mt-2" style={{ maxHeight: 200 }} showsVerticalScrollIndicator>
            <View className="gap-2">
              {availableBoxesForItem.length === 0 ? (
                <Text className="text-xs text-text-tertiary">
                  No boxes found in this location. Create a box first before adding items.
                </Text>
              ) : (
                availableBoxesForItem.map((box) => {
                  const isActive = box.id === newItemBoxId;
                  return (
                    <Pressable
                      key={box.id}
                      onPress={() => setNewItemBoxId(box.id)}
                      disabled={isCreatingItem}
                      className={`rounded-control border px-3 py-2.5 ${
                        isActive
                          ? "border-primary bg-primary/15"
                          : "border-border-default bg-bg-input/60"
                      }`}
                    >
                      <Text className="text-sm font-semibold text-text-primary">{box.name}</Text>
                      <Text className="mt-1 text-xs text-text-tertiary">
                        {box.parentLocationName} / {box.roomName}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>

        {createItemError ? (
          <Text className="mt-3 text-xs text-crimson">{createItemError}</Text>
        ) : null}

        <View className={`${createItemError ? "mt-4" : "mt-5"} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeCreateItemModal}
            disabled={isCreatingItem}
            className="flex-1"
          />
          <Button
            label={isCreatingItem ? "Creating..." : "Create"}
            onPress={() => void handleCreateItem()}
            disabled={isCreatingItem || availableBoxesForItem.length === 0}
            className="flex-1"
          />
        </View>
      </AppModal>

      <AppModal
        visible={isCreateModalOpen}
        title="Create box"
        description="Set a name, room, and status for your new box."
        onRequestClose={closeCreateModal}
        maxWidth={420}
      >
        <FormInput
          value={newBoxName}
          onChangeText={setNewBoxName}
          placeholder="Box name (e.g. Kitchen Box #1)"
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isCreating}
          maxLength={80}
        />

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Room</Text>
          <ScrollView className="mt-2" style={{ maxHeight: 200 }} showsVerticalScrollIndicator>
            <View className="gap-2">
              {availableRoomsForBox.length === 0 ? (
                <Text className="text-xs text-text-tertiary">
                  {isRoomsLoading
                    ? "Loading rooms..."
                    : "No rooms found in this location. Create a room first."}
                </Text>
              ) : (
                availableRoomsForBox.map((room) => {
                  const isActive = room.id === newBoxRoomId;
                  return (
                    <Pressable
                      key={room.id}
                      onPress={() => setNewBoxRoomId(room.id)}
                      disabled={isCreating}
                      className={`rounded-control border px-3 py-2.5 ${
                        isActive
                          ? "border-primary bg-primary/15"
                          : "border-border-default bg-bg-input/60"
                      }`}
                    >
                      <Text className="text-sm font-semibold text-text-primary">{room.name}</Text>
                      <Text className="mt-1 text-xs text-text-tertiary">{room.locationName}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Status</Text>
          <View className="mt-2 flex-row gap-2">
            {editableStatuses.map((option) => {
              const isActive = option.value === newBoxStatus;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setNewBoxStatus(option.value)}
                  disabled={isCreating}
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
            disabled={isCreating}
            className="flex-1"
          />
          <Button
            label={isCreating ? "Creating..." : "Create"}
            onPress={() => void handleCreateBox()}
            disabled={isCreating || availableRoomsForBox.length === 0}
            className="flex-1"
          />
        </View>
      </AppModal>
    </TabScreenLayout>
  );
}
