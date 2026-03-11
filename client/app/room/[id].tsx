import { Button } from "@/components/button";
import { SectionHeader } from "@/components/home/section-header";
import { BoxCard, type InventoryBox, type InventoryBoxStatus } from "@/components/inventory/box-card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MetricCard } from "@/components/ui/metric-card";
import { Colors } from "@/constants/theme";
import { locationService, type LocationDetails } from "@/lib/location.service";
import { getLocationIcon } from "@/utils/location-icon";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

function formatUpdatedAt(isoDate: string | null): string {
  if (!isoDate) {
    return "Unknown";
  }

  return formatRelativeTime(getMinutesAgo(isoDate, Date.now()));
}

function normalizeBoxStatus(status: string | null): InventoryBoxStatus {
  return status?.toLowerCase() === "packed" ? "Packed" : "Unpacked";
}

export default function RoomDetailsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const isNarrow = width < 360;
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const hasFocusedOnceRef = useRef(false);

  const roomId = useMemo(() => {
    if (!params.id) {
      return "";
    }

    return Array.isArray(params.id) ? params.id[0] ?? "" : params.id;
  }, [params.id]);

  const [room, setRoom] = useState<LocationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRoom = useCallback(
    async (refresh: boolean) => {
      if (!roomId) {
        setErrorMessage("Room id is missing.");
        setRoom(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const details = await locationService.getLocationDetails(roomId);
        setRoom(details);
        setErrorMessage(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load room.";
        setErrorMessage(message);
      } finally {
        if (refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [roomId],
  );

  useEffect(() => {
    void loadRoom(false);
  }, [loadRoom]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void loadRoom(true);
    }, [loadRoom]),
  );

  const boxes: InventoryBox[] = useMemo(() => {
    if (!room) {
      return [];
    }

    return room.boxList.map((box, index) => ({
      id: box.id,
      label: box.name || `Box #${index + 1}`,
      room: room.name,
      itemsCount: box.itemsCount,
      fragileCount: 0,
      status: normalizeBoxStatus(box.status),
      updatedAt: formatUpdatedAt(box.updatedAt),
    }));
  }, [room]);

  if (isLoading && !room) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: isCompact ? 16 : 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-2 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-card border border-border-default bg-bg-elevated"
          >
            <Feather name="arrow-left" size={18} color={Colors.dark.textPrimary} />
          </Pressable>
          <Text className="text-base font-semibold text-text-primary">Room Details</Text>
          <View className="h-10 w-10" />
        </View>

        {errorMessage ? (
          <View className="mt-6 rounded-card border border-border-default bg-bg-elevated/80 p-4">
            <Text className="text-sm font-semibold text-text-primary">{errorMessage}</Text>
            <Button
              label={isRefreshing ? "Refreshing..." : "Retry"}
              variant="secondary"
              onPress={() => void loadRoom(true)}
              disabled={isRefreshing}
              className="mt-3"
              textClassName="text-sm"
            />
          </View>
        ) : null}

        {room ? (
          <>
            <View className="mt-6 rounded-card border border-border-default bg-bg-elevated/70 p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                  <MaterialCommunityIcons
                    name={getLocationIcon(room.name)}
                    size={22}
                    color={Colors.dark.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-text-primary">{room.name}</Text>
                  <Text className="mt-1 text-xs text-text-tertiary">
                    {room.boxes} boxes • {room.items} items
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
              <MetricCard
                label="Boxes"
                value={String(room.boxes)}
                style={{ width: isNarrow ? "100%" : "48.5%" }}
              />
              <MetricCard
                label="Packed"
                value={String(room.packedBoxes)}
                style={{ width: isNarrow ? "100%" : "48.5%" }}
              />
              <MetricCard
                label="Items"
                value={String(room.items)}
                style={{ width: "100%" }}
              />
            </View>

            <View className="mt-8">
              <SectionHeader title="Boxes" actionLabel={`${boxes.length} total`} />
              <View className="mt-4 gap-3">
                {boxes.length > 0 ? (
                  boxes.map((box) => <BoxCard key={box.id} box={box} compact={isCompact} />)
                ) : (
                  <EmptyStateCard
                    title="No boxes yet"
                    description="Add your first box to this room from the inventory flow."
                  />
                )}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
