import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Colors } from "@/constants/theme";
import { useLocations } from "@/hooks/use-locations";
import { useMovingMode } from "@/hooks/use-moving-mode";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { type LocationSummary } from "@/lib/location.service";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const RING_SIZE = 180;
const STROKE_WIDTH = 14;
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
  const { t } = useTranslation();
  const dashOffset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, progress)) / 100);
  return (
    <View className="items-center">
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
          <Text className="text-4xl font-bold text-text-primary">{Math.round(progress)}%</Text>
          <Text className="mt-1 text-sm text-text-tertiary">
            {t("movingProgress.deliveredCount", { delivered, total })}
          </Text>
        </View>
      </View>
    </View>
  );
}

type StatItemProps = { label: string; value: number };

function StatItem({ label, value }: StatItemProps) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-lg font-bold text-text-primary">{value}</Text>
      <Text className="mt-0.5 text-xs text-text-tertiary">{label}</Text>
    </View>
  );
}

type LocationProgressCardProps = {
  location: LocationSummary;
  isFrom: boolean;
  isTo: boolean;
};

function LocationProgressCard({ location, isFrom, isTo }: LocationProgressCardProps) {
  const { t } = useTranslation();
  const delivered = location.deliveredBoxes - location.unpackedAtDestinationBoxes;
  const unpacked = location.unpackedAtDestinationBoxes;
  const deliveryProgress =
    location.boxes > 0 ? (location.deliveredBoxes / location.boxes) * 100 : 0;

  return (
    <View className="rounded-card border border-border-default bg-bg-elevated p-4">
      <View className="flex-row items-start justify-between">
        <View className="mr-2 flex-1">
          <Text className="text-base font-semibold text-text-primary" numberOfLines={1}>
            {location.name}
          </Text>
          {location.address ? (
            <Text className="mt-0.5 text-xs text-text-tertiary" numberOfLines={1}>
              {location.address}
            </Text>
          ) : null}
        </View>
        {isFrom || isTo ? (
          <View className="rounded-control bg-primary/15 px-2.5 py-0.5">
            <Text className="text-xs font-semibold text-primary">
              {isFrom ? t("movingProgress.from") : t("movingProgress.to")}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border-default">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, deliveryProgress))}%` }}
        />
      </View>
      <View className="mt-4 flex-row">
        <StatItem label={t("movingProgress.total")} value={location.boxes} />
        <StatItem label={t("movingProgress.packed")} value={location.packedBoxes} />
        <StatItem label={t("movingProgress.delivered")} value={delivered} />
        <StatItem label={t("movingProgress.unpacked")} value={unpacked} />
      </View>
    </View>
  );
}

export default function MovingProgressScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];
  const { fromLocationId, toLocationId } = useMovingMode();
  const { locations, isLoading, isRefreshing, errorMessage, refreshLocations, clearError } =
    useLocations();

  const moveLocations = useMemo(
    () => locations.filter((loc) => loc.id === fromLocationId || loc.id === toLocationId),
    [locations, fromLocationId, toLocationId],
  );

  const stats = useMemo(() => {
    const total = moveLocations.reduce((sum, loc) => sum + loc.boxes, 0);
    const packed = moveLocations.reduce((sum, loc) => sum + loc.packedBoxes, 0);
    const totalDeliveredCombined = moveLocations.reduce((sum, loc) => sum + loc.deliveredBoxes, 0);
    const unpacked = moveLocations.reduce((sum, loc) => sum + loc.unpackedAtDestinationBoxes, 0);
    const delivered = totalDeliveredCombined - unpacked;
    const progress = total > 0 ? (totalDeliveredCombined / total) * 100 : 0;
    return { total, packed, delivered, unpacked, totalDeliveredCombined, progress };
  }, [moveLocations]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-bg-base">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void refreshLocations()} />
        }
      >
        <View className="mt-4 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-card border border-border-strong bg-bg-input"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="chevron-left" size={20} color={themeColors.textPrimary} />
          </Pressable>
          <Text className="flex-1 text-2xl font-bold text-text-primary">{t("movingProgress.title")}</Text>
        </View>

        {isLoading ? (
          <View className="mt-20 items-center">
            <ActivityIndicator />
          </View>
        ) : errorMessage ? (
          <RetryErrorCard
            message={errorMessage}
            isRetrying={isRefreshing}
            retryingLabel={t("common.refreshing")}
            onRetry={() => {
              clearError();
              void refreshLocations();
            }}
            className="mt-8"
          />
        ) : locations.length === 0 ? (
          <EmptyStateCard
            title={t("movingProgress.noLocationsYet")}
            description={t("movingProgress.noLocationsYetDesc")}
            containerClassName="mt-8"
          />
        ) : (
          <>
            <View className="mt-8 gap-3">
              <DeliveryRing
                delivered={stats.totalDeliveredCombined}
                total={stats.total}
                progress={stats.progress}
                primary={themeColors.primary}
                track={themeColors.borderDefault}
              />
              <Pressable
                onPress={() => router.push("/(tabs)/scan?from=moving-progress")}
                className="flex-row items-center gap-3 rounded-card border border-border-default bg-bg-elevated/70 px-4 py-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/20">
                  <Feather name="camera" size={18} color={themeColors.primary} />
                </View>
                <View>
                  <Text className="text-base font-bold text-text-primary">{t("movingProgress.scanBox")}</Text>
                  <Text className="text-xs text-text-tertiary">{t("movingProgress.scanQr")}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={themeColors.textTertiary} style={{ marginLeft: "auto" }} />
              </Pressable>
            </View>

            <View className="mt-8">
              <SectionHeader title={t("movingProgress.overview")} />
              <View className="mt-4 flex-row flex-wrap gap-3">
                <MetricCard
                  label={t("movingProgress.totalBoxes")}
                  value={String(stats.total)}
                  style={{ width: "48.5%" }}
                />
                <MetricCard
                  label={t("movingProgress.packed")}
                  value={String(stats.packed)}
                  variant="success"
                  style={{ width: "48.5%" }}
                />
                <MetricCard
                  label={t("movingProgress.delivered")}
                  value={String(stats.delivered)}
                  valueClassName="text-2xl font-bold text-primary"
                  style={{ width: "48.5%" }}
                />
                <MetricCard
                  label={t("movingProgress.unpacked")}
                  value={String(stats.unpacked)}
                  valueClassName="text-2xl font-bold text-primary"
                  style={{ width: "48.5%" }}
                />
              </View>
            </View>

            <View className="mt-8">
              <SectionHeader title={t("movingProgress.byLocation")} />
              <View className="mt-4 gap-3">
                {moveLocations.map((loc) => (
                  <LocationProgressCard
                    key={loc.id}
                    location={loc}
                    isFrom={loc.id === fromLocationId}
                    isTo={loc.id === toLocationId}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
