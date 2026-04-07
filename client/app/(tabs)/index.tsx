import { CreateLocationModal } from "@/components/inventory/create-location-modal";
import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { QuickActionCard } from "@/components/home/quick-action-card";
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
import { Pressable, RefreshControl, Text, View } from "react-native";
import { getMinutesAgo, formatRelativeTime } from "@/utils/time-formatting";
import { getEventTone } from "@/utils/activity-tone";


function MovingLabel({ fromName, toName }: { fromName: string; toName: string }) {
  return (
    <View className="flex-row items-center justify-center gap-1 rounded-control border border-border-default bg-bg-input px-4 py-2">
      <Text className="text-sm font-medium text-text-secondary">Moving:</Text>
      <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>{fromName}</Text>
      <Text className="text-sm text-text-tertiary">→</Text>
      <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>{toName}</Text>
    </View>
  );
}


export default function HomeTabScreen() {
  const router = useRouter();
  const [isCreateLocationModalOpen, setIsCreateLocationModalOpen] = useState(false);
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
          style={{ flex: 0, width: "48.5%" }}
          onPress={() => router.push("/(tabs)/scan")}
        />
      </View>

      {hasMultipleLocations ? (
        <View className="mt-3 gap-2">
          {isMovingActive ? (
            <Pressable
              onPress={() => router.push("/moving-progress")}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MovingLabel
                fromName={locations.find((l) => l.id === fromLocationId)?.name ?? "?"}
                toName={locations.find((l) => l.id === toLocationId)?.name ?? "?"}
              />
            </Pressable>
          ) : null}
          <Button
            label={isMovingActive ? "Stop Moving" : "Start Moving"}
            variant={isMovingActive ? "secondary" : "primary"}
            onPress={() => void (isMovingActive ? stopMoving() : setIsStartMovingModalOpen(true))}
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
      <CreateLocationModal
        visible={isCreateLocationModalOpen}
        onClose={() => setIsCreateLocationModalOpen(false)}
        onCreated={(id) => router.navigate({ pathname: "/(tabs)/rooms", params: { selectId: id } })}
      />
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

