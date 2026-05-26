import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

type CollaboratorPillProps = {
  actorName?: string | null;
  size?: "sm" | "md";
};

export function CollaboratorPill({ actorName, size = "md" }: CollaboratorPillProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemePreference();
  const palette = Colors[resolvedTheme];
  const label = actorName ?? t("common.collaborator");
  const iconSize = size === "sm" ? 10 : 12;
  const textClass = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <View className="flex-row items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5">
      <Feather name="users" size={iconSize} color={palette.primary} />
      <Text className={`ml-1.5 font-medium text-text-link ${textClass}`}>{label}</Text>
    </View>
  );
}
