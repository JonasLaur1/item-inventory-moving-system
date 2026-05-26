import { FragilityBadge } from "@/components/ui/fragility-badge";
import { BoxStatusPill } from "@/components/ui/box-status-pill";
import { MetaPill } from "@/components/ui/meta-pill";
import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

export type InventoryBoxStatus = "Packed" | "Not packed" | "Delivered" | "Unpacked";

export type InventoryBox = {
  id: string;
  label: string;
  room: string;
  itemsCount: number;
  isFragile: boolean;
  status: InventoryBoxStatus;
  updatedAt: string;
};

type BoxCardProps = {
  box: InventoryBox;
  compact?: boolean;
  onPressOpen?: (box: InventoryBox) => void;
  onPressEdit?: (box: InventoryBox) => void;
};

export function BoxCard({ box, compact = false, onPressOpen, onPressEdit }: BoxCardProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemePreference();
  const palette = Colors[resolvedTheme];

  return (
    <View className="rounded-card border border-border-default bg-bg-elevated/70 p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-text-primary">{box.label}</Text>
          <Text className="mt-1 text-xs text-text-tertiary">{box.room}</Text>
        </View>
        <View className="flex-row flex-wrap justify-end gap-2">
          <BoxStatusPill status={box.status} />
          <FragilityBadge isFragile={box.isFragile} />
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <MetaPill icon="archive" text={t("inventory.itemsCount", { count: box.itemsCount })} />
        <MetaPill icon="clock" text={box.updatedAt} />
      </View>

      <View className={`mt-4 gap-3 ${compact ? "" : "flex-row"}`}>
        <Pressable
          onPress={onPressOpen ? () => onPressOpen(box) : undefined}
          hitSlop={4}
          accessibilityLabel={`Open box ${box.label}`}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-control border border-border-default bg-bg-input/60 py-3"
        >
          <Feather name="eye" size={13} color={palette.textSecondary} />
          <Text className="text-xs font-semibold text-text-secondary">{t("common.open")}</Text>
        </Pressable>
        <Pressable
          onPress={onPressEdit ? () => onPressEdit(box) : undefined}
          hitSlop={4}
          accessibilityLabel={`Edit box ${box.label}`}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-control border border-border-default bg-bg-input/60 py-3"
        >
          <Feather name="edit-2" size={13} color={palette.textSecondary} />
          <Text className="text-xs font-semibold text-text-secondary">{t("common.edit")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
