import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { authService } from "@/lib/auth.service";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

const onForgot = (): void => {
  router.push("/forgotpass");
};

const onRegister = (): void => {
  router.push("/register");
};

export default function App() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onLogin = async (): Promise<void> => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage(t("auth.fillAllFields"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await authService.signIn(trimmedEmail, trimmedPassword);
      router.replace("/(tabs)");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("auth.failedSignIn");
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
            <View className="flex-1 px-6 pt-8 pb-6">
              <View className="items-center mt-6">
                <View className="h-[60px] w-[60px] items-center justify-center rounded-card bg-primary shadow-card">
                  <Feather name="package" size={28} color={Colors.dark.textPrimary} />
                </View>

                <Text className="mt-5 text-4xl font-bold text-text-primary">BoxIt</Text>
                <Text className="mt-2 text-sm text-text-tertiary">
                  {t("auth.appTagline")}
                </Text>
              </View>

              <View className="mt-12 gap-4">
                <FormInput
                  testID="email-input"
                  label={t("auth.emailAddress")}
                  placeholder={t("auth.emailPlaceholder")}
                  leftIcon="mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  showDefaultBorder={false}
                />

                <View className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-text-secondary">{t("auth.password")}</Text>
                    <Pressable hitSlop={8} onPress={onForgot}>
                      <Text className="text-xs font-semibold text-text-link">{t("auth.forgotPassword")}</Text>
                    </Pressable>
                  </View>
                  <FormInput
                    testID="password-input"
                    placeholder="password\"
                    leftIcon="lock"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    showDefaultBorder={false}
                    rightElement={
                      <Pressable
                        onPress={() => setShowPassword((prev) => !prev)}
                        hitSlop={8}
                      >
                        <Feather
                          name={showPassword ? "eye" : "eye-off"}
                          size={18}
                          color={Colors.dark.textTertiary}
                        />
                      </Pressable>
                    }
                  />
                </View>
              </View>

              {errorMessage ? (
                <Text className="mt-3 text-sm text-red-400">{errorMessage}</Text>
              ) : null}

              <Button
                label={isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
                className="mt-8"
                textClassName="font-bold"
                onPress={onLogin}
                disabled={isSubmitting}
                rightIcon={
                  <Feather name="arrow-right" size={18} color={Colors.dark.bgBase} />
                }
              />


              <View className="mt-auto pt-10 flex-row items-center justify-center">
                <Text className="text-sm text-text-tertiary">
                  {t("auth.noAccount")}{" "}
                </Text>
                <Pressable hitSlop={8} onPress={onRegister}>
                  <Text className="text-sm font-bold text-text-link">{t("auth.signUp")}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
