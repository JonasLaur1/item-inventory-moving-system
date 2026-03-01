import { DashboardCard } from "@/components/home/dashboard-card";
import { RoomCard, type RoomCardProps } from "@/components/home/room-card";
import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { SectionHeader } from "@/components/home/section-header";
import { CardGrid } from "@/components/ui/card-grid";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MetricCard } from "@/components/ui/metric-card";
import { SearchBar } from "@/components/ui/search-bar";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { type ViewStyle } from "react-native";
import { View, useWindowDimensions } from "react-native";

type RoomStatus = "Done" | "Packing" | "Started" | "Empty";

type Room = {
  id: string;
  name: string;
  icon: RoomCardProps["icon"];
  boxes: number;
  packedBoxes: number;
  items: number;
  secondaryLabel: string;
  updatedAt: string;
};

const rooms: Room[] = [
  {
    id: "kitchen",
    name: "Kitchen",
    icon: "silverware-fork-knife",
    boxes: 12,
    packedBoxes: 12,
    items: 46,
    secondaryLabel: "Furniture",
    updatedAt: "5m ago",
  },
  {
    id: "living-room",
    name: "Living Room",
    icon: "sofa-outline",
    boxes: 8,
    packedBoxes: 6,
    items: 33,
    secondaryLabel: "TVs",
    updatedAt: "12m ago",
  },
  {
    id: "master-bedroom",
    name: "Master Bed",
    icon: "bed-king-outline",
    boxes: 10,
    packedBoxes: 2,
    items: 40,
    secondaryLabel: "Closet",
    updatedAt: "20m ago",
  },
  {
    id: "garage",
    name: "Garage",
    icon: "garage-variant",
    boxes: 24,
    packedBoxes: 17,
    items: 75,
    secondaryLabel: "Tools",
    updatedAt: "30m ago",
  },
  {
    id: "office",
    name: "Office",
    icon: "laptop",
    boxes: 6,
    packedBoxes: 0,
    items: 18,
    secondaryLabel: "Desks",
    updatedAt: "1h ago",
  },
  {
    id: "bathroom",
    name: "Bathroom",
    icon: "shower",
    boxes: 5,
    packedBoxes: 4,
    items: 21,
    secondaryLabel: "Essentials",
    updatedAt: "1h ago",
  },
  {
    id: "guest-room",
    name: "Guest Room",
    icon: "bed-outline",
    boxes: 4,
    packedBoxes: 1,
    items: 12,
    secondaryLabel: "Linen",
    updatedAt: "2h ago",
  },
];

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

function AddRoomCard({ style }: { style: ViewStyle }) {
  return (
    <DashboardCard
      icon={<Feather name="plus" size={20} color={Colors.dark.primary} />}
      title="Add Room"
      subtitle="Create a new room"
      className="border border-dashed border-border-strong bg-bg-elevated/40"
      iconContainerClassName="h-14 w-14 rounded-xl bg-primary/20"
      titleClassName="text-base text-text-primary"
      subtitleClassName="text-xs text-text-tertiary"
      style={style}
    />
  );
}

export default function RoomsTabScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 400;

  const [search, setSearch] = useState("");
  const [showAllRooms, setShowAllRooms] = useState(false);

  const filteredRooms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return rooms;
    }

    return rooms.filter((room) => {
      const derivedStatus = getRoomStatus(room).toLowerCase();
      return (
        room.name.toLowerCase().includes(normalizedSearch) ||
        room.secondaryLabel.toLowerCase().includes(normalizedSearch) ||
        derivedStatus.includes(normalizedSearch)
      );
    });
  }, [search]);

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

  return (
    <TabScreenLayout horizontalPadding={isCompact ? 16 : 20}>
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
          placeholder="Search rooms, boxes, or tags"
        />
      </View>

      <View className="mt-8">
        <SectionHeader
          title="Rooms"
          actionLabel={canExpand ? (showAllRooms ? "Show Less" : "View All") : undefined}
          onPressAction={canExpand ? () => setShowAllRooms((prev) => !prev) : undefined}
        />

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
          footer={(contentStyle) => <AddRoomCard style={contentStyle} />}
        />
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
