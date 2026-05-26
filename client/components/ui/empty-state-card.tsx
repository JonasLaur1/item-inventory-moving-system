import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

type EmptyStateCardProps = {
  title: string;
  description?: string;
  icon?: keyof typeof Feather.glyphMap;
  containerClassName?: string;
};

export function EmptyStateCard({
  title,
  description,
  icon,
  containerClassName = "",
}: EmptyStateCardProps) {
  const { resolvedTheme } = useThemePreference();
  const palette = Colors[resolvedTheme];

  return (
    <View
      className={`rounded-card border border-border-default bg-bg-elevated/70 p-4 ${containerClassName}`}
    >
      {icon ? (
        <View className="mb-3 h-10 w-10 items-center justify-center self-center rounded-full bg-bg-input">
          <Feather name={icon} size={18} color={palette.textTertiary} />
        </View>
      ) : null}
      <Text className="text-sm font-semibold text-text-primary">{title}</Text>
      {description ? (
        <Text className="mt-1 text-xs text-text-tertiary">{description}</Text>
      ) : null}
    </View>
  );
}
