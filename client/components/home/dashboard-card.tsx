import { type ReactNode } from "react";
import { Pressable, Text, type PressableProps, View } from "react-native";

type DashboardCardProps = PressableProps & {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
  iconContainerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  footer?: ReactNode;
};

export function DashboardCard({
  icon,
  title,
  subtitle,
  className = "",
  iconContainerClassName = "",
  titleClassName = "",
  subtitleClassName = "",
  footer,
  ...props
}: DashboardCardProps) {
  return (
    <Pressable className={`rounded-card px-4 py-5 ${className}`} {...props}>
      <View className={`h-12 w-12 items-center justify-center rounded-full ${iconContainerClassName}`}>
        {icon}
      </View>

      <Text className={`mt-4 text-lg font-bold ${titleClassName}`}>{title}</Text>

      {subtitle ? <Text className={`mt-1 text-sm ${subtitleClassName}`}>{subtitle}</Text> : null}

      {footer}
    </Pressable>
  );
}
