import { FragilityBadge } from "@/components/ui/fragility-badge";
import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import type { ItemSearchResult } from "@/lib/item.service";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type SearchItemResultProps = {
  item: ItemSearchResult;
  onPress: () => void;
};

export function SearchItemResult({ item, onPress }: SearchItemResultProps) {
  const { resolvedTheme } = useThemePreference();
  const palette = Colors[resolvedTheme];
  const breadcrumb = `${item.locationName} / ${item.roomName} / ${item.boxName}`;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-card border border-border-default bg-bg-elevated px-4 py-3"
    >
      <View className="flex-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-sm font-semibold text-text-primary">{item.name}</Text>
          {item.isFragile ? <FragilityBadge isFragile /> : null}
          {item.quantity > 1 ? (
            <View className="rounded-full bg-bg-input px-2 py-0.5">
              <Text className="text-xs text-text-tertiary">×{item.quantity}</Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-1 text-xs text-text-tertiary" numberOfLines={1}>
          {breadcrumb}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={palette.textTertiary} />
    </Pressable>
  );
}
