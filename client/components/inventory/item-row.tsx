import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

export type InventoryItemRowData = {
  id: string;
  title: string;
  subtitle?: string;
  quantity?: number;
  badgeText?: string;
  icon?: keyof typeof Feather.glyphMap;
  photoUrl?: string | null;
  isCollaborator?: boolean;
  actorName?: string | null;
};

type ItemRowProps = {
  item: InventoryItemRowData;
  onPressEdit?: (item: InventoryItemRowData) => void;
  onPressDelete?: (item: InventoryItemRowData) => void;
};

export function ItemRow({ item, onPressEdit, onPressDelete }: ItemRowProps) {
  const { resolvedTheme } = useThemePreference();
  const palette = Colors[resolvedTheme];

  const hasActions = Boolean(onPressEdit || onPressDelete);
  const hasQuantity = typeof item.quantity === "number";
  const hasInlineBadge = hasQuantity && Boolean(item.badgeText);
  const normalizedBadgeText = item.badgeText?.trim().toLowerCase();
  const isFragileBadge = normalizedBadgeText === "fragile";
  const isNotFragileBadge = normalizedBadgeText === "not fragile";
  const isCollaborator = Boolean(item.isCollaborator);
  const actorLabel = item.actorName ?? "Collaborator";

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
          <Feather name={item.icon ?? "tag"} size={16} color={palette.primary} />
        </View>
      )}
      <View className="ml-3 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-text-primary">{item.title}</Text>
          {hasQuantity ? (
            <View className="rounded-full bg-primary/15 px-2 py-0.5">
              <Text className="text-[10px] font-semibold uppercase text-text-link">
                Qty {item.quantity}
              </Text>
            </View>
          ) : null}
          {hasInlineBadge ? (
            <View
              className={`rounded-full px-2 py-0.5 ${
                isFragileBadge
                  ? "bg-amber-500/20"
                  : isNotFragileBadge
                    ? "bg-slate-500/20"
                    : "bg-primary/15"
              }`}
            >
              <Text
                className={`text-[10px] font-semibold uppercase ${
                  isFragileBadge
                    ? "text-amber-300"
                    : isNotFragileBadge
                      ? "text-slate-300"
                      : "text-text-link"
                }`}
              >
                {item.badgeText}
              </Text>
            </View>
          ) : null}
        </View>
        {item.subtitle ? <Text className="mt-1 text-xs text-text-tertiary">{item.subtitle}</Text> : null}
        {isCollaborator ? (
          <View className="mt-1 flex-row items-center gap-1">
            <Feather name="users" size={10} color={palette.primary} />
            <Text className="text-[10px] font-medium text-text-link">{actorLabel}</Text>
          </View>
        ) : null}
      </View>
      <View className={`${hasActions ? "items-end gap-2" : ""}`}>
        {!hasInlineBadge && item.badgeText ? (
          <Text className="text-xs font-semibold text-text-link">{item.badgeText}</Text>
        ) : null}
        {hasActions ? (
          <View className="flex-row gap-2">
            {onPressEdit ? (
              <Pressable
                onPress={() => onPressEdit(item)}
                hitSlop={6}
                className="h-8 w-8 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
              >
                <Feather name="edit-2" size={14} color={palette.textPrimary} />
              </Pressable>
            ) : null}
            {onPressDelete ? (
              <Pressable
                onPress={() => onPressDelete(item)}
                hitSlop={6}
                className="h-8 w-8 items-center justify-center rounded-full border border-crimson/40 bg-crimson/10"
              >
                <Feather name="trash-2" size={14} color={palette.crimson} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
