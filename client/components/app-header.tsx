import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export function AppHeader() {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-card bg-primary/20">
          <Feather name="package" size={20} color={Colors.dark.primary} />
        </View>
        <Text className="text-2xl font-bold text-text-primary">BoxIt</Text>
      </View>
      <Pressable
        onPress={() => router.push("/profile")}
        className="h-11 w-11 items-center justify-center rounded-card border border-border-default bg-bg-elevated/70"
      >
        <Feather name="settings" size={18} color={Colors.dark.textPrimary} />
      </Pressable>
    </View>
  );
}
