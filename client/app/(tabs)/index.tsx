import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { ActiveMoveCard } from "@/components/home/active-move-card";
import { MoveSummaryModal } from "@/components/home/move-summary-modal";
import { StartMovingModal } from "@/components/home/start-moving-modal";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Button } from "@/components/button";
import { useActivityHistory } from "@/hooks/use-activity-history";
import { useLocations } from "@/hooks/use-locations";
import { useMovingMode } from "@/hooks/use-moving-mode";
import { locationService } from "@/lib/location.service";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getMinutesAgo, formatRelativeTime } from "@/utils/time-formatting";
import { getEventTone, getTranslatedActivityText } from "@/utils/activity-tone";


export default function HomeTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isStartMovingModalOpen, setIsStartMovingModalOpen] = useState(false);
  const { isMovingActive, fromLocationId, toLocationId, fromLocationName, toLocationName, startMoving, stopMoving } = useMovingMode();
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
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);
  const [summaryUncheckedItems, setSummaryUncheckedItems] = useState(0);
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
    if (!isLocationsLoading && isMovingActive) {
      const fromExists = locations.some((l) => l.id === fromLocationId);
      const toExists = locations.some((l) => l.id === toLocationId);
      if (!fromExists || !toExists) {
        void stopMoving();
      }
    }
  }, [isLocationsLoading, isMovingActive, locations, fromLocationId, toLocationId, stopMoving]);

  const moveLocations = useMemo(
    () => locations.filter((l) => l.id === fromLocationId || l.id === toLocationId),
    [locations, fromLocationId, toLocationId],
  );

  const moveSummaryBoxStats = useMemo(() => ({
    totalBoxes: moveLocations.reduce((s, l) => s + l.boxes, 0),
    deliveredBoxes: moveLocations.reduce((s, l) => s + l.deliveredBoxes, 0),
    unpackedBoxes: moveLocations.reduce((s, l) => s + l.unpackedAtDestinationBoxes, 0),
    totalItems: moveLocations.reduce((s, l) => s + l.items, 0),
  }), [moveLocations]);

  const handleStopMovingPress = useCallback(async () => {
    if (!fromLocationId || !toLocationId) return;
    setIsSummaryModalOpen(true);
    setIsFetchingSummary(true);
    try {
      const unchecked = await locationService.countUncheckedItems(fromLocationId, toLocationId);
      setSummaryUncheckedItems(unchecked);
    } catch {
      setSummaryUncheckedItems(0);
    } finally {
      setIsFetchingSummary(false);
    }
  }, [fromLocationId, toLocationId]);

  const fromLocation = locations.find((l) => l.id === fromLocationId);
  const toLocation = locations.find((l) => l.id === toLocationId);

  const recentActivityRows: InventoryItemRowData[] = useMemo(
    () => {
      const nowMs = Date.now();

      return recentEvents.map((event) => {
        const minutesAgo = getMinutesAgo(event.occurredAt, nowMs);
        const { title, description } = getTranslatedActivityText(event);
        return {
          id: event.id,
          title,
          subtitle: description,
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
            label={isMovingActive ? t("home.stopMoving") : t("home.startMoving")}
            variant={isMovingActive ? "secondary" : "primary"}
            onPress={() => void (isMovingActive ? handleStopMovingPress() : setIsStartMovingModalOpen(true))}
          />
        ) : null}
      </View>

      <View className="mt-10">
        <SectionHeader title={t("home.recentActivity")} />
        {activityErrorMessage ? (
          <RetryErrorCard
            message={activityErrorMessage}
            isRetrying={isActivityRefreshing}
            retryingLabel={t("common.refreshing")}
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
              title={t("home.loadingActivity")}
              description={t("home.fetchingActivity")}
            />
          ) : recentActivityRows.length > 0 ? (
            recentActivityRows.map((activity) => (
              <ItemRow key={activity.id} item={activity} />
            ))
          ) : (
            <EmptyStateCard
              title={t("home.noActivity")}
              description={t("home.noActivityDesc")}
            />
          )}
        </View>
      </View>

      <MoveSummaryModal
        visible={isSummaryModalOpen}
        fromLocationName={fromLocation?.name ?? fromLocationName}
        toLocationName={toLocation?.name ?? toLocationName}
        totalBoxes={moveSummaryBoxStats.totalBoxes}
        deliveredBoxes={moveSummaryBoxStats.deliveredBoxes}
        unpackedBoxes={moveSummaryBoxStats.unpackedBoxes}
        totalItems={moveSummaryBoxStats.totalItems}
        uncheckedItems={summaryUncheckedItems}
        isLoadingStats={isFetchingSummary}
        onConfirm={() => {
          setIsSummaryModalOpen(false);
          void stopMoving();
        }}
        onClose={() => setIsSummaryModalOpen(false)}
      />

      <StartMovingModal
        visible={isStartMovingModalOpen}
        locations={locations}
        onConfirm={(from, fromName, to, toName) => {
          void startMoving(from, fromName, to, toName);
          setIsStartMovingModalOpen(false);
        }}
        onClose={() => setIsStartMovingModalOpen(false)}
      />
    </TabScreenLayout>
  );
}
