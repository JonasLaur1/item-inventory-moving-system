import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { QuickActionCard } from "@/components/home/quick-action-card";
import { SectionHeader } from "@/components/ui/section-header";
import { BoxCard, type InventoryBox, type InventoryBoxStatus } from "@/components/inventory/box-card";
import { CreateLocationModal } from "@/components/inventory/create-location-modal";
import { SearchItemResult } from "@/components/inventory/search-item-result";
import { AppModal } from "@/components/ui/app-modal";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FilterGroup } from "@/components/ui/filter-group";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { SearchBar } from "@/components/ui/search-bar";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Colors } from "@/constants/theme";
import { useInventoryFilter } from "@/contexts/inventory-filter-context";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { getMinutesAgo, formatRelativeTime } from "@/utils/time-formatting";
import { useBoxes } from "@/hooks/use-boxes";
import { useLocations } from "@/hooks/use-locations";
import { useRooms } from "@/hooks/use-rooms";
import { useSearch } from "@/hooks/use-search";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

type StatusFilter = "All" | InventoryBoxStatus | "Fragile";
type EditableStatus = "packed" | "unpacked";

const statusFilters: StatusFilter[] = ["All", "Packed", "Not packed", "Fragile"];
const editableStatuses: { value: EditableStatus }[] = [
  { value: "packed" },
  { value: "unpacked" },
];

