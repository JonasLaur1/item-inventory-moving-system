import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

export type InventoryItemRowData = {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  icon?: keyof typeof Feather.glyphMap;
};

type ItemRowProps = {
  item: InventoryItemRowData;
};

export function ItemRow({ item }: ItemRowProps) {
  return (
    <View className="flex-row items-center rounded-card border border-border-default bg-bg-elevated/70 p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/20">
        <Feather name={item.icon ?? "tag"} size={16} color={Colors.dark.primary} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-text-primary">{item.title}</Text>
        {item.subtitle ? <Text className="mt-1 text-xs text-text-tertiary">{item.subtitle}</Text> : null}
      </View>
      {item.badgeText ? <Text className="text-xs font-semibold text-text-link">{item.badgeText}</Text> : null}
    </View>
  );
}
