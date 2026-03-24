import { MetaPill } from "@/components/ui/meta-pill";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Colors } from "@/constants/theme";

export type InventoryBoxStatus = "Packed" | "Unpacked" | "Delivered" | "At Destination";

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

function getStatusPillStyle(status: InventoryBoxStatus): { bg: string; text: string } {
  switch (status) {
    case "Packed":
      return { bg: "bg-emerald/20", text: "text-emerald" };
    case "Delivered":
    case "At Destination":
      return { bg: "bg-primary/20", text: "text-primary" };
    default:
      return { bg: "bg-crimson/20", text: "text-crimson" };
  }
}

export function BoxCard({ box, compact = false, onPressOpen, onPressEdit }: BoxCardProps) {
  const statusStyle = getStatusPillStyle(box.status);
  const fragilePillClassName = box.isFragile ? "bg-amber-500/20" : "bg-slate-500/20";
  const fragileTextClassName = box.isFragile ? "text-amber-300" : "text-slate-300";

  return (
    <View className="rounded-card border border-border-default bg-bg-elevated/70 p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-text-primary">{box.label}</Text>
          <Text className="mt-1 text-xs text-text-tertiary">{box.room}</Text>
        </View>
        <View className="flex-row flex-wrap justify-end gap-2">
          <View className={`rounded-full px-3 py-1 ${statusStyle.bg}`}>
            <Text className={`text-xs font-semibold ${statusStyle.text}`}>
              {box.status}
            </Text>
          </View>
          <View className={`rounded-full px-3 py-1 ${fragilePillClassName}`}>
            <Text className={`text-xs font-semibold ${fragileTextClassName}`}>
              {box.isFragile ? "Fragile" : "Not fragile"}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <MetaPill icon="archive" text={`${box.itemsCount} items`} />
        <MetaPill icon="clock" text={box.updatedAt} />
      </View>

      <View className={`mt-4 gap-3 ${compact ? "" : "flex-row"}`}>
        <Pressable
          onPress={onPressOpen ? () => onPressOpen(box) : undefined}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-control border border-border-default bg-bg-input/60 py-2.5"
        >
          <Feather name="eye" size={13} color={Colors.dark.textSecondary} />
          <Text className="text-xs font-semibold text-text-secondary">Open</Text>
        </Pressable>
        <Pressable
          onPress={onPressEdit ? () => onPressEdit(box) : undefined}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-control border border-border-default bg-bg-input/60 py-2.5"
        >
          <Feather name="edit-2" size={13} color={Colors.dark.textSecondary} />
          <Text className="text-xs font-semibold text-text-secondary">Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}
