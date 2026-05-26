import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { ColorPalettes } from "@/constants/theme";
import { useProfile } from "@/hooks/use-profile";
import { type ThemePreference, useThemePreference } from "@/hooks/use-theme-preference";
import { useLanguage } from "@/hooks/use-language";
import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/lib/i18n";
import { authService } from "@/lib/auth.service";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const { themePreference, setThemePreference, resolvedTheme } = useThemePreference();
  const palette = ColorPalettes[resolvedTheme];
  const { profile, isLoading, isSaving, errorMessage, saveErrorMessage, updateDisplayName, clearSaveError } =
    useProfile();
  const { language, changeLanguage } = useLanguage();

  const THEME_OPTIONS: {
    value: ThemePreference;
    label: string;
    icon: keyof typeof Feather.glyphMap;
  }[] = [
    { value: "system", label: t("profile.themeDevice"), icon: "smartphone" },
    { value: "light", label: t("profile.themeLight"), icon: "sun" },
    { value: "dark", label: t("profile.themeDark"), icon: "moon" },
  ];

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutErrorMessage, setLogoutErrorMessage] = useState<string | null>(null);
  const [themeErrorMessage, setThemeErrorMessage] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);

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

  const openPasswordModal = () => {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrorMessage(null);
    setIsPasswordModalVisible(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalVisible(false);
  };

  const handleChangePassword = async () => {
    if (isChangingPassword) return;

    if (newPassword.length < 6) {
      setPasswordErrorMessage(t("profile.passwordMin6"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage(t("profile.passwordsMismatch"));
      return;
    }

    setIsChangingPassword(true);
    setPasswordErrorMessage(null);
    try {
      await authService.updatePassword(newPassword);
      closePasswordModal();
    } catch (error) {
      setPasswordErrorMessage(error instanceof Error ? error.message : t("profile.failedUpdatePassword"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getActiveModeName = () => {
    if (themePreference === "system") return t("profile.themeDevice");
    if (themePreference === "dark") return t("profile.themeDark");
    return t("profile.themeLight");
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
          <Text className="text-lg font-semibold text-text-primary">{t("profile.title")}</Text>
          <View className="h-10 w-10" />
        </View>

        {/* Account section */}
        <View className="mt-8 rounded-card border border-border-default bg-bg-elevated p-5">
          <Text className="text-base font-semibold text-text-primary">{t("profile.account")}</Text>
          <Text className="mt-1 text-sm text-text-tertiary">{t("profile.accountDesc")}</Text>

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
                  {profile?.displayName ?? t("profile.noNameSet")}
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

          {!isLoading && !errorMessage ? (
            <Pressable
              onPress={openPasswordModal}
              className="mt-4 flex-row items-center justify-between border-t border-border-default pt-4"
            >
              <View>
                <Text className="text-sm font-semibold text-text-primary">{t("profile.changePassword")}</Text>
                <Text className="mt-0.5 text-xs text-text-tertiary">{t("profile.changePasswordDesc")}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={palette.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        {/* Preferences section */}
        <View className="mt-4 rounded-card border border-border-default bg-bg-elevated p-5">
          <Text className="text-base font-semibold text-text-primary">{t("profile.preferences")}</Text>
          <Text className="mt-1 text-sm text-text-tertiary">{t("profile.preferencesDesc")}</Text>

          <Text className="mt-4 text-sm font-semibold text-text-primary">{t("profile.theme")}</Text>
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
            {t("profile.activeMode", { mode: getActiveModeName() })}
          </Text>

          <Text className="mt-5 text-sm font-semibold text-text-primary">{t("profile.language")}</Text>
          <View className="mt-3 flex-row gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = language === lang.value;
              return (
                <Pressable
                  key={lang.value}
                  onPress={() => void changeLanguage(lang.value as AppLanguage)}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-control border px-3 py-2.5 ${
                    isActive ? "border-text-link bg-bg-input" : "border-border-default bg-bg-elevated"
                  }`}
                >
                  <Text
                    className={
                      isActive ? "text-sm font-semibold text-text-link" : "text-sm font-semibold text-text-secondary"
                    }
                  >
                    {lang.labelNative}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {themeErrorMessage ? (
          <Text className="mt-4 text-sm text-red-400">{themeErrorMessage}</Text>
        ) : null}
      </ScrollView>

      <View className="px-6 pb-6 pt-3">
        {logoutErrorMessage ? (
          <Text className="mb-3 text-sm text-red-400">{logoutErrorMessage}</Text>
        ) : null}
        <Button
          label={isLoggingOut ? t("profile.signingOut") : t("profile.logOut")}
          onPress={onLogout}
          disabled={isLoggingOut}
          rightIcon={<Feather name="log-out" size={16} color={palette.bgBase} />}
        />
      </View>

      {/* Change password modal */}
      <AppModal
        visible={isPasswordModalVisible}
        title={t("profile.changePasswordTitle")}
        description={t("profile.changePasswordModalDesc")}
        onRequestClose={closePasswordModal}
        closeOnBackdropPress
        showCornerClose
      >
        <FormInput
          label={t("profile.newPassword")}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t("profile.atLeast6Chars")}
          secureTextEntry
          autoFocus
          returnKeyType="next"
        />
        <FormInput
          label={t("profile.confirmPassword")}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t("profile.repeatNewPassword")}
          secureTextEntry
          containerClassName="mt-4"
          returnKeyType="done"
          onSubmitEditing={() => void handleChangePassword()}
        />
        {passwordErrorMessage ? (
          <Text className="mt-3 text-sm text-red-400">{passwordErrorMessage}</Text>
        ) : null}
        <View className="mt-4 flex-row gap-3">
          <Button
            label={t("common.cancel")}
            variant="secondary"
            className="flex-1"
            onPress={closePasswordModal}
            disabled={isChangingPassword}
          />
          <Button
            label={isChangingPassword ? t("common.saving") : t("common.save")}
            className="flex-1"
            onPress={() => void handleChangePassword()}
            disabled={isChangingPassword || newPassword.length === 0}
          />
        </View>
      </AppModal>

      {/* Edit display name modal */}
      <AppModal
        visible={isEditModalVisible}
        title={t("profile.editDisplayName")}
        description={t("profile.editDisplayNameDesc")}
        onRequestClose={closeEditModal}
        closeOnBackdropPress
        showCornerClose
      >
        <FormInput
          label={t("profile.displayName")}
          value={editName}
          onChangeText={setEditName}
          placeholder={t("profile.enterYourName")}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void handleSaveName()}
        />
        {saveErrorMessage ? (
          <Text className="mt-3 text-sm text-red-400">{saveErrorMessage}</Text>
        ) : null}
        <View className="mt-4 flex-row gap-3">
          <Button
            label={t("common.cancel")}
            variant="secondary"
            className="flex-1"
            onPress={closeEditModal}
            disabled={isSaving}
          />
          <Button
            label={isSaving ? t("common.saving") : t("common.save")}
            className="flex-1"
            onPress={() => void handleSaveName()}
            disabled={isSaving || editName.trim().length === 0}
          />
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
