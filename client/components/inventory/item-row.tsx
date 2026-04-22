import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { CollaboratorPill } from "@/components/ui/collaborator-pill";
import { FragilityBadge } from "@/components/ui/fragility-badge";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

export type InventoryItemRowData = {
  id: string;
  title: string;
  subtitle?: string;
  quantity?: number;
  isFragile?: boolean;
  rightLabel?: string;
  icon?: keyof typeof Feather.glyphMap;
  photoUrl?: string | null;
  isCollaborator?: boolean;
  actorName?: string | null;
};

type ItemRowProps = {
  item: InventoryItemRowData;
  onPressEdit?: (item: InventoryItemRowData) => void;
  onPressDelete?: (item: InventoryItemRowData) => void;
  isChecked?: boolean;
  onPressCheck?: () => void;
};

export function ItemRow({ item, onPressEdit, onPressDelete, isChecked, onPressCheck }: ItemRowProps) {
  const { resolvedTheme } = useThemePreference();
  const palette = Colors[resolvedTheme];

  const hasActions = Boolean(onPressEdit || onPressDelete);
  const hasQuantity = typeof item.quantity === "number";
  const isCollaborator = Boolean(item.isCollaborator);

  return (
    <View
      className="flex-row items-center rounded-card border border-border-default bg-bg-elevated/70 p-4"
      style={isCollaborator ? { borderLeftColor: palette.primary, borderLeftWidth: 3 } : undefined}
    >
      {item.photoUrl ? (
        <Image
          source={{ uri: item.photoUrl }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/20">
          <Feather name={item.icon ?? "layers"} size={16} color={palette.primary} />
        </View>
      )}

      <View className="ml-3 flex-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-sm font-semibold text-text-primary">{item.title}</Text>
          {hasQuantity ? (
            <View className="rounded-full bg-primary/15 px-2 py-0.5">
              <Text className="text-[10px] font-semibold uppercase text-text-link">
                x{item.quantity}
              </Text>
            </View>
          ) : null}
          {typeof item.isFragile === "boolean" ? (
            <FragilityBadge isFragile={item.isFragile} />
          ) : null}
        </View>
        {item.subtitle ? (
          <Text className="mt-1 text-xs text-text-tertiary">{item.subtitle}</Text>
        ) : null}
        {isCollaborator ? (
          <View className="mt-1">
            <CollaboratorPill actorName={item.actorName} size="sm" />
          </View>
        ) : null}
      </View>

      {onPressCheck ? (
        <Pressable
          onPress={onPressCheck}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isChecked }}
          accessibilityLabel={isChecked ? `Uncheck ${item.title}` : `Check ${item.title}`}
        >
          <Feather
            name={isChecked ? "check-circle" : "circle"}
            size={22}
            color={isChecked ? palette.primary : palette.textTertiary}
          />
        </Pressable>
      ) : null}
      {!onPressCheck && !hasActions && item.rightLabel ? (
        <Text className="text-xs font-semibold text-text-link">{item.rightLabel}</Text>
      ) : null}
      {!onPressCheck && hasActions ? (
        <View className="flex-row gap-2">
          {onPressEdit ? (
            <Pressable
              onPress={() => onPressEdit(item)}
              hitSlop={6}
              accessibilityLabel={`Edit ${item.title}`}
              accessibilityRole="button"
              className="h-8 w-8 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
            >
              <Feather name="edit-2" size={14} color={palette.textPrimary} />
            </Pressable>
          ) : null}
          {onPressDelete ? (
            <Pressable
              onPress={() => onPressDelete(item)}
              hitSlop={6}
              accessibilityLabel={`Delete ${item.title}`}
              accessibilityRole="button"
              className="h-8 w-8 items-center justify-center rounded-full border border-crimson/40 bg-crimson/10"
            >
              <Feather name="trash-2" size={14} color={palette.crimson} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
