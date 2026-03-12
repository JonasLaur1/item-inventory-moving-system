import { Colors } from "@/constants/theme";
import { RoomCard, type RoomCardProps } from "@/components/home/room-card";
import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { QuickActionCard } from "@/components/home/quick-action-card";
import { SectionHeader } from "@/components/home/section-header";
import { CardGrid } from "@/components/ui/card-grid";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { useLocations } from "@/hooks/use-locations";
import { getLocationIcon } from "@/utils/location-icon";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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

const recentActivity: Activity[] = [
  { id: "1", item: "Toaster", detail: "Added to Kitchen Box #3", time: "2m ago", icon: "archive" },
  { id: "2", item: "Winter Jacket", detail: "Moved to Master Bedroom Box #5", time: "15m ago", icon: "package" },
  { id: "3", item: "Photo Frame", detail: "Marked as fragile", time: "40m ago", icon: "alert-circle" },
  { id: "4", item: "Tool Set", detail: "Added to Garage Box #2", time: "1h ago", icon: "tool" },
];

export default function HomeTabScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const [showAllRooms, setShowAllRooms] = useState(false);
  const {
    locations,
    isLoading,
    isRefreshing,
    errorMessage,
    refreshLocations,
  } = useLocations();
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
        packed: location.packedBoxes,
        total: location.boxes,
        icon: getLocationIcon(location.name),
      })),
    [locations],
  );

  const totalBoxes = useMemo(
    () => rooms.reduce((total, room) => total + room.total, 0),
    [rooms],
  );
  const packedBoxes = useMemo(
    () => rooms.reduce((total, room) => total + room.packed, 0),
    [rooms],
  );
  const percentage = totalBoxes > 0 ? Math.round((packedBoxes / totalBoxes) * 100) : 0;
  const boxesLeft = totalBoxes - packedBoxes;

  const progress = useMemo(() => {
    const radius = 88;
    const strokeWidth = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - percentage / 100);

    return { radius, strokeWidth, circumference, offset };
  }, [percentage]);

  const visibleRooms = showAllRooms ? rooms : rooms.slice(0, 2);
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
          title="Add Room"
          subtitle="Create New Room"
          icon="plus"
          variant="primary"
          onPress={() =>
            router.push({
              pathname: "/(tabs)/rooms",
              params: { create: "1" },
            })
          }
        />
        <QuickActionCard
          title="Add Box"
          subtitle="Add New Box"
          icon="plus"
          variant="secondary"
        />
      </View>

      <View className="mt-10">
        {errorMessage ? (
          <RetryErrorCard
            message={errorMessage}
            isRetrying={isRefreshing}
            retryingLabel="Refreshing..."
            onRetry={() => void refreshLocations()}
          />
        ) : null}

        <SectionHeader
          title="Priority Rooms"
          actionLabel={rooms.length > 2 ? (showAllRooms ? "Show Less" : "Show All") : undefined}
          onPressAction={
            rooms.length > 2 ? () => setShowAllRooms((prev) => !prev) : undefined
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
              onPress={() => router.push({ pathname: "/room/[id]", params: { id: room.id } })}
            />
          )}
        />

        {isLoading && rooms.length === 0 ? (
          <EmptyStateCard
            title="Loading rooms..."
            description="Fetching your locations and box progress."
            containerClassName="mt-4"
          />
        ) : null}

        {!isLoading && !errorMessage && rooms.length === 0 ? (
          <EmptyStateCard
            title="No rooms yet"
            description="Create a room from the Rooms tab to see progress here."
            containerClassName="mt-4"
          />
        ) : null}
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

