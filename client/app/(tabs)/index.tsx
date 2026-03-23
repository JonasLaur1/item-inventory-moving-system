import { CreateLocationModal } from "@/components/inventory/create-location-modal";
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
import { RefreshControl, Text, View, useWindowDimensions } from "react-native";

type LocationCard = {
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
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [isCreateLocationModalOpen, setIsCreateLocationModalOpen] = useState(false);
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

  const locationsForCards: LocationCard[] = useMemo(
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

  const visibleLocations = showAllLocations ? locationsForCards : locationsForCards.slice(0, 2);
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
    <TabScreenLayout
      horizontalPadding={20}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing || isActivityRefreshing}
          onRefresh={() => void Promise.all([refreshLocations(), refreshActivity()])}
        />
      }
    >
      <View className="mt-8 flex-row gap-3">
        <QuickActionCard
          title="Add Location"
          subtitle="Create New Location"
          icon="plus"
          variant="primary"
          onPress={() => setIsCreateLocationModalOpen(true)}
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

      <View className="mt-3 flex-row gap-3">
        <QuickActionCard
          title="Scan Box"
          subtitle="Scan QR Code"
          icon="camera"
          variant="secondary"
          onPress={() => router.push("/(tabs)/scan")}
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
          title="Priority Locations"
          actionLabel={locationsForCards.length > 2 ? (showAllLocations ? "Show Less" : "Show All") : undefined}
          onPressAction={
            locationsForCards.length > 2 ? () => setShowAllLocations((prev) => !prev) : undefined
          }
        />

        <CardGrid
          items={visibleLocations}
          compact={isCompact}
          className="mt-4"
          keyExtractor={(location) => location.id}
          renderItem={(location) => (
            <RoomCard
              name={location.name}
              packed={location.packed}
              total={location.total}
              icon={location.icon}
              onPress={() => router.push({ pathname: "/location/[id]", params: { id: location.id } })}
            />
          )}
        />

        {isLoading && locationsForCards.length === 0 ? (
          <EmptyStateCard
            title="Loading locations..."
            description="Fetching your locations and progress."
            containerClassName="mt-4"
          />
        ) : null}

        {!isLoading && !errorMessage && locationsForCards.length === 0 ? (
          <EmptyStateCard
            title="No locations yet"
            description="Create a location from the Locations tab to see progress here."
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
      <CreateLocationModal
        visible={isCreateLocationModalOpen}
        onClose={() => setIsCreateLocationModalOpen(false)}
      />
    </TabScreenLayout>
  );
}

