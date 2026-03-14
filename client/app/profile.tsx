import { ColorPalettes } from "@/constants/theme";
import { Button } from "@/components/button";
import { type ThemePreference, useThemePreference } from "@/hooks/use-theme-preference";
import { authService } from "@/lib/auth.service";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { value: "system", label: "Device", icon: "smartphone" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
];

export default function ProfileScreen() {
  const { themePreference, setThemePreference, resolvedTheme } = useThemePreference();
  const palette = ColorPalettes[resolvedTheme];
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutErrorMessage, setLogoutErrorMessage] = useState<string | null>(null);
  const [themeErrorMessage, setThemeErrorMessage] = useState<string | null>(null);

  const handleThemeChange = async (preference: ThemePreference) => {
    if (preference === themePreference) return;

    setThemeErrorMessage(null);

    try {
      await setThemePreference(preference);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update theme";
      setThemeErrorMessage(message);
    }
  };

  const onLogout = async (): Promise<void> => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutErrorMessage(null);

    try {
      await authService.signOut();
      router.replace("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sign out";
      setLogoutErrorMessage(message);
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
            <Feather name="arrow-left" size={18} color={palette.textPrimary} />
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

          <Text className="mt-4 text-sm font-semibold text-text-primary">Theme</Text>
          <View className="mt-3 flex-row gap-2">
            {THEME_OPTIONS.map((option) => {
              const isActive = themePreference === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => void handleThemeChange(option.value)}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-control border px-3 py-2.5 ${
                    isActive ? "border-text-link bg-bg-input" : "border-border-default bg-bg-elevated"
                  }`}
                >
                  <Feather
                    name={option.icon}
                    size={14}
                    color={isActive ? palette.textLink : palette.textSecondary}
                  />
                  <Text className={isActive ? "text-sm font-semibold text-text-link" : "text-sm font-semibold text-text-secondary"}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-3 text-xs text-text-tertiary">
            Active mode: {themePreference === "system" ? "Device" : themePreference === "dark" ? "Dark" : "Light"}
          </Text>
        </View>

        {themeErrorMessage ? (
          <Text className="mt-4 text-sm text-red-400">{themeErrorMessage}</Text>
        ) : null}

        {logoutErrorMessage ? (
          <Text className="mt-4 text-sm text-red-400">{logoutErrorMessage}</Text>
        ) : null}

        <Button
          label={isLoggingOut ? "Signing out..." : "Log Out"}
          className="mt-auto"
          onPress={onLogout}
          disabled={isLoggingOut}
          rightIcon={
            <Feather name="log-out" size={16} color={palette.bgBase} />
          }
        />
      </View>
    </SafeAreaView>
  );
}
