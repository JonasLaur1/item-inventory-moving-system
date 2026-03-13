import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export type InventoryItemRowData = {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  icon?: keyof typeof Feather.glyphMap;
};

type ItemRowProps = {
  item: InventoryItemRowData;
  onPressEdit?: (item: InventoryItemRowData) => void;
  onPressDelete?: (item: InventoryItemRowData) => void;
};

export function ItemRow({ item, onPressEdit, onPressDelete }: ItemRowProps) {
  const hasActions = Boolean(onPressEdit || onPressDelete);

  return (
    <View className="flex-row items-center rounded-card border border-border-default bg-bg-elevated/70 p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/20">
        <Feather name={item.icon ?? "tag"} size={16} color={Colors.dark.primary} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-text-primary">{item.title}</Text>
        {item.subtitle ? <Text className="mt-1 text-xs text-text-tertiary">{item.subtitle}</Text> : null}
      </View>
      <View className={`${hasActions ? "items-end gap-2" : ""}`}>
        {item.badgeText ? <Text className="text-xs font-semibold text-text-link">{item.badgeText}</Text> : null}
        {hasActions ? (
          <View className="flex-row gap-2">
            {onPressEdit ? (
              <Pressable
                onPress={() => onPressEdit(item)}
                hitSlop={6}
                className="h-8 w-8 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
              >
                <Feather name="edit-2" size={14} color={Colors.dark.textPrimary} />
              </Pressable>
            ) : null}
            {onPressDelete ? (
              <Pressable
                onPress={() => onPressDelete(item)}
                hitSlop={6}
                className="h-8 w-8 items-center justify-center rounded-full border border-crimson/40 bg-crimson/10"
              >
                <Feather name="trash-2" size={14} color={Colors.dark.crimson} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
