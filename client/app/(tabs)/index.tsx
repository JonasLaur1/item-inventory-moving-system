import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { ActiveMoveCard } from "@/components/home/active-move-card";
import { StartMovingModal } from "@/components/home/start-moving-modal";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Button } from "@/components/button";
import { useActivityHistory } from "@/hooks/use-activity-history";
import { useLocations } from "@/hooks/use-locations";
import { useMovingMode } from "@/hooks/use-moving-mode";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import { getMinutesAgo, formatRelativeTime } from "@/utils/time-formatting";
import { getEventTone } from "@/utils/activity-tone";


export default function HomeTabScreen() {
  const router = useRouter();
  const [isStartMovingModalOpen, setIsStartMovingModalOpen] = useState(false);
  const { isMovingActive, fromLocationId, toLocationId, startMoving, stopMoving } = useMovingMode();
  const {
    locations,
    isLoading: isLocationsLoading,
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

  useEffect(() => {
    if (!isLocationsLoading && isMovingActive && locations.length < 2) {
      void stopMoving();
    }
  }, [isLocationsLoading, locations.length, isMovingActive, stopMoving]);

  const fromLocation = locations.find((l) => l.id === fromLocationId);
  const toLocation = locations.find((l) => l.id === toLocationId);

  const recentActivityRows: InventoryItemRowData[] = useMemo(
    () => {
      const nowMs = Date.now();

      return recentEvents.map((event) => {
        const minutesAgo = getMinutesAgo(event.occurredAt, nowMs);
        return {
          id: event.id,
          title: event.title,
          subtitle: event.description,
          rightLabel: formatRelativeTime(minutesAgo),
          icon: getEventTone(event.type).icon,
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
      <View className="mt-8 gap-3">
        {isMovingActive && fromLocation && toLocation ? (
          <ActiveMoveCard
            fromLocation={fromLocation}
            toLocation={toLocation}
            onPress={() => router.push("/moving-progress")}
          />
        ) : null}

        {hasMultipleLocations ? (
          <Button
            label={isMovingActive ? "Stop Moving" : "Start Moving"}
            variant={isMovingActive ? "secondary" : "primary"}
            onPress={() => void (isMovingActive ? stopMoving() : setIsStartMovingModalOpen(true))}
          />
        ) : null}
      </View>

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
          {isActivityLoading ? (
            <EmptyStateCard
              title="Loading activity…"
              description="Fetching your latest activity."
            />
          ) : recentActivityRows.length > 0 ? (
            recentActivityRows.map((activity) => (
              <ItemRow key={activity.id} item={activity} />
            ))
          ) : (
            <EmptyStateCard
              title="No activity yet"
              description="Your latest inventory actions will appear here."
            />
          )}
        </View>
      </View>

      <StartMovingModal
        visible={isStartMovingModalOpen}
        locations={locations}
        onConfirm={(from, to) => {
          void startMoving(from, to);
          setIsStartMovingModalOpen(false);
        }}
        onClose={() => setIsStartMovingModalOpen(false)}
      />
    </TabScreenLayout>
  );
}
