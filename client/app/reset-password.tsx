import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { Colors } from "@/constants/theme";
import { authService } from "@/lib/auth.service";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RecoveryTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

function getRecoveryTokensFromUrl(url: string | null): RecoveryTokens {
  if (!url) {
    return { accessToken: null, refreshToken: null };
  }

  const parsed = Linking.parse(url);
  const queryParams = parsed.queryParams ?? {};
  const accessFromQuery = queryParams.access_token;
  const refreshFromQuery = queryParams.refresh_token;

  if (typeof accessFromQuery === "string" && typeof refreshFromQuery === "string") {
    return {
      accessToken: accessFromQuery,
      refreshToken: refreshFromQuery,
    };
  }

  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) {
    return { accessToken: null, refreshToken: null };
  }

  const hashParams = new URLSearchParams(url.slice(hashIndex + 1));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  return { accessToken, refreshToken };
}

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingRecoverySession, setIsSettingRecoverySession] = useState(true);
  const [isRecoverySessionReady, setIsRecoverySessionReady] = useState(false);
  const currentUrl = Linking.useURL();

  const recoveryTokens = useMemo(
    () => getRecoveryTokensFromUrl(currentUrl),
    [currentUrl],
  );

  useEffect(() => {
    const initializeRecoverySession = async () => {
      const { accessToken, refreshToken } = recoveryTokens;

      if (!accessToken || !refreshToken) {
        setErrorMessage("Reset link is missing or invalid. Request a new one.");
        setIsSettingRecoverySession(false);
        return;
      }

      try {
        await authService.setRecoverySession(accessToken, refreshToken);
        setIsRecoverySessionReady(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid or expired reset link";
        setErrorMessage(message);
      } finally {
        setIsSettingRecoverySession(false);
      }
    };

    void initializeRecoverySession();
  }, [recoveryTokens]);

  const onBackToLogin = (): void => {
    router.replace("/");
  };

  const onResetPassword = async (): Promise<void> => {
    const trimmedPassword = password.trim();

    if (!trimmedPassword || !confirmPassword.trim()) {
      setErrorMessage("Please fill in all fields");
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      return;
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await authService.updatePassword(trimmedPassword);
      setSuccessMessage("Password updated successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update password";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <StatusBar style="light" />
      <View className="flex-1 bg-bg-base">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View className="flex-1 px-6 pt-4 pb-6">
              <Pressable
                onPress={onBackToLogin}
                hitSlop={8}
                className="self-start p-2 -ml-2"
              >
                <Feather
                  name="arrow-left"
                  size={22}
                  color={Colors.dark.textPrimary}
                />
              </Pressable>

              <View className="items-center mt-10">
                <View className="h-[60px] w-[60px] items-center justify-center rounded-card bg-primary shadow-card">
                  <Feather
                    name="shield"
                    size={28}
                    color={Colors.dark.textPrimary}
                  />
                </View>

                <Text className="mt-12 text-center text-3xl font-bold text-text-primary">
                  Reset Password
                </Text>

                <Text className="mt-3 px-4 text-center text-sm leading-5 text-text-tertiary">
                  Enter your new password below
                </Text>
              </View>

              <View className="mt-12 gap-4">
                <FormInput
                  label="New Password"
                  placeholder="At least 6 characters"
                  leftIcon="lock"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  showDefaultBorder={false}
                />

                <FormInput
                  label="Confirm Password"
                  placeholder="Repeat your new password"
                  leftIcon="lock"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  showDefaultBorder={false}
                />

                <Button
                  label={isSubmitting ? "Updating..." : "Update Password"}
                  className="mt-2 shadow-card"
                  textClassName="font-bold"
                  onPress={onResetPassword}
                  disabled={isSubmitting || isSettingRecoverySession || !isRecoverySessionReady}
                  rightIcon={
                    <Feather
                      name="check"
                      size={18}
                      color={Colors.dark.bgBase}
                    />
                  }
                />

                {isSettingRecoverySession ? (
                  <Text className="mt-2 text-sm text-text-tertiary">
                    Verifying reset link...
                  </Text>
                ) : null}

                {errorMessage ? (
                  <Text className="mt-2 text-sm text-red-400">{errorMessage}</Text>
                ) : null}

                {successMessage ? (
                  <Text className="mt-2 text-sm text-emerald-400">
                    {successMessage}
                  </Text>
                ) : null}
              </View>

              <View className="mt-auto pt-12 items-center">
                <Pressable
                  onPress={onBackToLogin}
                  hitSlop={8}
                  className="flex-row items-center gap-2"
                >
                  <Feather
                    name="chevron-left"
                    size={16}
                    color={Colors.dark.primary}
                  />
                  <Text className="text-sm font-medium text-text-link">
                    Back to Login
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
