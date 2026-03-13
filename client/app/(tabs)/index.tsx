import { Colors } from "@/constants/theme";
import { RoomCard, type RoomCardProps } from "@/components/home/room-card";
import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { QuickActionCard } from "@/components/home/quick-action-card";
import { SectionHeader } from "@/components/home/section-header";
import { CardGrid } from "@/components/ui/card-grid";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { useActivityHistory } from "@/hooks/use-activity-history";
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

function getActivityIcon(type: string): keyof typeof Feather.glyphMap {
  switch (type) {
    case "Created":
      return "plus-square";
    case "Updated":
      return "edit-3";
    case "Moved":
      return "repeat";
    case "Deleted":
      return "trash-2";
    case "Packed":
      return "archive";
    default:
      return "clock";
  }
}

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
  const {
    events: recentEvents,
    isLoading: isActivityLoading,
    isRefreshing: isActivityRefreshing,
    errorMessage: activityErrorMessage,
    refreshActivity,
    clearError: clearActivityError,
  } = useActivityHistory(4);
  const hasFocusedOnceRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void Promise.all([refreshLocations(), refreshActivity()]);
    }, [refreshActivity, refreshLocations]),
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
    () => {
      const nowMs = Date.now();

      return recentEvents.map((event) => {
        const minutesAgo = getMinutesAgo(event.occurredAt, nowMs);
        return {
          id: event.id,
          title: event.title,
          subtitle: event.description,
          badgeText: formatRelativeTime(minutesAgo),
          icon: getActivityIcon(event.type),
        };
      });
    },
    [recentEvents],
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
          onPress={() =>
            router.push({
              pathname: "/(tabs)/inventory",
              params: { create: "1" },
            })
          }
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
        {activityErrorMessage ? (
          <RetryErrorCard
            message={activityErrorMessage}
            isRetrying={isActivityRefreshing}
            retryingLabel="Refreshing..."
            onRetry={() => {
              clearActivityError();
              void refreshActivity();
            }}
            className="mt-4"
          />
        ) : null}
        <View className="mt-4 gap-3">
          {recentActivityRows.length > 0 ? (
            recentActivityRows.map((activity) => (
              <ItemRow key={activity.id} item={activity} />
            ))
          ) : (
            <EmptyStateCard
              title={isActivityLoading || isActivityRefreshing ? "Loading activity..." : "No activity yet"}
              description={
                isActivityLoading || isActivityRefreshing
                  ? "Fetching your latest activity."
                  : "Your latest inventory actions will appear here."
              }
            />
          )}
        </View>
      </View>
    </TabScreenLayout>
  );
}

