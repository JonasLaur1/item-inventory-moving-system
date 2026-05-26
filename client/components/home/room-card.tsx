import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { type PressableProps } from "react-native";

import { DashboardCard } from "./dashboard-card";

export type RoomCardProps = PressableProps & {
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

export function RoomCard({ name, icon, ...props }: RoomCardProps) {
  const { resolvedTheme } = useThemePreference();
  const palette = Colors[resolvedTheme];

  return (
    <DashboardCard
      icon={<MaterialCommunityIcons name={icon} size={24} color={palette.primary} />}
      title={name}
      className="border border-border-default bg-bg-elevated/75"
      iconContainerClassName="h-14 w-14 rounded-xl bg-primary/15"
      titleClassName="text-base text-text-primary"
      {...props}
    />
  );
}
