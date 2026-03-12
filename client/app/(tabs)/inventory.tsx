import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { QuickActionCard } from "@/components/home/quick-action-card";
import { SectionHeader } from "@/components/home/section-header";
import { BoxCard, type InventoryBox, type InventoryBoxStatus } from "@/components/inventory/box-card";
import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { AppModal } from "@/components/ui/app-modal";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FilterGroup } from "@/components/ui/filter-group";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { SearchBar } from "@/components/ui/search-bar";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Colors } from "@/constants/theme";
import { useBoxes } from "@/hooks/use-boxes";
import { useLocations } from "@/hooks/use-locations";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

type StatusFilter = "All" | InventoryBoxStatus | "Fragile";
type EditableStatus = "packed" | "unpacked";

const statusFilters: StatusFilter[] = ["All", "Packed", "Unpacked", "Fragile"];
const editableStatuses: { label: string; value: EditableStatus }[] = [
  { label: "Packed", value: "packed" },
  { label: "Unpacked", value: "unpacked" },
];

const unassignedItems: InventoryItemRowData[] = [
  { id: "u-1", title: "Laptop Charger", subtitle: "Office", badgeText: "Move soon" },
  { id: "u-2", title: "Photo Album", subtitle: "Living Room", badgeText: "Fragile" },
  { id: "u-3", title: "Tool Set", subtitle: "Garage", badgeText: "Heavy" },
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

function mapBoxStatus(status: "packed" | "unpacked"): InventoryBoxStatus {
  return status === "packed" ? "Packed" : "Unpacked";
}

export default function InventoryTabScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const isNarrow = width < 360;
  const hasFocusedOnceRef = useRef(false);

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
    refreshLocations,
  } = useLocations();

  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("All");
  const [activeRoom, setActiveRoom] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxLocationId, setNewBoxLocationId] = useState("");
  const [newBoxStatus, setNewBoxStatus] = useState<EditableStatus>("unpacked");
  const [createBoxError, setCreateBoxError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void Promise.all([refreshBoxes(), refreshLocations()]);
    }, [refreshBoxes, refreshLocations]),
  );

  const boxes: InventoryBox[] = useMemo(
    () =>
      summaryBoxes.map((box) => ({
        id: box.id,
        label: box.name,
        room: box.locationName,
        itemsCount: box.itemsCount,
        fragileCount: box.isFragile ? 1 : 0,
        status: mapBoxStatus(box.status),
        updatedAt: formatUpdatedAt(box.updatedAt),
      })),
    [summaryBoxes],
  );

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    if (!newBoxLocationId && locations.length > 0) {
      setNewBoxLocationId(locations[0].id);
    }
  }, [isCreateModalOpen, locations, newBoxLocationId]);

  const packedCount = boxes.filter((box) => box.status === "Packed").length;
  const unpackedCount = boxes.length - packedCount;
  const activeFilterCount = Number(activeStatus !== "All") + Number(activeRoom !== "All");
  const roomFilters = useMemo(
    () => ["All", ...Array.from(new Set(boxes.map((box) => box.room))).sort((a, b) => a.localeCompare(b))],
    [boxes],
  );

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
        (activeStatus === "Fragile" ? box.fragileCount > 0 : box.status === activeStatus);

      const matchesRoom = activeRoom === "All" || box.room === activeRoom;

      return matchesSearch && matchesStatus && matchesRoom;
    });
  }, [activeRoom, activeStatus, boxes, search]);

  const openCreateModal = () => {
    clearError();
    setCreateBoxError(null);
    setNewBoxName("");
    setNewBoxStatus("unpacked");
    setNewBoxLocationId(locations[0]?.id ?? "");
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) {
      return;
    }

    setIsCreateModalOpen(false);
    setCreateBoxError(null);
  };

  const handleCreateBox = async () => {
    const normalizedName = newBoxName.trim();

    if (!normalizedName) {
      setCreateBoxError("Box name is required.");
      return;
    }

    if (!newBoxLocationId) {
      setCreateBoxError("Room is required.");
      return;
    }

    setCreateBoxError(null);

    try {
      const createdId = await createBox({
        name: normalizedName,
        locationId: newBoxLocationId,
        status: newBoxStatus,
      });

      setIsCreateModalOpen(false);
      await refreshLocations();
      router.push({ pathname: "/box/[id]", params: { id: createdId } });
    } catch (error) {
      if (error instanceof Error) {
        setCreateBoxError(error.message);
        return;
      }

      setCreateBoxError("Failed to create box.");
    }
  };

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
          label="Unpacked"
          value={String(unpackedCount)}
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
        <MetricCard
          label="Loose Items"
          value={String(unassignedItems.length)}
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
      </View>

      <View className={`mt-6 gap-3 ${isCompact ? "" : "flex-row"}`}>
        <QuickActionCard
          title="Scan QR"
          subtitle="Assign or find box"
          icon="camera"
          variant="primary"
          onPress={() => router.push("/(tabs)/scan")}
        />
        <QuickActionCard
          title="Add Box"
          subtitle="Create new box"
          icon="plus"
          variant="secondary"
          onPress={openCreateModal}
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
              isFilterOpen || activeFilterCount > 0 ? Colors.dark.primary : Colors.dark.textSecondary
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

      <View className="mt-8">
        <SectionHeader title="Unassigned Items" actionLabel={`${unassignedItems.length} items`} />
        <View className="mt-4 gap-3">
          {unassignedItems.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </View>
      </View>

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
          <View className="mt-2 gap-2">
            {locations.length === 0 ? (
              <Text className="text-xs text-text-tertiary">
                {isLocationsLoading
                  ? "Loading rooms..."
                  : "No rooms found. Create a room first from the Rooms tab."}
              </Text>
            ) : (
              locations.map((location) => {
                const isActive = location.id === newBoxLocationId;
                return (
                  <Pressable
                    key={location.id}
                    onPress={() => setNewBoxLocationId(location.id)}
                    disabled={isCreating}
                    className={`rounded-control border px-3 py-2.5 ${
                      isActive
                        ? "border-primary bg-primary/15"
                        : "border-border-default bg-bg-input/60"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-text-primary">{location.name}</Text>
                  </Pressable>
                );
              })
            )}
          </View>
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
            disabled={isCreating || locations.length === 0}
            className="flex-1"
          />
        </View>
      </AppModal>
    </TabScreenLayout>
  );
}
