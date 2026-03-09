import { Colors } from "@/constants/theme";
import { BoxCard, type InventoryBox, type InventoryBoxStatus } from "@/components/inventory/box-card";
import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { QuickActionCard } from "@/components/home/quick-action-card";
import { SectionHeader } from "@/components/home/section-header";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FilterGroup } from "@/components/ui/filter-group";
import { MetricCard } from "@/components/ui/metric-card";
import { SearchBar } from "@/components/ui/search-bar";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

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
    <TabScreenLayout horizontalPadding={isCompact ? 16 : 20}>
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
            filteredBoxes.map((box) => <BoxCard key={box.id} box={box} compact={isCompact} />)
          ) : (
            <EmptyStateCard
              title="No boxes found"
              description="Try a different search query or filter combination."
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
    </TabScreenLayout>
  );
}
