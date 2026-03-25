import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { ColorPalettes } from "@/constants/theme";
import { useProfile } from "@/hooks/use-profile";
import { type ThemePreference, useThemePreference } from "@/hooks/use-theme-preference";
import { authService } from "@/lib/auth.service";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
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

function getInitials(displayName: string | null, email: string | null): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

export default function ProfileScreen() {
  const { themePreference, setThemePreference, resolvedTheme } = useThemePreference();
  const palette = ColorPalettes[resolvedTheme];
  const { profile, isLoading, isSaving, errorMessage, saveErrorMessage, updateDisplayName, clearSaveError } =
    useProfile();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutErrorMessage, setLogoutErrorMessage] = useState<string | null>(null);
  const [themeErrorMessage, setThemeErrorMessage] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");

  const handleThemeChange = async (preference: ThemePreference) => {
    if (preference === themePreference) return;
    setThemeErrorMessage(null);
    try {
      await setThemePreference(preference);
    } catch (error) {
      setThemeErrorMessage(error instanceof Error ? error.message : "Failed to update theme");
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
      setLogoutErrorMessage(error instanceof Error ? error.message : "Failed to sign out");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const openEditModal = () => {
    setEditName(profile?.displayName ?? "");
    clearSaveError();
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    setIsEditModalVisible(false);
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const success = await updateDisplayName(trimmed);
    if (success) closeEditModal();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
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

        {/* Account section */}
        <View className="mt-8 rounded-card border border-border-default bg-bg-elevated p-5">
          <Text className="text-base font-semibold text-text-primary">Account</Text>
          <Text className="mt-1 text-sm text-text-tertiary">Your personal details.</Text>

          {isLoading ? (
            <ActivityIndicator size="small" color={palette.primary} className="mt-5 self-start" />
          ) : errorMessage ? (
            <Text className="mt-4 text-sm text-red-400">{errorMessage}</Text>
          ) : (
            <View className="mt-5 flex-row items-center gap-4">
              {/* Avatar */}
              <View className="h-14 w-14 items-center justify-center rounded-full bg-bg-input border border-border-strong">
                <Text className="text-lg font-bold text-text-primary">
                  {getInitials(profile?.displayName ?? null, profile?.email ?? null)}
                </Text>
              </View>

              {/* Info */}
              <View className="flex-1">
                <Text className="text-base font-semibold text-text-primary" numberOfLines={1}>
                  {profile?.displayName ?? "No name set"}
                </Text>
                <Text className="mt-0.5 text-sm text-text-tertiary" numberOfLines={1}>
                  {profile?.email ?? ""}
                </Text>
              </View>

              {/* Edit button */}
              <Pressable
                onPress={openEditModal}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-card border border-border-default bg-bg-input"
              >
                <Feather name="edit-2" size={15} color={palette.textSecondary} />
              </Pressable>
            </View>
          )}
        </View>

        {/* Preferences section */}
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
                  <Text
                    className={
                      isActive ? "text-sm font-semibold text-text-link" : "text-sm font-semibold text-text-secondary"
                    }
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-3 text-xs text-text-tertiary">
            Active mode:{" "}
            {themePreference === "system" ? "Device" : themePreference === "dark" ? "Dark" : "Light"}
          </Text>

          <Pressable
            onPress={() => router.push("/location-config")}
            className="mt-5 flex-row items-center justify-between border-t border-border-default pt-4"
          >
            <View>
              <Text className="text-sm font-semibold text-text-primary">Location Configuration</Text>
              <Text className="mt-0.5 text-xs text-text-tertiary">Add or remove rooms from your locations.</Text>
            </View>
            <Feather name="chevron-right" size={16} color={palette.textTertiary} />
          </Pressable>
        </View>

        {themeErrorMessage ? (
          <Text className="mt-4 text-sm text-red-400">{themeErrorMessage}</Text>
        ) : null}

        {logoutErrorMessage ? (
          <Text className="mt-4 text-sm text-red-400">{logoutErrorMessage}</Text>
        ) : null}

        <Button
          label={isLoggingOut ? "Signing out..." : "Log Out"}
          className="mt-8"
          onPress={onLogout}
          disabled={isLoggingOut}
          rightIcon={<Feather name="log-out" size={16} color={palette.bgBase} />}
        />
      </ScrollView>

      {/* Edit display name modal */}
      <AppModal
        visible={isEditModalVisible}
        title="Edit Display Name"
        description="This is the name shown across the app."
        onRequestClose={closeEditModal}
        closeOnBackdropPress
        showCornerClose
      >
        <FormInput
          label="Display name"
          value={editName}
          onChangeText={setEditName}
          placeholder="Enter your name"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void handleSaveName()}
        />
        {saveErrorMessage ? (
          <Text className="mt-3 text-sm text-red-400">{saveErrorMessage}</Text>
        ) : null}
        <View className="mt-4 flex-row gap-3">
          <Button
            label="Cancel"
            variant="secondary"
            className="flex-1"
            onPress={closeEditModal}
            disabled={isSaving}
          />
          <Button
            label={isSaving ? "Saving..." : "Save"}
            className="flex-1"
            onPress={() => void handleSaveName()}
            disabled={isSaving || editName.trim().length === 0}
          />
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
