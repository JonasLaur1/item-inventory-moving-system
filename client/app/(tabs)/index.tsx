import { CreateLocationModal } from "@/components/inventory/create-location-modal";
import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { QuickActionCard } from "@/components/home/quick-action-card";
import { SectionHeader } from "@/components/home/section-header";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Button } from "@/components/button";
import { useActivityHistory } from "@/hooks/use-activity-history";
import { useLocations } from "@/hooks/use-locations";
import { useMovingMode } from "@/hooks/use-moving-mode";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";

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
    case "Delivered":
      return "truck";
    default:
      return "clock";
  }
}

const RING_SIZE = 160;
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type DeliveryRingProps = {
  delivered: number;
  total: number;
  progress: number;
  primary: string;
  track: string;
};

function DeliveryRing({ delivered, total, progress, primary, track }: DeliveryRingProps) {
  const dashOffset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, progress)) / 100);
  return (
    <View className="mt-8 items-center">
      <View style={{ width: RING_SIZE, height: RING_SIZE }}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
            stroke={track} strokeWidth={STROKE_WIDTH} fill="none"
          />
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
            stroke={primary} strokeWidth={STROKE_WIDTH} fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-3xl font-bold text-text-primary">{Math.round(progress)}%</Text>
          <Text className="mt-0.5 text-xs text-text-tertiary">{delivered} / {total} boxes</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeTabScreen() {
  const router = useRouter();
  const [isCreateLocationModalOpen, setIsCreateLocationModalOpen] = useState(false);
  const { isMovingActive, startMoving, stopMoving } = useMovingMode();
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];
  const {
    locations,
    isRefreshing,
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

  const hasMultipleLocations = locations.length >= 2;

  const deliveryStats = useMemo(() => {
    const totalBoxes = locations.reduce((sum, loc) => sum + loc.boxes, 0);
    const totalDelivered = locations.reduce((sum, loc) => sum + loc.deliveredBoxes, 0);
    const progress = totalBoxes > 0 ? (totalDelivered / totalBoxes) * 100 : 0;
    return { totalBoxes, totalDelivered, progress };
  }, [locations]);
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
          isCollaborator: !event.isOwnEvent,
          actorName: event.actorName,
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
      {isMovingActive && hasMultipleLocations ? (
        <DeliveryRing
          delivered={deliveryStats.totalDelivered}
          total={deliveryStats.totalBoxes}
          progress={deliveryStats.progress}
          primary={themeColors.primary}
          track={themeColors.borderDefault}
        />
      ) : null}

      <View className={isMovingActive && hasMultipleLocations ? "mt-4 flex-row gap-3" : "mt-8 flex-row gap-3"}>
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

      {hasMultipleLocations ? (
        <View className="mt-3">
          <Button
            label={isMovingActive ? "Stop Moving" : "Start Moving"}
            variant={isMovingActive ? "secondary" : "primary"}
            onPress={() => void (isMovingActive ? stopMoving() : startMoving())}
          />
        </View>
      ) : null}

      <View className="mt-10">
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
        onCreated={(id) => router.navigate({ pathname: "/(tabs)/rooms", params: { selectId: id } })}
      />
    </TabScreenLayout>
  );
}

