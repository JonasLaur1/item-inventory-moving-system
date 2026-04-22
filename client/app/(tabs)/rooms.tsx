import { Button } from "@/components/button";
import { SectionHeader } from "@/components/ui/section-header";
import { CardGrid } from "@/components/ui/card-grid";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { CreateLocationModal } from "@/components/inventory/create-location-modal";
import { Colors } from "@/constants/theme";
import { useLocations } from "@/hooks/use-locations";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { getLocationIcon } from "@/utils/location-icon";
import { Feather } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View, useWindowDimensions } from "react-native";

const LOCATION_CARD_MIN_HEIGHT = 110;

export default function RoomsTabScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];
  const hasFocusedOnceRef = useRef(false);

  const {
    locations,
    isLoading,
    isRefreshing,
    errorMessage,
    refreshLocations,
  } = useLocations();

  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      void refreshLocations();
    }, [refreshLocations]),
  );

  return (
    <TabScreenLayout
      horizontalPadding={isCompact ? 16 : 20}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => void refreshLocations()} />
      }
    >
      {errorMessage ? (
        <RetryErrorCard
          message={errorMessage}
          isRetrying={isRefreshing}
          retryingLabel="Refreshing..."
          onRetry={() => void refreshLocations()}
          className="mt-6"
        />
      ) : null}

      <View className="mt-6">
        <SectionHeader title="Locations" />
      </View>

      {isLoading && locations.length === 0 ? (
        <View className="mt-6 items-center">
          <ActivityIndicator />
        </View>
      ) : locations.length === 0 ? (
        <>
          <EmptyStateCard
            title="No locations yet"
            description="Create your first location to start organizing your inventory."
            containerClassName="mt-4"
          />
          <Button
            label="Create Location"
            onPress={() => setIsAddLocationModalOpen(true)}
            className="mt-4"
          />
        </>
      ) : (
        <CardGrid
          items={locations}
          compact={isCompact}
          itemMinHeight={LOCATION_CARD_MIN_HEIGHT}
          className="mt-4"
          keyExtractor={(loc) => loc.id}
          renderItem={(loc, contentStyle) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: "/location/[id]", params: { id: loc.id } })
              }
              className="rounded-card border border-border-default bg-bg-elevated/75"
              style={contentStyle}
            >
              <View className="flex-1 p-3">
                <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                  <MaterialCommunityIcons
                    name={getLocationIcon(loc.name)}
                    size={20}
                    color={themeColors.primary}
                  />
                </View>
                <Text className="text-sm font-semibold text-text-primary" numberOfLines={2}>
                  {loc.name}
                </Text>
                <Text className="mt-0.5 text-xs text-text-tertiary">
                  {loc.rooms} room{loc.rooms !== 1 ? "s" : ""}
                </Text>
              </View>
            </Pressable>
          )}
          footer={(contentStyle) => (
            <Pressable
              onPress={() => setIsAddLocationModalOpen(true)}
              className="items-center justify-center rounded-card border border-dashed border-border-strong bg-bg-elevated/40"
              style={contentStyle}
            >
              <Feather name="plus" size={20} color={themeColors.primary} />
              <Text className="mt-2 text-xs font-medium text-text-secondary">Add Location</Text>
            </Pressable>
          )}
        />
      )}

      <CreateLocationModal
        visible={isAddLocationModalOpen}
        onClose={() => {
          setIsAddLocationModalOpen(false);
          void refreshLocations();
        }}
        onCreated={(id) => {
          router.push({ pathname: "/location/[id]", params: { id } });
        }}
      />
    </TabScreenLayout>
  );
}
