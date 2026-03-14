import { ColorPalettes } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export function AppHeader() {
  const { resolvedTheme } = useThemePreference();
  const palette = ColorPalettes[resolvedTheme];

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-card bg-primary/20">
          <Feather name="package" size={20} color={palette.primary} />
        </View>
        <Text className="text-2xl font-bold text-text-primary">BoxIt</Text>
      </View>
      <Pressable
        onPress={() => router.push("/profile")}
        className="h-11 w-11 items-center justify-center rounded-card border border-border-strong bg-bg-input"
      >
        <Feather name="settings" size={18} color={palette.textPrimary} />
      </Pressable>
    </View>
  );
}
