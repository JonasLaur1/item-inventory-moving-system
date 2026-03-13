import {
  ActivityEventCard,
  type ActivityEvent,
  type ActivityEventType,
} from "@/components/activity/activity-event-card";
import { SectionHeader } from "@/components/home/section-header";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FilterGroup } from "@/components/ui/filter-group";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { SearchBar } from "@/components/ui/search-bar";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Colors } from "@/constants/theme";
import { useActivityHistory } from "@/hooks/use-activity-history";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

type TypeFilter = "All" | ActivityEventType;
type TimeFilter = "24h" | "3d" | "7d";
type ActivityTimelineEvent = ActivityEvent & {
  minutesAgo: number;
  timeLabel: string;
};

const typeFilters: TypeFilter[] = ["All", "Created", "Updated", "Moved", "Deleted", "Packed"];
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

function getGroupLabel(minutesAgo: number) {
  if (minutesAgo <= 24 * 60) {
    return "Today";
  }

  if (minutesAgo <= 48 * 60) {
    return "Yesterday";
  }

  return "This Week";
}

function getMinutesAgo(occurredAt: string, nowMs: number) {
  const timestamp = new Date(occurredAt).getTime();

  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, Math.floor((nowMs - timestamp) / (60 * 1000)));
}

function formatRelativeTime(minutesAgo: number) {
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

export default function ActivityTabScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const isNarrow = width < 360;
  const hasFocusedOnceRef = useRef(false);

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
          event.room.toLowerCase().includes(normalizedSearch) ||
          (event.box ? event.box.toLowerCase().includes(normalizedSearch) : false);

        const matchesType = activeType === "All" || event.type === activeType;
        const matchesTime = event.minutesAgo <= maxMinutes;

        return matchesSearch && matchesType && matchesTime;
      })
      .sort((firstEvent, secondEvent) => firstEvent.minutesAgo - secondEvent.minutesAgo);
  }, [activeTime, activeType, events, search]);

  const groupedEvents = useMemo(() => {
    const grouped = visibleEvents.reduce<Record<string, ActivityTimelineEvent[]>>((acc, event) => {
      const label = getGroupLabel(event.minutesAgo);
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(event);
      return acc;
    }, {});

    const order = ["Today", "Yesterday", "This Week"];
    return order
      .filter((label) => grouped[label] && grouped[label].length > 0)
      .map((label) => ({ label, items: grouped[label] }));
  }, [visibleEvents]);

  const todayEventsCount = useMemo(
    () => visibleEvents.filter((event) => event.minutesAgo <= 24 * 60).length,
    [visibleEvents],
  );
  const movedEventsCount = useMemo(
    () => visibleEvents.filter((event) => event.type === "Moved").length,
    [visibleEvents],
  );
  const deletedEvents = useMemo(
    () => visibleEvents.filter((event) => event.type === "Deleted"),
    [visibleEvents],
  );

  return (
    <TabScreenLayout horizontalPadding={isCompact ? 16 : 20}>
      {errorMessage ? (
        <RetryErrorCard
          message={errorMessage}
          isRetrying={isRefreshing}
          retryingLabel="Refreshing..."
          onRetry={() => {
            clearError();
            void refreshActivity();
          }}
          className="mt-6"
        />
      ) : null}

      <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
        <MetricCard
          label="Events"
          value={String(visibleEvents.length)}
          hint={`Last ${activeTime}`}
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
        <MetricCard
          label="Today"
          value={String(todayEventsCount)}
          hint="Activity in 24h"
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
        <MetricCard
          label="Moves"
          value={String(movedEventsCount)}
          hint="Relocated items"
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
        <MetricCard
          label="Deleted"
          value={String(deletedEvents.length)}
          hint="Removed entities"
          style={{ width: isNarrow ? "100%" : "48.5%" }}
        />
      </View>

      <View className="mt-6 flex-row gap-3">
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search activity, room, or box"
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
            color={
              isFilterOpen || activeFilterCount > 0
                ? Colors.dark.primary
                : Colors.dark.textSecondary
            }
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
            <Text className="text-sm font-semibold text-text-primary">Filters</Text>
            <Pressable
              onPress={() => {
                setActiveType("All");
                setActiveTime("7d");
              }}
            >
              <Text className="text-xs font-semibold text-text-link">Clear</Text>
            </Pressable>
          </View>

          <FilterGroup
            label="Type"
            options={typeFilters}
            activeValue={activeType}
            onSelect={setActiveType}
            className="mt-4"
          />

          <FilterGroup
            label="Window"
            options={timeFilters}
            activeValue={activeTime}
            onSelect={setActiveTime}
            className="mt-4"
          />
        </View>
      ) : null}

      <View className="mt-8">
        <SectionHeader title="Timeline" actionLabel={`${visibleEvents.length} events`} />

        {groupedEvents.length > 0 ? (
          <View className="mt-4 gap-3">
            {groupedEvents.map((group) => (
              <View key={group.label} className="gap-3">
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
                  ? "Loading activity..."
                  : "No activity found"
              }
              description={
                isLoading || isRefreshing
                  ? "Fetching your recent history."
                  : "Try a different search query or adjust filters."
              }
            />
          </View>
        )}
      </View>
    </TabScreenLayout>
  );
}
