import { Colors } from "@/constants/theme";
import { AppHeader } from "@/components/app-header";
import { BoxCard, type InventoryBox, type InventoryBoxStatus } from "@/components/inventory/box-card";
import { FilterChip } from "@/components/inventory/filter-chip";
import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { OverviewCard } from "@/components/inventory/overview-card";
import { QuickActionCard } from "@/components/home/quick-action-card";
import { SectionHeader } from "@/components/home/section-header";
import { SearchBar } from "@/components/ui/search-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StatusFilter = "All" | InventoryBoxStatus | "Fragile";

const statusFilters: StatusFilter[] = ["All", "Packed", "Unpacked", "Fragile"];

const boxes: InventoryBox[] = [
  {
    id: "kitchen-3",
    label: "Kitchen Box #3",
    room: "Kitchen",
    itemsCount: 12,
    fragileCount: 1,
    status: "Packed",
    updatedAt: "2m ago",
  },
  {
    id: "living-2",
    label: "Living Room Box #2",
    room: "Living Room",
    itemsCount: 9,
    fragileCount: 0,
    status: "Packed",
    updatedAt: "14m ago",
  },
  {
    id: "master-5",
    label: "Master Bedroom Box #5",
    room: "Master Bedroom",
    itemsCount: 6,
    fragileCount: 2,
    status: "Unpacked",
    updatedAt: "30m ago",
  },
  {
    id: "garage-1",
    label: "Garage Box #1",
    room: "Garage",
    itemsCount: 4,
    fragileCount: 1,
    status: "Unpacked",
    updatedAt: "1h ago",
  },
  {
    id: "garage-2",
    label: "Garage Box #2",
    room: "Garage",
    itemsCount: 7,
    fragileCount: 0,
    status: "Packed",
    updatedAt: "2h ago",
  },
];

const unassignedItems: InventoryItemRowData[] = [
  { id: "u-1", title: "Laptop Charger", subtitle: "Office", badgeText: "Move soon" },
  { id: "u-2", title: "Photo Album", subtitle: "Living Room", badgeText: "Fragile" },
  { id: "u-3", title: "Tool Set", subtitle: "Garage", badgeText: "Heavy" },
];

export default function InventoryTabScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const isNarrow = width < 360;

  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("All");
  const [activeRoom, setActiveRoom] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const packedCount = boxes.filter((box) => box.status === "Packed").length;
  const unpackedCount = boxes.length - packedCount;
  const activeFilterCount = Number(activeStatus !== "All") + Number(activeRoom !== "All");
  const roomFilters = useMemo(
    () => ["All", ...Array.from(new Set(boxes.map((box) => box.room))).sort((a, b) => a.localeCompare(b))],
    [],
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
  }, [activeRoom, activeStatus, search]);

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: isCompact ? 16 : 20,
          paddingBottom: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-2">
          <AppHeader />
        </View>

        <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
          <OverviewCard label="Total Boxes" value={String(boxes.length)} fullWidth={isNarrow} />
          <OverviewCard label="Packed" value={String(packedCount)} fullWidth={isNarrow} />
          <OverviewCard label="Unpacked" value={String(unpackedCount)} fullWidth={isNarrow} />
          <OverviewCard
            label="Loose Items"
            value={String(unassignedItems.length)}
            fullWidth={isNarrow}
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
          <QuickActionCard title="Add Box" subtitle="Create new box" icon="plus" variant="secondary" />
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
                isFilterOpen || activeFilterCount > 0
                  ? Colors.dark.primary
                  : Colors.dark.textSecondary
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

            <Text className="mt-4 text-xs uppercase tracking-[1px] text-text-tertiary">Status</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {statusFilters.map((filter) => {
                const isActive = activeStatus === filter;
                return (
                  <FilterChip
                    key={filter}
                    label={filter}
                    isActive={isActive}
                    onPress={() => setActiveStatus(filter)}
                  />
                );
              })}
            </View>

            <Text className="mt-4 text-xs uppercase tracking-[1px] text-text-tertiary">Room</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {roomFilters.map((room) => {
                const isActive = activeRoom === room;
                return (
                  <FilterChip
                    key={room}
                    label={room}
                    isActive={isActive}
                    onPress={() => setActiveRoom(room)}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        <View className="mt-8">
          <SectionHeader title="Boxes & Items" actionLabel={`${filteredBoxes.length} boxes`} />
          <View className="mt-4 gap-3">
            {filteredBoxes.length > 0 ? (
              filteredBoxes.map((box) => <BoxCard key={box.id} box={box} compact={isCompact} />)
            ) : (
              <View className="rounded-card border border-border-default bg-bg-elevated/70 p-5">
                <Text className="text-sm font-semibold text-text-primary">No boxes found</Text>
                <Text className="mt-1 text-xs text-text-tertiary">
                  Try a different search query or filter combination.
                </Text>
              </View>
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
      </ScrollView>
    </SafeAreaView>
  );
}
