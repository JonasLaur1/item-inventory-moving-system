import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onLogout = async (): Promise<void> => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setErrorMessage(null);

    try {
      await authService.signOut();
      router.replace("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sign out";
      setErrorMessage(message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-6 pt-4 pb-6">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-card border border-border-default bg-bg-elevated"
          >
            <Feather name="arrow-left" size={18} color={Colors.dark.textPrimary} />
          </Pressable>
          <Text className="text-lg font-semibold text-text-primary">Profile & Settings</Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mt-8 rounded-card border border-border-default bg-bg-elevated p-5">
          <Text className="text-base font-semibold text-text-primary">Account</Text>
          <Text className="mt-1 text-sm text-text-tertiary">Update your personal details.</Text>
        </View>

        <View className="mt-4 rounded-card border border-border-default bg-bg-elevated p-5">
          <Text className="text-base font-semibold text-text-primary">Notifications</Text>
          <Text className="mt-1 text-sm text-text-tertiary">Control reminders and alerts.</Text>
        </View>

        <View className="mt-4 rounded-card border border-border-default bg-bg-elevated p-5">
          <Text className="text-base font-semibold text-text-primary">Preferences</Text>
          <Text className="mt-1 text-sm text-text-tertiary">Manage theme and app behavior.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
