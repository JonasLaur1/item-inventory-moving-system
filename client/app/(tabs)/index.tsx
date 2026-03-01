import { Colors } from "@/constants/theme";
import {
  RoomCard,
  type RoomCardProps,
} from "@/components/home/room-card";
import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { QuickActionCard } from "@/components/home/quick-action-card";
import { SectionHeader } from "@/components/home/section-header";
import { CardGrid } from "@/components/ui/card-grid";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";

type Room = {
  id: string;
  name: string;
  packed: number;
  total: number;
  icon: RoomCardProps["icon"];
};

type Activity = {
  id: string;
  item: string;
  detail: string;
  time: string;
  icon: keyof typeof Feather.glyphMap;
};

const roomData: Room[] = [
  { id: "kitchen", name: "Kitchen", packed: 12, total: 15, icon: "silverware-fork-knife" },
  { id: "living-room", name: "Living Room", packed: 8, total: 13, icon: "sofa" },
  { id: "master-bedroom", name: "Master Bedroom", packed: 6, total: 10, icon: "bed-king-outline" },
  { id: "garage", name: "Garage", packed: 4, total: 12, icon: "garage-variant" },
];

const recentActivity: Activity[] = [
  { id: "1", item: "Toaster", detail: "Added to Kitchen Box #3", time: "2m ago", icon: "archive" },
  { id: "2", item: "Winter Jacket", detail: "Moved to Master Bedroom Box #5", time: "15m ago", icon: "package" },
  { id: "3", item: "Photo Frame", detail: "Marked as fragile", time: "40m ago", icon: "alert-circle" },
  { id: "4", item: "Tool Set", detail: "Added to Garage Box #2", time: "1h ago", icon: "tool" },
];

export default function HomeTabScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const [showAllRooms, setShowAllRooms] = useState(false);

  const totalBoxes = 40;
  const packedBoxes = 26;
  const percentage = Math.round((packedBoxes / totalBoxes) * 100);
  const boxesLeft = totalBoxes - packedBoxes;

  const progress = useMemo(() => {
    const radius = 88;
    const strokeWidth = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - percentage / 100);

    return { radius, strokeWidth, circumference, offset };
  }, [percentage]);

  const visibleRooms = showAllRooms ? roomData : roomData.slice(0, 2);
  const recentActivityRows: InventoryItemRowData[] = useMemo(
    () =>
      recentActivity.slice(0, 4).map((activity) => ({
        id: activity.id,
        title: activity.item,
        subtitle: activity.detail,
        badgeText: activity.time,
        icon: activity.icon,
      })),
    [],
  );

  return (
    <TabScreenLayout horizontalPadding={20}>
      <View className="mt-8 items-center">
        <View className="relative h-[220px] w-[220px] items-center justify-center">
          <Svg width={220} height={220} viewBox="0 0 220 220">
            <Circle
              cx={110}
              cy={110}
              r={progress.radius}
              stroke={Colors.dark.borderDefault}
              strokeWidth={progress.strokeWidth}
              fill="none"
            />
            <Circle
              cx={110}
              cy={110}
              r={progress.radius}
              stroke={Colors.dark.primary}
              strokeWidth={progress.strokeWidth}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={progress.circumference}
              strokeDashoffset={progress.offset}
              transform="rotate(-90 110 110)"
            />
          </Svg>

          <View className="absolute items-center">
            <Text className="text-5xl font-black text-text-primary">{percentage}%</Text>
            <Text className="mt-1 text-xs uppercase tracking-[2px] text-text-tertiary">
              Packed
            </Text>
            <Text className="mt-3 text-base font-bold text-text-primary">
              {boxesLeft} Boxes Left
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-8 flex-row gap-3">
        <QuickActionCard
          title="Scan QR"
          subtitle="Scan QR Code"
          icon="camera"
          variant="primary"
        />
        <QuickActionCard
          title="Add Box"
          subtitle="Add New Box"
          icon="plus"
          variant="secondary"
        />
      </View>

      <View className="mt-10">
        <SectionHeader
          title="Priority Rooms"
          actionLabel={roomData.length > 2 ? (showAllRooms ? "Show Less" : "Show All") : undefined}
          onPressAction={
            roomData.length > 2 ? () => setShowAllRooms((prev) => !prev) : undefined
          }
        />

        <CardGrid
          items={visibleRooms}
          compact={isCompact}
          className="mt-4"
          keyExtractor={(room) => room.id}
          renderItem={(room) => (
            <RoomCard
              name={room.name}
              packed={room.packed}
              total={room.total}
              icon={room.icon}
            />
          )}
        />
      </View>

      <View className="mt-4">
        <SectionHeader title="Recent Activity" />
        <View className="mt-4 gap-3">
          {recentActivityRows.map((activity) => (
            <ItemRow key={activity.id} item={activity} />
          ))}
        </View>
      </View>
    </TabScreenLayout>
  );
}

