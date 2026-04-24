import {
  ActivityEventCard,
  type ActivityEvent,
  type ActivityEventType,
} from "@/components/activity/activity-event-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FilterGroup } from "@/components/ui/filter-group";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { SearchBar } from "@/components/ui/search-bar";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { useActivityHistory } from "@/hooks/use-activity-history";
import { Feather } from "@expo/vector-icons";
import { getMinutesAgo, formatRelativeTime } from "@/utils/time-formatting";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

type TypeFilter = "All" | ActivityEventType;
type TimeFilter = "24h" | "3d" | "7d";
type ActivityTimelineEvent = ActivityEvent & {
  minutesAgo: number;
  timeLabel: string;
};

const typeFilters: TypeFilter[] = ["All", "Created", "Updated", "Deleted", "Packed", "Delivered"];
const timeFilters: TimeFilter[] = ["24h", "3d", "7d"];

function getWindowMinutes(filter: TimeFilter) {
  switch (filter) {
    case "24h":
      return 24 * 60;
    case "3d":
      return 3 * 24 * 60;
    case "7d":
      return 7 * 24 * 60;
    default:
      return 7 * 24 * 60;
  }
}

function getGroupKey(minutesAgo: number): "today" | "yesterday" | "thisWeek" {
  if (minutesAgo <= 24 * 60) return "today";
  if (minutesAgo <= 48 * 60) return "yesterday";
  return "thisWeek";
}

export default function ActivityTabScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const isNarrow = width < 360;
  const hasFocusedOnceRef = useRef(false);
  const { resolvedTheme } = useThemePreference();
  const palette = Colors[resolvedTheme];

  const { events, isLoading, isRefreshing, errorMessage, refreshActivity, clearError } = useActivityHistory();

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void refreshActivity();
    }, [refreshActivity]),
  );

  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<TypeFilter>("All");
  const [activeTime, setActiveTime] = useState<TimeFilter>("7d");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const activeFilterCount = Number(activeType !== "All") + Number(activeTime !== "7d");

  const visibleEvents = useMemo<ActivityTimelineEvent[]>(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const maxMinutes = getWindowMinutes(activeTime);
    const nowMs = Date.now();

    return events
      .map((event) => {
        const minutesAgo = getMinutesAgo(event.occurredAt, nowMs);
        return {
          ...event,
          minutesAgo,
          timeLabel: formatRelativeTime(minutesAgo),
        };
      })
      .filter((event) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          event.title.toLowerCase().includes(normalizedSearch) ||
          event.description.toLowerCase().includes(normalizedSearch) ||
          event.location.toLowerCase().includes(normalizedSearch) ||
          (event.room ? event.room.toLowerCase().includes(normalizedSearch) : false) ||
          (event.box ? event.box.toLowerCase().includes(normalizedSearch) : false);

        const matchesType = activeType === "All" || event.type === activeType;
        const matchesTime = event.minutesAgo <= maxMinutes;

        return matchesSearch && matchesType && matchesTime;
      })
      .sort((firstEvent, secondEvent) => firstEvent.minutesAgo - secondEvent.minutesAgo);
  }, [activeTime, activeType, events, search]);

  const getTypeFilterLabel = useCallback((option: TypeFilter): string => {
    const labels: Partial<Record<string, string>> = {
      All: t("common.all"),
      Created: t("activity.created"),
      Updated: t("activity.updated"),
      Deleted: t("activity.deleted"),
      Packed: t("activity.packedFilter"),
      Delivered: t("activity.deliveredFilter"),
    };
    return labels[option] ?? option;
  }, [t]);

  const groupedEvents = useMemo(() => {
    const grouped = visibleEvents.reduce<Record<string, ActivityTimelineEvent[]>>((acc, event) => {
      const key = getGroupKey(event.minutesAgo);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(event);
      return acc;
    }, {});

    const order = ["today", "yesterday", "thisWeek"] as const;
    return order
      .filter((key) => grouped[key] && grouped[key].length > 0)
      .map((key) => ({ key, label: t(`activity.${key}`), items: grouped[key] }));
  }, [visibleEvents, t]);

  const todayEventsCount = useMemo(
    () => visibleEvents.filter((event) => event.minutesAgo <= 24 * 60).length,
    [visibleEvents],
  );

  return (
    <TabScreenLayout horizontalPadding={isCompact ? 16 : 20}>
      {errorMessage ? (
        <RetryErrorCard
          message={errorMessage}
          isRetrying={isRefreshing}
          retryingLabel={t("common.refreshing")}
          onRetry={() => {
            clearError();
            void refreshActivity();
          }}
          className="mt-6"
        />
      ) : null}

      <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
        <MetricCard
          label={t("activity.events")}
          value={String(visibleEvents.length)}
          hint={t("activity.last", { time: activeTime })}
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
        <MetricCard
          label={t("activity.today")}
          value={String(todayEventsCount)}
          hint={t("activity.activityIn24h")}
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
      </View>

      <View className="mt-6 flex-row gap-3">
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t("activity.searchPlaceholder")}
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
            color={isFilterOpen || activeFilterCount > 0 ? palette.primary : palette.textSecondary}
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
            <Text className="text-sm font-semibold text-text-primary">{t("activity.filters")}</Text>
            <Pressable
              onPress={() => {
                setActiveType("All");
                setActiveTime("7d");
              }}
            >
              <Text className="text-xs font-semibold text-text-link">{t("common.clear")}</Text>
            </Pressable>
          </View>

          <FilterGroup
            label={t("activity.type")}
            options={typeFilters}
            activeValue={activeType}
            onSelect={setActiveType}
            getLabel={getTypeFilterLabel}
            className="mt-4"
          />

          <FilterGroup
            label={t("activity.window")}
            options={timeFilters}
            activeValue={activeTime}
            onSelect={setActiveTime}
            className="mt-4"
          />
        </View>
      ) : null}

      <View className="mt-8">
        <SectionHeader title={t("activity.timeline")} actionLabel={t("activity.eventsCount", { count: visibleEvents.length })} />

        {groupedEvents.length > 0 ? (
          <View className="mt-4 gap-3">
            {groupedEvents.map((group) => (
              <View key={group.key} className="gap-3">
                <Text className="py-1 text-xs uppercase tracking-[1.2px] text-text-tertiary">
                  {group.label}
                </Text>
                <View className="gap-3">
                  {group.items.map((event) => (
                    <ActivityEventCard key={event.id} event={event} timeLabel={event.timeLabel} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="mt-4">
            <EmptyStateCard
              title={
                isLoading || isRefreshing
                  ? t("activity.loadingActivity")
                  : t("activity.noActivityFound")
              }
              description={
                isLoading || isRefreshing
                  ? t("activity.fetchingHistory")
                  : t("activity.adjustFilters")
              }
            />
          </View>
        )}
      </View>
    </TabScreenLayout>
  );
}
