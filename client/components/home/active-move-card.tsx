import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { type LocationSummary } from "@/lib/location.service";

type ActiveMoveCardProps = {
  fromLocation: LocationSummary;
  toLocation: LocationSummary;
  onPress: () => void;
};

export function ActiveMoveCard({ fromLocation, toLocation, onPress }: ActiveMoveCardProps) {
  const { resolvedTheme } = useThemePreference();
  const iconColor = Colors[resolvedTheme].textTertiary;

  const delivered = fromLocation.deliveredBoxes;
  const total = fromLocation.boxes;
  const progress = total > 0 ? (delivered / total) * 100 : 0;

  return (
    <Pressable
      onPress={onPress}
      className="rounded-card border border-border-default bg-bg-elevated/70 px-4 py-4"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
            {fromLocation.name}
          </Text>
          <Feather name="arrow-right" size={14} color={iconColor} />
          <Text className="flex-1 text-sm font-semibold text-text-primary" numberOfLines={1}>
            {toLocation.name}
          </Text>
        </View>
        <Text className="ml-3 text-sm text-text-tertiary">
          {delivered}/{total}
        </Text>
      </View>

      <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-border-default">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </View>

      <Text className="mt-2 text-xs text-text-tertiary">
        {delivered === total && total > 0 ? "All boxes delivered" : `${delivered} of ${total} boxes delivered`}
      </Text>
    </Pressable>
  );
}