function formatUpdatedAt(isoDate: string | null, unknownLabel: string): string {
  if (!isoDate) {
    return unknownLabel;
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

export default function InventoryTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ create?: string | string[]; locationName?: string; roomName?: string }>();
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

  const { setInventoryFilters } = useInventoryFilter();

  const [search, setSearch] = useState("");
  const { itemResults, isSearching } = useSearch(search);
  const isSearchActive = search.trim().length >= 2;

  const [activeStatus, setActiveStatus] = useState<StatusFilter>("All");
  const [activeLocationFilter, setActiveLocationFilter] = useState("All");
  const [activeRoomFilter, setActiveRoomFilter] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateLocationModalOpen, setIsCreateLocationModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxRoomId, setNewBoxRoomId] = useState("");
  const [newBoxStatus, setNewBoxStatus] = useState<EditableStatus>("unpacked");
  const [createBoxError, setCreateBoxError] = useState<string | null>(null);

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

  const unknownLabel = t("common.unknown");
  const boxes: InventoryBox[] = useMemo(
    () =>
      summaryBoxes.map((box) => ({
        id: box.id,
        label: box.name,
        room: `${box.parentLocationName} / ${box.roomName}`,
        itemsCount: box.itemsCount,
        isFragile: box.isFragile,
        status: mapBoxStatus(box.status),
        updatedAt: formatUpdatedAt(box.updatedAt, unknownLabel),
      })),
    [summaryBoxes, unknownLabel],
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

  const activeFilterCount =
    Number(activeStatus !== "All") +
    Number(activeLocationFilter !== "All" || activeRoomFilter !== "All");

  const locationFilters = useMemo(
    () => [
      "All",
      ...Array.from(new Set(rooms.map((r) => r.locationName))).sort((a, b) =>
        a.localeCompare(b),
      ),
    ],
    [rooms],
  );

  const roomFiltersForLocation = useMemo(
    () => [
      "All",
      ...rooms
        .filter((r) =>
          activeLocationFilter === "All" ? true : r.locationName === activeLocationFilter,
        )
        .map((r) => `${r.locationName} / ${r.name}`)
        .sort((a, b) => a.localeCompare(b)),
    ],
    [activeLocationFilter, rooms],
  );

  useEffect(() => {
    if (activeRoomFilter === "All") return;
    if (roomFiltersForLocation.includes(activeRoomFilter)) return;
    if (isRoomsLoading) return;
    setActiveRoomFilter("All");
  }, [activeRoomFilter, isRoomsLoading, roomFiltersForLocation]);

  useEffect(() => {
    if (activeLocationFilter === "All") return;
    if (locationFilters.includes(activeLocationFilter)) return;
    if (isRoomsLoading) return;
    setActiveLocationFilter("All");
    setActiveRoomFilter("All");
  }, [activeLocationFilter, isRoomsLoading, locationFilters]);

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

      const matchesRoom =
        activeRoomFilter !== "All"
          ? box.room === activeRoomFilter
          : activeLocationFilter !== "All"
            ? box.room.startsWith(`${activeLocationFilter} / `)
            : true;

      return matchesSearch && matchesStatus && matchesRoom;
    });
  }, [activeLocationFilter, activeRoomFilter, activeStatus, boxes, search]);

  const isLocationFiltered = activeLocationFilter !== "All";

  const STATUS_GROUP_ORDER: InventoryBoxStatus[] = ["Delivered", "Packed", "Not packed", "Unpacked"];

  const statusFilterLabels = useMemo<Record<StatusFilter, string>>(() => ({
    All: t("common.all"),
    Packed: t("inventory.packed"),
    "Not packed": t("inventory.notPacked"),
    Fragile: t("inventory.fragile"),
    Delivered: t("inventory.delivered"),
    Unpacked: t("inventory.unpacked"),
  }), [t]);

  const getStatusLabel = useCallback((status: InventoryBoxStatus): string => {
    switch (status) {
      case "Packed": return t("inventory.packed");
      case "Not packed": return t("inventory.notPacked");
      case "Delivered": return t("inventory.delivered");
      case "Unpacked": return t("inventory.unpacked");
      default: return status;
    }
  }, [t]);

  const groupedByStatus = useMemo(() => {
    if (!isLocationFiltered) return null;

    return STATUS_GROUP_ORDER.map((status) => ({
      status,
      boxes: filteredBoxes.filter((box) => box.status === status),
    })).filter((group) => group.boxes.length > 0);
  }, [isLocationFiltered, filteredBoxes]);

  const packedCount = filteredBoxes.filter((box) => box.status === "Packed").length;
  const unpackedCount = filteredBoxes.length - packedCount;
  const totalItemsCount = filteredBoxes.reduce((total, box) => total + box.itemsCount, 0);

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

  useEffect(() => {
    if (!params.locationName || !params.roomName) {
      return;
    }

    setActiveLocationFilter(params.locationName);
    setActiveRoomFilter(`${params.locationName} / ${params.roomName}`);
    router.setParams({ locationName: undefined, roomName: undefined });
  }, [params.locationName, params.roomName, router]);

  useEffect(() => {
    setInventoryFilters(activeLocationFilter, activeRoomFilter);
  }, [activeLocationFilter, activeRoomFilter, setInventoryFilters]);

  const handleCreateBox = async () => {
    const normalizedName = newBoxName.trim();

    if (!normalizedName) {
      setCreateBoxError(t("inventory.boxNameRequired"));
      return;
    }

    if (!newBoxRoomId) {
      setCreateBoxError(t("inventory.roomRequired"));
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

      setCreateBoxError(t("inventory.failedCreateBox"));
    }
  };

  if (!isLocationsLoading && locations.length === 0) {
    return (
      <TabScreenLayout horizontalPadding={isCompact ? 16 : 20}>
        {locationErrorMessage ? (
          <RetryErrorCard
            message={locationErrorMessage}
            isRetrying={isLocationsRefreshing}
            retryingLabel={t("common.refreshing")}
            onRetry={() => void refreshLocations()}
            className="mt-6"
          />
        ) : null}

        <EmptyStateCard
          title={t("inventory.noLocationsYet")}
          description={t("inventory.noLocationsYetDesc")}
          containerClassName="mt-6"
        />
        <Button
          label={t("inventory.createLocation")}
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
          retryingLabel={t("common.refreshing")}
          onRetry={() => void refreshBoxes()}
          className="mt-6"
        />
      ) : null}

      {!isSearchActive ? (
        <>
          <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
            <MetricCard
              label={t("inventory.totalBoxes")}
              value={String(filteredBoxes.length)}
              style={{ width: isNarrow ? "100%" : "48.5%" }}
            />
            <MetricCard
              label={t("inventory.packed")}
              value={String(packedCount)}
              style={{ width: isNarrow ? "100%" : "48.5%" }}
            />
            <MetricCard
              label={t("inventory.notPacked")}
              value={String(unpackedCount)}
              style={{ width: isNarrow ? "100%" : "48.5%" }}
            />
            <MetricCard
              label={t("inventory.totalItems")}
              value={String(totalItemsCount)}
              style={{ width: isNarrow ? "100%" : "48.5%" }}
            />
          </View>

          <View className="mt-6 flex-row">
            <QuickActionCard
              title={t("inventory.addBox")}
              subtitle={t("inventory.createNewBox")}
              icon="plus"
              variant="secondary"
              onPress={openCreateModal}
              disabled={availableRoomsForBox.length === 0}
            />
          </View>
        </>
      ) : null}

      <View className="mt-6 flex-row gap-3">
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t("inventory.searchPlaceholder")}
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

      {isFilterOpen && !isSearchActive ? (
        <View className="mt-3 rounded-card border border-border-default bg-bg-elevated/80 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-text-primary">{t("inventory.filters")}</Text>
            <Pressable
              onPress={() => {
                setActiveStatus("All");
                setActiveLocationFilter("All");
                setActiveRoomFilter("All");
              }}
            >
              <Text className="text-xs font-semibold text-text-link">{t("common.clear")}</Text>
            </Pressable>
          </View>

          <FilterGroup
            label={t("inventory.status")}
            options={statusFilters}
            activeValue={activeStatus}
            onSelect={setActiveStatus}
            getLabel={(option) => statusFilterLabels[option]}
            className="mt-4"
          />

          <FilterGroup
            label={t("inventory.location")}
            options={locationFilters}
            activeValue={activeLocationFilter}
            onSelect={(loc) => {
              setActiveLocationFilter(loc);
              setActiveRoomFilter("All");
            }}
            getLabel={(option) => option === "All" ? t("common.all") : option}
            className="mt-4"
          />

          <FilterGroup
            label={t("inventory.room")}
            options={roomFiltersForLocation}
            activeValue={activeRoomFilter}
            onSelect={setActiveRoomFilter}
            getLabel={(option) => option === "All" ? t("common.all") : option}
            className="mt-4"
          />
        </View>
      ) : null}

      {isSearchActive ? (
        <View className="mt-8 gap-6">
          <View>
            <SectionHeader title={t("inventory.boxesSection")} actionLabel={t("inventory.found", { count: filteredBoxes.length })} />
            {filteredBoxes.length > 0 ? (
              <View className="mt-4 gap-3">
                {filteredBoxes.map((box) => (
                  <BoxCard
                    key={box.id}
                    box={box}
                    compact={isCompact}
                    onPressOpen={() => router.push({ pathname: "/box/[id]", params: { id: box.id } })}
                    onPressEdit={() => router.push({ pathname: "/box/[id]", params: { id: box.id, edit: "1" } })}
                  />
                ))}
              </View>
            ) : (
              <View className="mt-4">
                <EmptyStateCard title={t("inventory.noBoxesFound")} containerClassName="p-5" />
              </View>
            )}
          </View>

          <View>
            <SectionHeader title={t("inventory.itemsSection")} actionLabel={t("inventory.found", { count: itemResults.length })} />
            {isSearching ? (
              <View className="mt-4">
                <EmptyStateCard title={t("inventory.searching")} containerClassName="p-5" />
              </View>
            ) : itemResults.length > 0 ? (
              <View className="mt-4 gap-3">
                {itemResults.map((item) => (
                  <SearchItemResult
                    key={item.id}
                    item={item}
                    onPress={() => router.push({ pathname: "/box/[id]", params: { id: item.boxId } })}
                  />
                ))}
              </View>
            ) : (
              <View className="mt-4">
                <EmptyStateCard title={t("inventory.noItemsFound")} containerClassName="p-5" />
              </View>
            )}
          </View>
        </View>
      ) : (
        <View className="mt-8">
          <SectionHeader title={t("inventory.boxesAndItems")} actionLabel={t("inventory.boxesCount", { count: filteredBoxes.length })} />
          {filteredBoxes.length === 0 ? (
            <View className="mt-4">
              <EmptyStateCard
                title={
                  isLoading || isRefreshing
                    ? t("inventory.loadingBoxes")
                    : activeFilterCount > 0
                      ? t("inventory.noBoxesFound")
                      : t("inventory.noBoxesYet")
                }
                description={
                  isLoading || isRefreshing
                    ? t("inventory.fetchingBoxes")
                    : activeFilterCount > 0
                      ? t("inventory.noBoxesFoundDesc")
                      : t("inventory.noBoxesYetDesc")
                }
                containerClassName="p-5"
              />
            </View>
          ) : groupedByStatus ? (
            <View className="mt-4 gap-6">
              {groupedByStatus.map((group) => (
                <View key={group.status}>
                  <Text className="mb-3 text-xs font-semibold uppercase tracking-[1px] text-text-tertiary">
                    {getStatusLabel(group.status)} ({group.boxes.length})
                  </Text>
                  <View className="gap-3">
                    {group.boxes.map((box) => (
                      <BoxCard
                        key={box.id}
                        box={box}
                        compact={isCompact}
                        onPressOpen={() => router.push({ pathname: "/box/[id]", params: { id: box.id } })}
                        onPressEdit={() => router.push({ pathname: "/box/[id]", params: { id: box.id, edit: "1" } })}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="mt-4 gap-3">
              {filteredBoxes.map((box) => (
                <BoxCard
                  key={box.id}
                  box={box}
                  compact={isCompact}
                  onPressOpen={() => router.push({ pathname: "/box/[id]", params: { id: box.id } })}
                  onPressEdit={() => router.push({ pathname: "/box/[id]", params: { id: box.id, edit: "1" } })}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <AppModal
        visible={isCreateModalOpen}
        title={t("inventory.createBox")}
        description={t("inventory.createBoxDesc")}
        onRequestClose={closeCreateModal}
        maxWidth={420}
      >
        <FormInput
          value={newBoxName}
          onChangeText={setNewBoxName}
          placeholder={t("inventory.boxNamePlaceholder")}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isCreating}
          maxLength={80}
        />

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">{t("inventory.room")}</Text>
          <ScrollView className="mt-2" style={{ maxHeight: 200 }} showsVerticalScrollIndicator>
            <View className="gap-2">
              {availableRoomsForBox.length === 0 ? (
                <Text className="text-xs text-text-tertiary">
                  {isRoomsLoading
                    ? t("inventory.loadingRooms")
                    : t("inventory.noRoomsInLocation")}
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
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">{t("inventory.status")}</Text>
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
                  <Text className="text-sm font-semibold text-text-primary">
                    {option.value === "packed" ? t("inventory.packed") : t("inventory.notPacked")}
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
            disabled={isCreating}
            className="flex-1"
          />
          <Button
            label={isCreating ? t("common.creating") : t("common.create")}
            onPress={() => void handleCreateBox()}
            disabled={isCreating || availableRoomsForBox.length === 0}
            className="flex-1"
          />
        </View>
      </AppModal>
    </TabScreenLayout>
  );
}
