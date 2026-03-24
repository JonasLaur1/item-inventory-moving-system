import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { Colors } from "@/constants/theme";
import { useLocations } from "@/hooks/use-locations";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LocationConfigScreen() {
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];

  const { locations, isLoading, isRefreshing, errorMessage, refreshLocations } = useLocations();

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-5">
        <View className="flex-row items-center justify-between pt-3 pb-4">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-card border border-border-default bg-bg-elevated"
          >
            <Feather name="arrow-left" size={18} color={themeColors.textPrimary} />
          </Pressable>
          <Text className="text-base font-semibold text-text-primary">Location Configuration</Text>
          <View className="h-10 w-10" />
        </View>

        {errorMessage ? (
          <RetryErrorCard
            message={errorMessage}
            isRetrying={isRefreshing}
            retryingLabel="Refreshing..."
            onRetry={() => void refreshLocations()}
            className="mb-4"
          />
        ) : null}

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void refreshLocations()}
              />
            }
            ListEmptyComponent={
              <EmptyStateCard
                title="No locations yet"
                description="Create a location first to configure its rooms."
                containerClassName="mt-4"
              />
            }
            renderItem={({ item: location }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/location-config/[id]",
                    params: { id: location.id, name: location.name },
                  })
                }
                className="mb-3 flex-row items-center justify-between rounded-card border border-border-default bg-bg-elevated px-4 py-4"
              >
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text-primary">{location.name}</Text>
                  <Text className="mt-0.5 text-xs text-text-tertiary">
                    {location.rooms} {location.rooms === 1 ? "room" : "rooms"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={themeColors.textTertiary} />
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
