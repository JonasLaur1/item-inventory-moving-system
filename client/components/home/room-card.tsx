import { Colors } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { type PressableProps, View } from "react-native";

import { DashboardCard } from "./dashboard-card";

export type RoomCardProps = PressableProps & {
  name: string;
  packed: number;
  total: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

export function RoomCard({ name, packed, total, icon, ...props }: RoomCardProps) {
  const roomProgress = total === 0 ? 0 : Math.round((packed / total) * 100);
  const clampedProgress = Math.max(0, Math.min(100, roomProgress));

  return (
    <DashboardCard
      icon={<MaterialCommunityIcons name={icon} size={24} color={Colors.dark.primary} />}
      title={name}
      subtitle={`${packed}/${total} boxes`}
      className="border border-border-default bg-bg-elevated/75"
      iconContainerClassName="h-14 w-14 rounded-xl bg-primary/15"
      titleClassName="text-base text-text-primary"
      subtitleClassName="text-xs text-text-tertiary"
      footer={
        <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border-default">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${clampedProgress}%` }}
          />
        </View>
      }
      {...props}
    />
  );
}
