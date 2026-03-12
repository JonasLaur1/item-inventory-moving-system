import { MetaPill } from "@/components/ui/meta-pill";
import { Pressable, Text, View } from "react-native";

export type InventoryBoxStatus = "Packed" | "Unpacked";

export type InventoryBox = {
  id: string;
  label: string;
  room: string;
  itemsCount: number;
  fragileCount: number;
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
  const isPacked = box.status === "Packed";

  return (
    <View className="rounded-card border border-border-default bg-bg-elevated/70 p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-text-primary">{box.label}</Text>
          <Text className="mt-1 text-xs text-text-tertiary">{box.room}</Text>
        </View>
        <View
          className={`rounded-full px-3 py-1 ${
            isPacked ? "bg-emerald/20" : "bg-crimson/20"
          }`}
        >
          <Text className={`text-xs font-semibold ${isPacked ? "text-emerald" : "text-crimson"}`}>
            {box.status}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <MetaPill icon="archive" text={`${box.itemsCount} items`} />
        <MetaPill icon="alert-circle" text={`${box.fragileCount} fragile`} />
        <MetaPill icon="clock" text={box.updatedAt} />
      </View>

      <View className={`mt-4 gap-3 ${compact ? "" : "flex-row"}`}>
        <Pressable
          onPress={onPressOpen ? () => onPressOpen(box) : undefined}
          className="flex-1 items-center rounded-control border border-border-default bg-bg-input/60 py-2.5"
        >
          <Text className="text-xs font-semibold text-text-secondary">Open</Text>
        </Pressable>
        <Pressable
          onPress={onPressEdit ? () => onPressEdit(box) : undefined}
          className="flex-1 items-center rounded-control border border-border-default bg-bg-input/60 py-2.5"
        >
          <Text className="text-xs font-semibold text-text-secondary">Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}
