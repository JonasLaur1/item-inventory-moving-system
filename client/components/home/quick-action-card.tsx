import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { type PressableProps } from "react-native";

import { DashboardCard } from "./dashboard-card";

type QuickActionVariant = "primary" | "secondary";

type QuickActionCardProps = PressableProps & {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  variant?: QuickActionVariant;
};

export function QuickActionCard({
  title,
  subtitle,
  icon,
  variant = "primary",
  ...props
}: QuickActionCardProps) {
  const isPrimary = variant === "primary";

  return (
    <DashboardCard
      icon={
        <Feather
          name={icon}
          size={20}
          color={isPrimary ? Colors.dark.textPrimary : Colors.dark.primary}
        />
      }
      title={title}
      subtitle={subtitle}
      className={
        isPrimary
          ? "flex-1 bg-primary shadow-soft"
          : "flex-1 border border-border-default bg-bg-elevated/70"
      }
      iconContainerClassName={isPrimary ? "bg-white/15" : "bg-primary/20"}
      titleClassName="text-text-primary"
      subtitleClassName={isPrimary ? "text-text-secondary/80" : "text-text-tertiary"}
      {...props}
    />
  );
}
