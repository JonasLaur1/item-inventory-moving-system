import { DashboardCard } from "@/components/home/dashboard-card";
import { RoomCard, type RoomCardProps } from "@/components/home/room-card";
import { SectionHeader } from "@/components/home/section-header";
import { CardGrid } from "@/components/ui/card-grid";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { SearchBar } from "@/components/ui/search-bar";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { CreateLocationModal } from "@/components/inventory/create-location-modal";
import { Colors } from "@/constants/theme";
import { useLocations } from "@/hooks/use-locations";
import { getLocationIcon } from "@/utils/location-icon";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, type ViewStyle } from "react-native";
import { View, useWindowDimensions } from "react-native";

type RoomStatus = "Done" | "Packing" | "Started" | "Empty";
type LocationCard = {
  id: string;
  name: string;
  icon: RoomCardProps["icon"];
  boxes: number;
  packedBoxes: number;
  items: number;
};

const PREVIEW_LOCATIONS_COUNT = 5;
const ROOM_GRID_CARD_MIN_HEIGHT = 170;

function getRoomStatus(location: Pick<LocationCard, "boxes" | "packedBoxes">): RoomStatus {
  const totalBoxes = Math.max(location.boxes, 0);
  const packedBoxes = Math.max(location.packedBoxes, 0);

  if (totalBoxes === 0 || packedBoxes === 0) {
    return "Empty";
  }

  const completionRatio = packedBoxes / totalBoxes;

  if (completionRatio >= 1) {
    return "Done";
  }

  if (completionRatio < 0.4) {
    return "Started";
  }

  return "Packing";
}

function AddLocationCard({
  style,
  disabled,
  onPress,
}: {
  style: ViewStyle;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <DashboardCard
      icon={<Feather name="plus" size={20} color={Colors.dark.primary} />}
      title="Add Location"
      subtitle="Create a new place"
      className="border border-dashed border-border-strong bg-bg-elevated/40"
      iconContainerClassName="h-14 w-14 rounded-xl bg-primary/20"
      titleClassName="text-base text-text-primary"
      subtitleClassName="text-xs text-text-tertiary"
      onPress={onPress}
      disabled={disabled}
      style={style}
    />
  );
}

export default function RoomsTabScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 400;

  const {
    locations,
    isLoading,
    isRefreshing,
    errorMessage,
    refreshLocations,
  } = useLocations();

  const [search, setSearch] = useState("");
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const mappedLocations: LocationCard[] = useMemo(
    () =>
      locations.map((location) => ({
        id: location.id,
        name: location.name,
        icon: getLocationIcon(location.name),
        boxes: location.boxes,
        packedBoxes: location.packedBoxes,
        items: location.items,
      })),
    [locations],
  );

  const filteredLocations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return mappedLocations;
    }

    return mappedLocations.filter((location) => {
      const derivedStatus = getRoomStatus(location).toLowerCase();
      return (
        location.name.toLowerCase().includes(normalizedSearch) ||
        derivedStatus.includes(normalizedSearch)
      );
    });
  }, [mappedLocations, search]);

  const totalItems = useMemo(
    () => filteredLocations.reduce((total, location) => total + location.items, 0),
    [filteredLocations],
  );

  const packedPercentage = useMemo(() => {
    const totalBoxes = filteredLocations.reduce((total, location) => total + location.boxes, 0);
    const packedBoxes = filteredLocations.reduce((total, location) => total + location.packedBoxes, 0);
    return totalBoxes === 0 ? 0 : Math.round((packedBoxes / totalBoxes) * 100);
  }, [filteredLocations]);

  const canExpand = filteredLocations.length > PREVIEW_LOCATIONS_COUNT;
  const visibleLocations = showAllLocations
    ? filteredLocations
    : filteredLocations.slice(0, PREVIEW_LOCATIONS_COUNT);

  const openModal = useCallback(() => setIsModalOpen(true), []);

  return (
    <TabScreenLayout horizontalPadding={isCompact ? 16 : 20}>
      {errorMessage ? (
        <RetryErrorCard
          message={errorMessage}
          isRetrying={isRefreshing}
          retryingLabel="Refreshing..."
          onRetry={() => void refreshLocations()}
          className="mt-6"
        />
      ) : null}

      <View className={`mt-6 gap-3 ${isCompact ? "" : "flex-row"}`}>
        <MetricCard
          label="Total Items"
          value={String(totalItems)}
          hint={`${filteredLocations.length} locations`}
          className="flex-1"
          valueClassName="text-[30px] font-black leading-[34px] text-text-primary"
        />
        <MetricCard
          label="Packed"
          value={`${packedPercentage}%`}
          hint="By box completion"
          progress={packedPercentage}
          className="flex-1"
          valueClassName="text-[30px] font-black leading-[34px] text-text-primary"
        />
      </View>

      <View className="mt-5">
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search locations or status"
        />
      </View>

      <View className="mt-8">
        <SectionHeader
          title="Locations"
          actionLabel={canExpand ? (showAllLocations ? "Show Less" : "View All") : undefined}
          onPressAction={canExpand ? () => setShowAllLocations((prev) => !prev) : undefined}
        />

        {isLoading && mappedLocations.length === 0 ? (
          <View className="mt-6 items-center">
            <ActivityIndicator />
          </View>
        ) : (
          <CardGrid
            items={visibleLocations}
            compact={isCompact}
            itemMinHeight={ROOM_GRID_CARD_MIN_HEIGHT}
            className="mt-4"
            keyExtractor={(location) => location.id}
            renderItem={(location, contentStyle) => (
              <RoomCard
                name={location.name}
                packed={location.packedBoxes}
                total={location.boxes}
                icon={location.icon}
                style={contentStyle}
                onPress={() => router.push({ pathname: "/location/[id]", params: { id: location.id } })}
              />
            )}
            footer={(contentStyle) => (
              <AddLocationCard
                style={contentStyle}
                onPress={openModal}
                disabled={false}
              />
            )}
          />
        )}

        {!isLoading && !errorMessage && filteredLocations.length === 0 ? (
          <EmptyStateCard
            title={search.trim().length > 0 ? "No locations match your search" : "No locations yet"}
            description={
              search.trim().length > 0
                ? "Try a different search query."
                : "Create your first location to start organizing your inventory."
            }
            containerClassName="mt-4"
          />
        ) : null}
      </View>

      <CreateLocationModal
        visible={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          void refreshLocations();
        }}
      />
    </TabScreenLayout>
  );
}
